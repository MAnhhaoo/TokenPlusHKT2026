import * as fs from "fs";
import * as path from "path";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
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

  async onApplicationBootstrap() {
    const p1 = await this.mapPointRepo.findOne({ where: { id: "p1" } });
    const count = await this.mapPointRepo.count();
    const slot30 = await this.forecastRepo.findOne({ where: { id: "30" } });
    if (p1 || count < 50 || slot30?.rainMm === 34) {
      this.logger.log(
        "Phát hiện dữ liệu mẫu cũ hoặc mốc dự báo cứng 34mm — đang nạp lại dữ liệu chuẩn...",
      );
      await this.mapPointRepo.clear();
      await this.forecastRepo.clear();
      await this.seedAll();
      this.logger.log(
        "Khởi tạo 250 điểm thực nghiệm IRD và mốc dự báo thời gian thực hoàn tất!",
      );
    }
  }

  async resetAndSeed() {
    await this.reportRepo.clear();
    await this.alertRepo.clear();
    await this.mapPointRepo.clear();
    await this.userRepo.clear();
    await this.forecastRepo.clear();
    await this.routeRepo.clear();
    await this.trendRepo.clear();
    await this.seedAll();

    return {
      message: "Đã khôi phục toàn bộ dữ liệu mẫu SaigonDrain AI thành công.",
      seededAt: new Date().toISOString(),
    };
  }

  private async seedAll() {
    const reports: Partial<FloodReportEntity>[] = [
      {
        id: "RP-2418",
        location: "Đường Nguyễn Văn Quá",
        district: "Quận 12",
        reportedAt: "18:42, 24/05/2025",
        minutesAgo: 6,
        description:
          "Nước lên nhanh, đã tràn hơn nửa bánh xe máy. Giao thông bắt đầu ùn.",
        reportType: "flood",
        reportedDepth: 35,
        aiDepth: 32,
        aiConfidence: 94,
        severity: "critical",
        status: "pending",
        priority: "Trục đường chính",
        coordinates: "10.8381, 106.6304",
        historyCount: 12,
        visual: "traffic",
      },
      {
        id: "RP-2417",
        location: "Hẻm 88 Phan Huy Ích",
        district: "Gò Vấp",
        reportedAt: "18:38, 24/05/2025",
        minutesAgo: 10,
        description:
          "Miệng cống bị rác che kín, nước đang dâng khoảng mắt cá chân.",
        reportType: "drain",
        reportedDepth: 18,
        aiDepth: 16,
        aiConfidence: 88,
        severity: "high",
        status: "pending",
        priority: "Cống tắc",
        coordinates: "10.8336, 106.6341",
        historyCount: 8,
        visual: "drain",
      },
      {
        id: "RP-2415",
        location: "Nguyễn Văn Linh",
        district: "Bình Chánh",
        reportedAt: "18:31, 24/05/2025",
        minutesAgo: 17,
        description: "Nước đọng kéo dài gần giao lộ, ô tô di chuyển chậm.",
        reportType: "flood",
        reportedDepth: 22,
        aiDepth: 24,
        aiConfidence: 91,
        severity: "high",
        status: "pending",
        priority: "Gần bệnh viện",
        coordinates: "10.7079, 106.6366",
        historyCount: 15,
        visual: "street",
      },
      {
        id: "RP-2412",
        location: "Đường Lê Văn Lương",
        district: "Nhà Bè",
        reportedAt: "18:20, 24/05/2025",
        minutesAgo: 28,
        description: "Triều cường kết hợp mưa làm nước tràn vào làn xe máy.",
        reportType: "flood",
        reportedDepth: 28,
        aiDepth: 27,
        aiConfidence: 86,
        severity: "medium",
        status: "pending",
        priority: "Triều cường",
        coordinates: "10.6842, 106.7021",
        historyCount: 9,
        visual: "night",
      },
    ];
    await this.reportRepo.save(reports);

    const alerts: Partial<AreaAlertEntity>[] = [
      {
        id: "AL-0189",
        area: "Nguyễn Hữu Cảnh, Bình Thạnh",
        level: "Nghiêm trọng",
        hazardType: "Ngập đường",
        title: "Ngập sâu, hạn chế di chuyển",
        message:
          "Mực nước đang vượt 40 cm. Người dân tránh lưu thông qua khu vực.",
        startedAt: "17:48",
        expiresAt: "20:30",
        status: "active",
        channels: ["Web", "Push", "Trung tâm điều hành"],
        createdBy: "Nguyễn Minh",
      },
      {
        id: "AL-0188",
        area: "Thảo Điền, TP. Thủ Đức",
        level: "Cảnh báo",
        hazardType: "Mưa lớn",
        title: "Nguy cơ ngập trong 30 phút tới",
        message: "Mưa lớn tiếp diễn, ưu tiên các tuyến đường cao.",
        startedAt: "17:32",
        expiresAt: "20:00",
        status: "active",
        channels: ["Web", "Push"],
        createdBy: "Trần Hoài",
      },
      {
        id: "AL-0186",
        area: "Huỳnh Tấn Phát, Quận 7",
        level: "Cảnh báo",
        hazardType: "Triều cường",
        title: "Mưa lớn kết hợp đỉnh triều",
        message: "Cảnh giác nước dâng tại các đoạn đường trũng.",
        startedAt: "16:55",
        expiresAt: "21:00",
        status: "active",
        channels: ["Web"],
        createdBy: "Nguyễn Minh",
      },
    ];
    await this.alertRepo.save(alerts);

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
          rainfall: h.rainfallThresholdMm || 50,
          depth: h.depth || 25,
          historyCount: h.historyCount || 5,
        }));
        this.logger.log(
          `Đã nạp thành công ${mapPoints.length} điểm ngập lịch sử khoa học IRD (2002-2026) vào PostgreSQL!`,
        );
      }
    } catch (e) {
      this.logger.warn(`Lỗi đọc file hcmc_flood_hotspots.json: ${e}`);
    }

    if (mapPoints.length === 0) {
      mapPoints = [
        {
          id: "p1",
          x: 60,
          y: 42,
          lat: 10.7934,
          lng: 106.7185,
          elevationM: 1.6,
          type: "flood",
          severity: "critical",
          label: "Nguyễn Hữu Cảnh",
          district: "Bình Thạnh",
          rainfall: 82,
          depth: 45,
          historyCount: 21,
        },
        {
          id: "p2",
          x: 73,
          y: 35,
          lat: 10.8038,
          lng: 106.7329,
          elevationM: 1.9,
          type: "flood",
          severity: "high",
          label: "Quốc Hương",
          district: "TP. Thủ Đức",
          rainfall: 68,
          depth: 30,
          historyCount: 17,
        },
      ];
    }

    // Luôn bổ sung điểm báo cáo chờ duyệt p3 (liên kết RP-2418) và cảm biến đô thị
    mapPoints.push(
      {
        id: "p3",
        x: 34,
        y: 22,
        lat: 10.8381,
        lng: 106.6304,
        elevationM: 1.7,
        type: "pending",
        severity: "critical",
        label: "Nguyễn Văn Quá",
        district: "Quận 12",
        rainfall: 78,
        depth: 35,
        historyCount: 12,
        linkedReportId: "RP-2418",
      },
      {
        id: "sensor_q4",
        x: 53,
        y: 59,
        lat: 10.7578,
        lng: 106.7012,
        elevationM: 2.2,
        type: "sensor",
        severity: "medium",
        label: "Trạm cảm biến Quận 4",
        district: "Quận 4",
        rainfall: 64,
        depth: 0,
        historyCount: 4,
      },
    );

    await this.mapPointRepo.save(mapPoints);

    const users: Partial<CommunityUserEntity>[] = [
      {
        id: "USR-1048",
        name: "Trần Hoàng Anh",
        initials: "TA",
        phone: "0903 482 615",
        email: "hoanganh.tran@email.vn",
        district: "Bình Thạnh",
        joinedAt: "12/01/2025",
        lastActive: "2 phút trước",
        reports: 28,
        verifiedReports: 25,
        rejectedReports: 1,
        trustScore: 96,
        status: "active",
        identityVerified: true,
        warnings: 0,
      },
      {
        id: "USR-1032",
        name: "Nguyễn Thùy Dương",
        initials: "ND",
        phone: "0918 226 904",
        email: "thuyduong.ng@email.vn",
        district: "TP. Thủ Đức",
        joinedAt: "06/02/2025",
        lastActive: "18 phút trước",
        reports: 19,
        verifiedReports: 17,
        rejectedReports: 0,
        trustScore: 93,
        status: "active",
        identityVerified: true,
        warnings: 0,
      },
      {
        id: "USR-0997",
        name: "Lê Quốc Bảo",
        initials: "LB",
        phone: "0987 510 443",
        email: "quocbao.le@email.vn",
        district: "Gò Vấp",
        joinedAt: "18/11/2024",
        lastActive: "1 giờ trước",
        reports: 14,
        verifiedReports: 8,
        rejectedReports: 4,
        trustScore: 68,
        status: "review",
        identityVerified: false,
        warnings: 2,
      },
      {
        id: "USR-0964",
        name: "Phạm Minh Châu",
        initials: "PC",
        phone: "0932 744 189",
        email: "minhchau.pham@email.vn",
        district: "Quận 7",
        joinedAt: "03/10/2024",
        lastActive: "Hôm qua",
        reports: 31,
        verifiedReports: 27,
        rejectedReports: 2,
        trustScore: 89,
        status: "active",
        identityVerified: true,
        warnings: 0,
      },
      {
        id: "USR-0908",
        name: "Võ Thành Đạt",
        initials: "VD",
        phone: "0908 337 052",
        email: "thanhdat.vo@email.vn",
        district: "Bình Tân",
        joinedAt: "21/08/2024",
        lastActive: "3 ngày trước",
        reports: 9,
        verifiedReports: 3,
        rejectedReports: 5,
        trustScore: 42,
        status: "blocked",
        identityVerified: false,
        warnings: 3,
      },
      {
        id: "USR-0876",
        name: "Bùi Ngọc Mai",
        initials: "BM",
        phone: "0971 625 830",
        email: "ngocmai.bui@email.vn",
        district: "Nhà Bè",
        joinedAt: "15/07/2024",
        lastActive: "12 phút trước",
        reports: 22,
        verifiedReports: 20,
        rejectedReports: 1,
        trustScore: 94,
        status: "active",
        identityVerified: true,
        warnings: 0,
      },
    ];
    await this.userRepo.save(users);

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

    const navigationSteps = [
      {
        icon: "turn-left" as const,
        instruction: "Rẽ trái vào",
        street: "Võ Thị Sáu",
        distance: "220 m",
      },
      {
        icon: "turn-right" as const,
        instruction: "Rẽ phải vào",
        street: "Đường 3 Tháng 2",
        distance: "690 m",
      },
      {
        icon: "turn-left" as const,
        instruction: "Rẽ trái vào",
        street: "Cao Thắng",
        distance: "960 m",
      },
      {
        icon: "turn-right" as const,
        instruction: "Rẽ phải vào",
        street: "Nguyễn Thị Minh Khai",
        distance: "380 m",
      },
      {
        icon: "turn-right" as const,
        instruction: "Đi theo",
        street: "Nguyễn Văn Cừ",
        distance: "780 m",
      },
      {
        icon: "turn-right" as const,
        instruction: "Rẽ phải vào",
        street: "Nguyễn Trãi",
        distance: "210 m",
      },
    ];

    const routes: RouteOptionEntity[] = [
      {
        id: "safe",
        name: "Tuyến đề xuất",
        time: "12 phút",
        distance: "3,4 km",
        badge: "Nhanh nhất",
        detail:
          "Đi theo Võ Thị Sáu, Đường 3 Tháng 2 và Nguyễn Văn Cừ để đến cơ sở chính.",
        waypoints: [
          [106.6836363, 10.7790693],
          [106.6817595, 10.7597031],
        ],
        navigationSteps,
      },
      {
        id: "balanced",
        name: "Tuyến dự phòng",
        time: "15 phút",
        distance: "3,9 km",
        badge: "Ít điểm ngập",
        detail:
          "Tuyến dự phòng được sử dụng khi hệ thống ghi nhận ngập trên lộ trình chính.",
        waypoints: [
          [106.6836363, 10.7790693],
          [106.689, 10.769],
          [106.6817595, 10.7597031],
        ],
        navigationSteps,
      },
    ];
    await this.routeRepo.save(routes);

    const trends: TrendSeriesEntity[] = [
      {
        rangeKey: "24h",
        labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
        reports: [5, 3, 8, 12, 25, 17],
        rain: [14, 9, 18, 27, 61, 44],
        insight: "Đỉnh báo cáo trùng thời điểm mưa lớn lúc 17:30.",
      },
      {
        rangeKey: "7d",
        labels: ["T2", "T3", "T4", "T5", "T6", "T7"],
        reports: [18, 23, 14, 31, 42, 28],
        rain: [22, 34, 19, 45, 72, 39],
        insight: "Thứ Sáu có lượng mưa và số báo cáo cao nhất tuần.",
      },
      {
        rangeKey: "30d",
        labels: ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Hôm nay", ""],
        reports: [48, 65, 57, 86, 104, 104],
        rain: [31, 42, 38, 56, 64, 64],
        insight: "Số điểm ngập được ghi nhận tăng 21% trong 7 ngày gần đây.",
      },
    ];
    await this.trendRepo.save(trends);
  }

  async inspectAllTables() {
    const [
      flood_reports,
      map_points,
      area_alerts,
      community_users,
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
