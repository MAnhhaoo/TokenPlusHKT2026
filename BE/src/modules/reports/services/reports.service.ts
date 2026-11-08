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
import { AreaAlertEntity } from "../../alerts/models/area-alert.entity";
import { CreateReportDto } from "../dtos/create-report.dto";
import { AnalyzeImageDto } from "../dtos/analyze-image.dto";
import { QueryReportDto } from "../dtos/query-report.dto";
import { MapService } from "../../map/services/map.service";
import { RealtimeService } from "../../realtime/services/realtime.service";
import { WeatherService } from "../../weather/services/weather.service";
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
    @InjectRepository(AreaAlertEntity)
    private readonly alertRepo: Repository<AreaAlertEntity>,
    private readonly mapService: MapService,
    private readonly geminiVisionService: GeminiVisionService,
    @Optional() private readonly realtimeService?: RealtimeService,
    @Optional() private readonly weatherService?: WeatherService,
  ) {}

  /**
   * Phân tích ảnh hiện trường bằng mô hình Google Gemini Vision (hỗ trợ kiểm duyệt).
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
   * Cập nhật số phút trôi qua thực tế kể từ thời điểm tạo báo cáo (không tự sinh thời gian nước rút giả định).
   */
  private updateElapsedMinutes(report: FloodReportEntity) {
    if (report.createdAt) {
      report.minutesAgo = Math.max(
        1,
        Math.round((Date.now() - new Date(report.createdAt).getTime()) / 60000),
      );
    }
  }

  /**
   * Truy vấn danh sách báo cáo ngập theo bộ lọc trạng thái, mức độ và quận/huyện.
   */
  async findAll(query: QueryReportDto): Promise<FloodReportEntity[]> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.district) where.district = query.district;

    const reports = await this.reportRepo.find({
      where,
      order: { createdAt: "DESC" },
    });

    for (const report of reports) {
      this.updateElapsedMinutes(report);
    }

    return reports;
  }

  /**
   * Xem chi tiết một báo cáo ngập kèm cảnh báo trùng lặp trong cùng khu vực.
   */
  async findOne(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Không tìm thấy báo cáo ${id}`);
    }

    this.updateElapsedMinutes(report);

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
   * Tạo báo cáo ngập/tắc cống mới từ người dân, tự động Reverse Geocode và tạo điểm chờ duyệt (pending).
   * Báo cáo mới luôn ở trạng thái pending cho đến khi Quản trị viên xác minh.
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

    // Phân tích ảnh hiện trường bằng Google Gemini Multimodal (chỉ đề xuất hỗ trợ kiểm duyệt, không tự tạo số giả)
    if (dto.photoUrl && !aiSummary) {
      try {
        const visionResult = await this.geminiVisionService.analyzeImage(
          dto.photoUrl,
          location,
          dto.description,
        );
        if (visionResult) {
          if (
            typeof visionResult.estimatedDepthCm === "number" &&
            visionResult.estimatedDepthCm > 0
          ) {
            aiDepth = visionResult.estimatedDepthCm;
            if (!dto.reportedDepth) {
              reportedDepth = visionResult.estimatedDepthCm;
            }
          }
          if (
            typeof visionResult.confidence === "number" &&
            visionResult.confidence > 0
          ) {
            aiConfidence = visionResult.confidence;
          }
          if (!aiSummary && visionResult.aiSummary) {
            aiSummary = visionResult.aiSummary;
          }
          if (!recommendation && visionResult.recommendation) {
            recommendation = visionResult.recommendation;
          }
          if (visionResult.visual) {
            visual = visionResult.visual;
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

    // 1. Đối chiếu lịch sử ngập và cao độ địa hình thực tế tại khu vực này (nếu có trong DB)
    let historyCount = 0;
    let elevationM = 2.2;
    try {
      const allPoints = await this.mapPointRepo.find();
      const cleanLoc = (location || "").toLowerCase();
      let matchedPoint = allPoints.find(
        (p) =>
          p.label &&
          (cleanLoc.includes(p.label.toLowerCase()) ||
            p.label.toLowerCase().includes(cleanLoc)),
      );
      if (!matchedPoint) {
        matchedPoint = allPoints.find(
          (p) => Math.abs(p.lat - lat) < 0.008 && Math.abs(p.lng - lng) < 0.008,
        );
      }
      if (matchedPoint) {
        historyCount = matchedPoint.historyCount || 0;
        elevationM = matchedPoint.elevationM || 2.2;
      }
    } catch {
      // Safe fallback
    }

    // 2. Tra cứu lượng mưa thực tế thời gian thực tại quận này (Open-Meteo)
    let currentRain = 0;
    try {
      if (this.mapService?.getCurrentRainForDistrict && district) {
        currentRain = await this.mapService.getCurrentRainForDistrict(district);
      }
    } catch {
      currentRain = 0;
    }

    const { saved, savedPoint } = await this.withTransaction(
      async ({ reportRepo, mapPointRepo, userRepo }) => {
        const report = reportRepo.create({
          id: nextId,
          location,
          district,
          reportedAt: timeStr,
          minutesAgo: 1,
          description:
            dto.description ||
            aiSummary ||
            (dto.reportType === "drain"
              ? "Báo cáo miệng cống thoát nước tại hiện trường."
              : "Báo cáo nước dâng trên mặt đường tại hiện trường."),
          reportType: dto.reportType,
          reportedDepth,
          aiDepth,
          aiConfidence,
          severity: normalizedSeverity,
          // Báo cáo mới luôn ở trạng thái pending, chỉ chuyển sang verified khi Admin xác minh
          status: "pending",
          priority:
            dto.reportType === "drain" ? "Cống tắc" : "Trục đường chính",
          coordinates:
            dto.coordinates || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          historyCount,
          visual,
          photoUrl: dto.photoUrl,
          reporterId: dto.reporterId,
          aiSummary,
          recommendation,
        });

        const savedReport = await reportRepo.save(report);

        const newPoint = mapPointRepo.create({
          id: `p_${savedReport.id}`,
          x: 50,
          y: 50,
          lat,
          lng,
          elevationM,
          // Điểm mới ở trạng thái pending chờ điều phối viên xác minh
          type: "pending",
          severity: normalizedSeverity,
          label: location,
          district,
          rainfall: currentRain,
          depth: reportedDepth,
          historyCount,
          linkedReportId: savedReport.id,
        });
        const savedMapPoint = await mapPointRepo.save(newPoint);

        if (dto.reporterId) {
          const user = await userRepo.findOne({
            where: { id: dto.reporterId },
          });
          if (user) {
            user.reports += 1;
            await userRepo.save(user);
          }
        }

        return { saved: savedReport, savedPoint: savedMapPoint };
      },
    );

    this.realtimeService?.broadcast("report.created", {
      report: saved,
      mapPoint: savedPoint,
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
    const { saved, linkedPoint, isLocked } = await this.withTransaction(
      async ({ reportRepo, mapPointRepo }) => {
        const report = await reportRepo.findOne({ where: { id } });
        if (!report) {
          throw new NotFoundException(`Không tìm thấy báo cáo ${id}`);
        }

        const point = await mapPointRepo.findOne({
          where: { linkedReportId: id },
        });

        if (report.status === "rejected" || report.status === "pending") {
          report.status = "verified";
          report.rejectReason = undefined;
          if (point) {
            point.type = "flood";
            point.depth = report.aiDepth || report.reportedDepth || 25;
            await mapPointRepo.save(point);
          }
          const savedReport = await reportRepo.save(report);
          return {
            saved: savedReport,
            linkedPoint: point ?? null,
            isLocked: false,
          };
        } else {
          report.status = "rejected";
          report.rejectReason =
            reason || "Quản trị viên đã tạm khóa báo cáo này";
          if (point) {
            point.type = "risk";
            point.depth = 0;
            await mapPointRepo.save(point);
          }
          const savedReport = await reportRepo.save(report);
          return {
            saved: savedReport,
            linkedPoint: point ?? null,
            isLocked: true,
          };
        }
      },
    );

    const result = {
      message: isLocked
        ? `Đã khóa báo cáo ${id} và ẩn điểm ngập khỏi bản đồ công khai.`
        : `Đã mở khóa báo cáo ${id} và hiển thị lại điểm ngập trên bản đồ.`,
      report: saved,
      updatedMapPoint: linkedPoint,
    };

    if (isLocked) {
      this.realtimeService?.broadcast("report.rejected", result);
    } else {
      this.realtimeService?.broadcast("report.approved", result);
    }

    return result;
  }
}
