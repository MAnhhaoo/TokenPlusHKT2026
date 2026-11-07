import * as fs from "fs";
import * as path from "path";
import {
  ForbiddenException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FloodReportEntity } from "../../reports/models/flood-report.entity";
import { AreaAlertEntity } from "../../alerts/models/area-alert.entity";
import { MapPointEntity } from "../../map/models/map-point.entity";
import { CommunityUserEntity } from "../../users/models/community-user.entity";
import { ForecastSlotEntity } from "../../journey/models/forecast-slot.entity";
import { RouteOptionEntity } from "../../journey/models/route-option.entity";
import { TrendSeriesEntity } from "../../analytics/models/trend-series.entity";
import { WeatherSnapshotEntity } from "../../weather/models/weather-snapshot.entity";

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(FloodReportEntity)
    private readonly reportRepo: Repository<FloodReportEntity>,
    @InjectRepository(AreaAlertEntity)
    private readonly alertRepo: Repository<AreaAlertEntity>,
    @InjectRepository(MapPointEntity)
    private readonly mapPointRepo: Repository<MapPointEntity>,
    @InjectRepository(CommunityUserEntity)
    private readonly userRepo: Repository<CommunityUserEntity>,
    @InjectRepository(ForecastSlotEntity)
    private readonly forecastRepo: Repository<ForecastSlotEntity>,
    @InjectRepository(RouteOptionEntity)
    private readonly routeRepo: Repository<RouteOptionEntity>,
    @InjectRepository(TrendSeriesEntity)
    private readonly trendRepo: Repository<TrendSeriesEntity>,
    @InjectRepository(WeatherSnapshotEntity)
    private readonly weatherRepo: Repository<WeatherSnapshotEntity>,
  ) {}

  /**
   * Tự động khởi tạo dữ liệu bản đồ 250 điểm IRD và khung dự báo khi cơ sở dữ liệu mới khởi tạo.
   */
  async onApplicationBootstrap() {
    const forceSeed = process.env.SEED_ON_BOOTSTRAP === "true";
    const [pointCount, forecastCount] = await Promise.all([
      this.mapPointRepo.count(),
      this.forecastRepo.count(),
    ]);
    const isEmpty = pointCount === 0 && forecastCount === 0;

    if (forceSeed || isEmpty) {
      this.logger.log(
        forceSeed
          ? "SEED_ON_BOOTSTRAP=true — đang làm mới dữ liệu bản đồ IRD..."
          : "Cơ sở dữ liệu bản đồ đang trống — đang khởi tạo 250 điểm thực nghiệm IRD...",
      );
      if (forceSeed) {
        await this.mapPointRepo.createQueryBuilder().delete().execute();
        await this.forecastRepo.createQueryBuilder().delete().execute();
      }
      await this.seedAll();
      this.logger.log(
        "Khởi tạo 250 điểm thực nghiệm IRD và mốc dự báo thời gian thực hoàn tất!",
      );
    }
  }

  /**
   * Xóa dữ liệu hiện tại và khôi phục dữ liệu mẫu chuẩn cho môi trường dev/test/demo được phép.
   */
  async resetAndSeed() {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_SEED_IN_PROD !== "true"
    ) {
      throw new ForbiddenException(
        "Chức năng khôi phục dữ liệu mẫu bị vô hiệu hóa trên môi trường production.",
      );
    }
    await this.reportRepo.createQueryBuilder().delete().execute();
    await this.alertRepo.createQueryBuilder().delete().execute();
    await this.mapPointRepo.createQueryBuilder().delete().execute();
    await this.userRepo.createQueryBuilder().delete().execute();
    await this.forecastRepo.createQueryBuilder().delete().execute();
    await this.routeRepo.createQueryBuilder().delete().execute();
    await this.trendRepo.createQueryBuilder().delete().execute();
    await this.seedAll();

    return {
      message: "Đã làm sạch dữ liệu và nạp 250 điểm ngập IRD thành công.",
      seededAt: new Date().toISOString(),
    };
  }

  /**
   * Nạp 250 điểm đen ngập lụt IRD và khung dự báo thời tiết khởi tạo bằng 0.
   */
  private async seedAll() {
    let mapPoints: Partial<MapPointEntity>[] = [];
    try {
      const dataFilePath = path.resolve(
        __dirname,
        "../data/hcmc_flood_hotspots.json",
      );
      if (fs.existsSync(dataFilePath)) {
        const raw = fs.readFileSync(dataFilePath, "utf-8");
        const hotspots = JSON.parse(raw);
        mapPoints = hotspots.map((h: any) => ({
          id: h.id,
          x: h.x || 50,
          y: h.y || 50,
          lat: h.lat,
          lng: h.lng,
          elevationM: h.elevationM || 2.0,
          type: (h.type || "flood") as any,
          severity: h.severity as any,
          label: h.label,
          district: h.district,
          rainfall: h.rainfallThresholdMm ?? 0,
          depth: h.depth ?? 0,
          historyCount: h.historyCount ?? 1,
        }));
        this.logger.log(
          `Đã nạp thành công ${mapPoints.length} điểm ngập lịch sử khoa học IRD (2002-2026) vào PostgreSQL!`,
        );
      }
    } catch (e) {
      this.logger.warn(`Lỗi đọc file hcmc_flood_hotspots.json: ${e}`);
    }

    if (mapPoints.length > 0) {
      await this.mapPointRepo.save(mapPoints);
    }

    const forecasts: ForecastSlotEntity[] = [
      {
        id: "now",
        label: "Hiện tại",
        rain: "0 mm",
        rainMm: 0,
        risk: "Thấp",
        zone: 0,
        sortOrder: 0,
      },
      {
        id: "30",
        label: "+30 phút",
        rain: "0 mm",
        rainMm: 0,
        risk: "Thấp",
        zone: 0,
        sortOrder: 1,
      },
      {
        id: "60",
        label: "+60 phút",
        rain: "0 mm",
        rainMm: 0,
        risk: "Thấp",
        zone: 0,
        sortOrder: 2,
      },
      {
        id: "90",
        label: "+90 phút",
        rain: "0 mm",
        rainMm: 0,
        risk: "Thấp",
        zone: 0,
        sortOrder: 3,
      },
    ];
    await this.forecastRepo.save(forecasts);

    const trends: TrendSeriesEntity[] = [
      {
        rangeKey: "24h",
        labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
        reports: [0, 0, 0, 0, 0, 0],
        rain: [0, 0, 0, 0, 0, 0],
        insight: "Dữ liệu thực tế từ hệ thống quan trắc và báo cáo cộng đồng.",
      },
      {
        rangeKey: "7d",
        labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
        reports: [0, 0, 0, 0, 0, 0, 0],
        rain: [0, 0, 0, 0, 0, 0, 0],
        insight: "Dữ liệu thực tế từ hệ thống quan trắc và báo cáo cộng đồng.",
      },
      {
        rangeKey: "30d",
        labels: ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"],
        reports: [0, 0, 0, 0],
        rain: [0, 0, 0, 0],
        insight: "Dữ liệu thực tế từ hệ thống quan trắc và báo cáo cộng đồng.",
      },
    ];
    await this.trendRepo.save(trends);
  }

  /**
   * Truy vấn dữ liệu 8 bảng phục vụ kiểm tra quản trị và ẩn các cột nhạy cảm của người dùng.
   */
  async inspectAllTables() {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_SEED_IN_PROD !== "true"
    ) {
      throw new ForbiddenException(
        "Chức năng xem trực tiếp bảng dữ liệu bị vô hiệu hóa trên môi trường production.",
      );
    }
    const [
      flood_reports,
      map_points,
      area_alerts,
      raw_users,
      weather_snapshots,
      forecast_slots,
      route_options,
      trend_series,
    ] = await Promise.all([
      this.reportRepo.find(),
      this.mapPointRepo.find(),
      this.alertRepo.find(),
      this.userRepo.find(),
      this.weatherRepo.find({ order: { fetchedAt: "DESC" }, take: 20 }),
      this.forecastRepo.find({ order: { sortOrder: "ASC" } }),
      this.routeRepo.find(),
      this.trendRepo.find(),
    ]);

    const community_users = raw_users.map((u) => ({
      id: u.id,
      name: u.name,
      initials: u.initials,
      district: u.district,
      joinedAt: u.joinedAt,
      lastActive: u.lastActive,
      reports: u.reports,
      verifiedReports: u.verifiedReports,
      rejectedReports: u.rejectedReports,
      trustScore: u.trustScore,
      status: u.status,
      identityVerified: u.identityVerified,
      warnings: u.warnings,
    }));

    return {
      inspectedAt: new Date().toISOString(),
      rowCounts: {
        flood_reports: flood_reports.length,
        map_points: map_points.length,
        area_alerts: area_alerts.length,
        community_users: community_users.length,
        weather_snapshots: weather_snapshots.length,
        forecast_slots: forecast_slots.length,
        route_options: route_options.length,
        trend_series: trend_series.length,
      },
      tables: {
        flood_reports,
        map_points,
        area_alerts,
        community_users,
        weather_snapshots,
        forecast_slots,
        route_options,
        trend_series,
      },
    };
  }
}
