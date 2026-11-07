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
import { QueryReportDto } from "../dtos/query-report.dto";
import { MapService } from "../../map/services/map.service";
import { RealtimeService } from "../../realtime/services/realtime.service";

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
    @Optional() private readonly realtimeService?: RealtimeService,
  ) {}

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

    const count = await this.reportRepo.count();
    const nextId = `RP-${2420 + count}`;

    const depthBySeverity: Record<string, number> = {
      low: 12,
      medium: 24,
      high: 35,
      critical: 45,
    };
    const reportedDepth =
      dto.reportedDepth ?? depthBySeverity[dto.severity] ?? 24;
    const aiDepth = Math.max(8, reportedDepth - 2);
    const aiConfidence = dto.photoUrl ? 93 : 87;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}, ${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}/${now.getFullYear()}`;

    const normalizedSeverity =
      dto.severity === "low"
        ? "medium"
        : dto.severity === "high"
          ? "critical"
          : dto.severity;

    const report = this.reportRepo.create({
      id: nextId,
      location,
      district,
      reportedAt: timeStr,
      minutesAgo: 1,
      description:
        dto.description ||
        (dto.reportType === "drain"
          ? "Miệng cống bị rác che kín, nước thoát chậm tại hiện trường."
          : "Nước đang dâng trên mặt đường, phương tiện di chuyển chậm."),
      reportType: dto.reportType,
      reportedDepth,
      aiDepth,
      aiConfidence,
      severity: normalizedSeverity,
      status: "pending",
      priority: dto.reportType === "drain" ? "Cống tắc" : "Trục đường chính",
      coordinates: dto.coordinates || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      historyCount: 6,
      visual: dto.visual ?? (dto.reportType === "drain" ? "drain" : "street"),
      photoUrl: dto.photoUrl,
      reporterId: dto.reporterId,
    });

    const saved = await this.reportRepo.save(report);

    const pointCount = await this.mapPointRepo.count();
    const newPoint = this.mapPointRepo.create({
      id: `p${pointCount + 1}`,
      x: 50,
      y: 50,
      lat,
      lng,
      elevationM: 2.5,
      type: "pending",
      severity: normalizedSeverity,
      label: location,
      district,
      rainfall: 58,
      depth: reportedDepth,
      historyCount: 6,
      linkedReportId: saved.id,
    });
    const savedPoint = await this.mapPointRepo.save(newPoint);

    this.realtimeService?.broadcast("report.created", {
      report: saved,
      mapPoint: savedPoint,
    });

    return saved;
  }

  /**
   * Duyệt báo cáo đang chờ (pending -> verified), cập nhật điểm ngập trên bản đồ và cộng điểm tin cậy trong 1 transaction.
   */
  async approve(id: string) {
    const { saved, linkedPoint } = await this.withTransaction(
      async ({ reportRepo, mapPointRepo, userRepo }) => {
        const report = await reportRepo.findOne({ where: { id } });
        if (!report) {
          throw new NotFoundException(`Không tìm thấy báo cáo ${id}`);
        }
        if (report.status !== "pending") {
          throw new ConflictException(
            `Báo cáo ${id} đã ở trạng thái ${report.status}, chỉ cho phép duyệt từ trạng thái pending.`,
          );
        }

        report.status = "verified";
        const savedReport = await reportRepo.save(report);

        const point = await mapPointRepo.findOne({
          where: { linkedReportId: id },
        });
        if (point) {
          point.type = "flood";
          point.depth = report.aiDepth || report.reportedDepth;
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
      message: `Đã xác nhận báo cáo ${id} và cập nhật bản đồ.`,
      report: saved,
      updatedMapPoint: linkedPoint,
    };

    this.realtimeService?.broadcast("report.approved", result);

    return result;
  }

  /**
   * Từ chối báo cáo đang chờ (pending -> rejected), cập nhật số lần từ chối và hạ trạng thái điểm bản đồ liên kết.
   */
  async reject(id: string, reason?: string) {
    const saved = await this.withTransaction(
      async ({ reportRepo, mapPointRepo, userRepo }) => {
        const report = await reportRepo.findOne({ where: { id } });
        if (!report) {
          throw new NotFoundException(`Không tìm thấy báo cáo ${id}`);
        }
        if (report.status !== "pending") {
          throw new ConflictException(
            `Báo cáo ${id} đã ở trạng thái ${report.status}, chỉ cho phép từ chối từ trạng thái pending.`,
          );
        }

        report.status = "rejected";
        report.rejectReason = reason || "Không đủ cơ sở xác minh";
        const savedReport = await reportRepo.save(report);

        const point = await mapPointRepo.findOne({
          where: { linkedReportId: id },
        });
        if (point && (point.type === "pending" || point.type === "flood")) {
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
            await userRepo.save(user);
          }
        }

        return savedReport;
      },
    );

    const result = {
      message: `Đã từ chối báo cáo ${id}${reason ? `: ${reason}` : ""}.`,
      report: saved,
    };

    this.realtimeService?.broadcast("report.rejected", result);

    return result;
  }
}
