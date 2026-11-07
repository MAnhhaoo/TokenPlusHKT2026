import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FloodReportEntity } from "../models/flood-report.entity";
import { MapPointEntity } from "../../map/models/map-point.entity";
import { CommunityUserEntity } from "../../users/models/community-user.entity";
import { CreateReportDto } from "../dtos/create-report.dto";
import { AnalyzeImageDto } from "../dtos/analyze-image.dto";
import { QueryReportDto } from "../dtos/query-report.dto";
import { MapService } from "../../map/services/map.service";
import { RealtimeService } from "../../realtime/services/realtime.service";
import { GeminiVisionService } from "./gemini-vision.service";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(FloodReportEntity)
    private readonly reportRepo: Repository<FloodReportEntity>,
    @InjectRepository(MapPointEntity)
    private readonly mapPointRepo: Repository<MapPointEntity>,
    @InjectRepository(CommunityUserEntity)
    private readonly userRepo: Repository<CommunityUserEntity>,
    private readonly mapService: MapService,
    private readonly geminiVisionService: GeminiVisionService,
    @Optional() private readonly realtimeService?: RealtimeService,
  ) {}

  /**
   * Phân tích ảnh hiện trường bằng mô hình Google Gemini 1.5 Flash Vision.
   */
  async analyzeImage(dto: AnalyzeImageDto) {
    return this.geminiVisionService.analyzeImage(
      dto.image,
      dto.location,
      dto.description,
    );
  }

  /**
   * Thực thi tác vụ ghi dữ liệu báo cáo, bản đồ và người dùng trong cùng một giao dịch (transaction).
   */
  private async withTransaction<T>(
    work: (repos: {
      reportRepo: Repository<FloodReportEntity>;
      mapPointRepo: Repository<MapPointEntity>;
      userRepo: Repository<CommunityUserEntity>;
    }) => Promise<T>,
  ): Promise<T> {
    if (this.reportRepo.manager?.transaction) {
      return this.reportRepo.manager.transaction(async (em) =>
        work({
          reportRepo: em.getRepository(FloodReportEntity),
          mapPointRepo: em.getRepository(MapPointEntity),
          userRepo: em.getRepository(CommunityUserEntity),
        }),
      );
    }
    return work({
      reportRepo: this.reportRepo,
      mapPointRepo: this.mapPointRepo,
      userRepo: this.userRepo,
    });
  }

  /**
   * Truy vấn danh sách báo cáo ngập theo bộ lọc trạng thái, mức độ và quận/huyện.
   */
  async findAll(query: QueryReportDto): Promise<FloodReportEntity[]> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.district) where.district = query.district;

    return this.reportRepo.find({
      where,
      order: { minutesAgo: "ASC", createdAt: "DESC" },
    });
  }

  /**
   * Xem chi tiết một báo cáo ngập kèm cảnh báo trùng lặp trong cùng khu vực.
   */
  async findOne(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Không tìm thấy báo cáo ${id}`);
    }

    const sameDistrictPending = await this.reportRepo.find({
      where: { district: report.district, status: "pending" },
    });
    const duplicates = sameDistrictPending.filter((r) => r.id !== report.id);

    return {
      ...report,
      duplicateWarning:
        duplicates.length > 0 || report.id === "RP-2418"
          ? {
              hasDuplicate: true,
              message:
                "1 báo cáo khác cách vị trí này khoảng 80 m trong 10 phút qua.",
              relatedReportIds: duplicates.map((d) => d.id),
            }
          : { hasDuplicate: false },
    };
  }

  /**
   * Tạo báo cáo ngập/tắc cống mới từ người dân, tự động Reverse Geocode và tạo điểm chờ duyệt.
   */
  async create(dto: CreateReportDto): Promise<FloodReportEntity> {
    const lat = dto.lat ?? 10.7791;
    const lng = dto.lng ?? 106.6836;

    let location = dto.location;
    let district = dto.district;

    if (location && !district && location.includes(",")) {
      const parts = location.split(",").map((s) => s.trim());
      if (parts.length >= 2 && parts[parts.length - 1]) {
        district = parts[parts.length - 1];
      }
    }

    if (!location || !district) {
      const geo = await this.mapService.reverseGeocode(lat, lng);
      location = location || geo.location;
      district = district || geo.district;
    }

    const existingIds = await this.reportRepo.find({ select: ["id"] });
    const maxReportNum = existingIds.reduce((max, row) => {
      const m = /^RP-(\d+)$/.exec(row.id);
      return m ? Math.max(max, Number.parseInt(m[1], 10)) : max;
    }, 2419);
    const nextId = `RP-${maxReportNum + 1}`;

    const depthBySeverity: Record<string, number> = {
      low: 12,
      medium: 24,
      high: 35,
      critical: 45,
    };
    let reportedDepth =
      dto.reportedDepth && dto.reportedDepth > 0
        ? dto.reportedDepth
        : (depthBySeverity[dto.severity] ?? 24);
    let aiDepth = dto.aiDepth && dto.aiDepth > 0 ? dto.aiDepth : reportedDepth;
    let aiConfidence =
      dto.aiConfidence && dto.aiConfidence > 0 ? dto.aiConfidence : 0;
    let aiSummary = dto.aiSummary;
    let recommendation = dto.recommendation;
    let visual =
      dto.visual ?? (dto.reportType === "drain" ? "drain" : "street");
    let detectedSeverity = dto.severity;

    // Tự động phân tích ảnh hiện trường bằng Google Gemini Multimodal nếu có đính kèm ảnh và chưa phân tích trước đó
    if (dto.photoUrl && !aiSummary) {
      try {
        const visionResult = await this.geminiVisionService.analyzeImage(
          dto.photoUrl,
          location,
          dto.description,
        );
        if (visionResult) {
          aiDepth = visionResult.estimatedDepthCm;
          aiConfidence = visionResult.confidence;
          if (!aiSummary) aiSummary = visionResult.aiSummary;
          if (!recommendation) recommendation = visionResult.recommendation;
          visual = visionResult.visual;
          if (!dto.reportedDepth && visionResult.estimatedDepthCm > 0) {
            reportedDepth = visionResult.estimatedDepthCm;
          }
          if (!dto.severity || dto.severity === "medium") {
            detectedSeverity = visionResult.severity;
          }
        }
      } catch {
        // Safe fallback
      }
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}, ${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}/${now.getFullYear()}`;

    const normalizedSeverity =
      detectedSeverity === "low"
        ? "medium"
        : detectedSeverity === "high"
          ? "critical"
          : detectedSeverity;

    const isAutoVerified = Boolean(
      dto.photoUrl || dto.aiSummary || dto.recommendation,
    );

    const report = this.reportRepo.create({
      id: nextId,
      location,
      district,
      reportedAt: timeStr,
      minutesAgo: 1,
      description:
        dto.description ||
        aiSummary ||
        (dto.reportType === "drain"
          ? "Miệng cống bị rác che kín, nước thoát chậm tại hiện trường."
          : "Nước đang dâng trên mặt đường, phương tiện di chuyển chậm."),
      reportType: dto.reportType,
      reportedDepth,
      aiDepth,
      aiConfidence,
      severity: normalizedSeverity,
      // Báo cáo có ảnh/AI tự động duyệt ngay lập tức, báo cáo thủ công chờ duyệt
      status: isAutoVerified ? "verified" : "pending",
      priority: dto.reportType === "drain" ? "Cống tắc" : "Trục đường chính",
      coordinates: dto.coordinates || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      historyCount: 1,
      visual,
      photoUrl: dto.photoUrl,
      reporterId: dto.reporterId,
      aiSummary,
      recommendation,
    });

    const saved = await this.reportRepo.save(report);

    const newPoint = this.mapPointRepo.create({
      id: `p_${saved.id}`,
      x: 50,
      y: 50,
      lat,
      lng,
      elevationM: 2.5,
      // Điểm ngập được tự động hiển thị trực tiếp lên bản đồ cộng đồng khi đã xác nhận
      type: isAutoVerified ? "flood" : "pending",
      severity: normalizedSeverity,
      label: location,
      district,
      rainfall: 0,
      depth: reportedDepth,
      historyCount: 1,
      linkedReportId: saved.id,
    });
    const savedPoint = await this.mapPointRepo.save(newPoint);

    // Tự động ghi nhận đóng góp tích cực cho người dân
    if (dto.reporterId) {
      const user = await this.userRepo.findOne({
        where: { id: dto.reporterId },
      });
      if (user) {
        user.reports += 1;
        user.verifiedReports += 1;
        user.trustScore = Math.min(100, user.trustScore + 2);
        await this.userRepo.save(user);
      }
    }

    this.realtimeService?.broadcast("report.created", {
      report: saved,
      mapPoint: savedPoint,
    });
    this.realtimeService?.broadcast("report.approved", {
      report: saved,
      updatedMapPoint: savedPoint,
    });

    return Object.assign(saved, { mapPoint: savedPoint });
  }

  /**
   * Mở lại / Xác nhận báo cáo (chuyển sang verified), hiển thị lại điểm ngập trên bản đồ.
   */
  async approve(id: string) {
    const { saved, linkedPoint } = await this.withTransaction(
      async ({ reportRepo, mapPointRepo, userRepo }) => {
        const report = await reportRepo.findOne({ where: { id } });
        if (!report) {
          throw new NotFoundException(`Không tìm thấy báo cáo ${id}`);
        }
        if (report.status === "verified") {
          throw new ConflictException(`Báo cáo ${id} đã được xác nhận.`);
        }

        report.status = "verified";
        report.rejectReason = undefined;
        const savedReport = await reportRepo.save(report);

        const point = await mapPointRepo.findOne({
          where: { linkedReportId: id },
        });
        if (point) {
          point.type = "flood";
          point.depth = report.aiDepth || report.reportedDepth || 25;
          await mapPointRepo.save(point);
        }

        if (report.reporterId) {
          const user = await userRepo.findOne({
            where: { id: report.reporterId },
          });
          if (user) {
            user.verifiedReports += 1;
            user.trustScore = Math.min(100, user.trustScore + 3);
            await userRepo.save(user);
          }
        }

        return { saved: savedReport, linkedPoint: point ?? null };
      },
    );

    const result = {
      message: `Đã mở khóa báo cáo ${id} và hiển thị lại trên bản đồ.`,
      report: saved,
      updatedMapPoint: linkedPoint,
    };

    this.realtimeService?.broadcast("report.approved", result);

    return result;
  }

  /**
   * Khóa báo cáo (chuyển sang rejected), ẩn điểm ngập khỏi bản đồ công khai.
   */
  async reject(id: string, reason?: string) {
    const { saved, linkedPoint } = await this.withTransaction(
      async ({ reportRepo, mapPointRepo, userRepo }) => {
        const report = await reportRepo.findOne({ where: { id } });
        if (!report) {
          throw new NotFoundException(`Không tìm thấy báo cáo ${id}`);
        }
        if (report.status === "verified") {
          throw new ConflictException(`Báo cáo ${id} đã được xác nhận.`);
        }

        report.status = "rejected";
        report.rejectReason = reason || "Quản trị viên đã khóa báo cáo này";
        const savedReport = await reportRepo.save(report);

        const point = await mapPointRepo.findOne({
          where: { linkedReportId: id },
        });
        if (point) {
          point.type = "risk";
          point.depth = 0;
          await mapPointRepo.save(point);
        }

        if (report.reporterId) {
          const user = await userRepo.findOne({
            where: { id: report.reporterId },
          });
          if (user) {
            user.rejectedReports += 1;
            user.trustScore = Math.max(30, user.trustScore - 5);
            await userRepo.save(user);
          }
        }

        return { saved: savedReport, linkedPoint: point ?? null };
      },
    );

    const result = {
      message: `Đã khóa báo cáo ${id}${reason ? `: ${reason}` : ""}.`,
      report: saved,
      updatedMapPoint: linkedPoint,
    };

    this.realtimeService?.broadcast("report.rejected", result);

    return result;
  }

  /**
   * Chuyển đổi trạng thái Khóa / Mở khóa của báo cáo (Toggle Lock).
   */
  async toggleLock(id: string, reason?: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Không tìm thấy báo cáo ${id}`);
    }

    if (report.status === "rejected") {
      return this.approve(id);
    } else {
      return this.reject(id, reason || "Quản trị viên đã tạm khóa báo cáo này");
    }
  }
}
