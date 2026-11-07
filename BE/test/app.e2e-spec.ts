import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "./../src/app.module";
import { WeatherController } from "./../src/modules/weather/controllers/weather.controller";
import { MapController } from "./../src/modules/map/controllers/map.controller";
import { JourneyController } from "./../src/modules/journey/controllers/journey.controller";
import { ReportsController } from "./../src/modules/reports/controllers/reports.controller";
import { AlertsController } from "./../src/modules/alerts/controllers/alerts.controller";
import { UsersController } from "./../src/modules/users/controllers/users.controller";
import { UsersService } from "./../src/modules/users/services/users.service";
import { AnalyticsController } from "./../src/modules/analytics/controllers/analytics.controller";
import { SeedController } from "./../src/modules/seed/controllers/seed.controller";
import { RealtimeController } from "./../src/modules/realtime/controllers/realtime.controller";

describe("SaigonDrain AI — Full-Stack & MVC E2E Suite (9 Modules + Realtime SSE + User/Admin Integration)", () => {
  let app: INestApplication;
  let weatherController: WeatherController;
  let mapController: MapController;
  let journeyController: JourneyController;
  let reportsController: ReportsController;
  let alertsController: AlertsController;
  let usersController: UsersController;
  let usersService: UsersService;
  let analyticsController: AnalyticsController;
  let seedController: SeedController;
  let realtimeController: RealtimeController;

  beforeAll(async () => {
    process.env.DB_TYPE = "sqljs";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    weatherController = app.get(WeatherController);
    mapController = app.get(MapController);
    journeyController = app.get(JourneyController);
    reportsController = app.get(ReportsController);
    alertsController = app.get(AlertsController);
    usersController = app.get(UsersController);
    usersService = app.get(UsersService);
    analyticsController = app.get(AnalyticsController);
    seedController = app.get(SeedController);
    realtimeController = app.get(RealtimeController);

    await seedController.resetData();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("1. WeatherModule E2E (/api/weather)", () => {
    it("GET /api/weather/current — fetches weather snapshot & saves to DB", async () => {
      const snapshot = await weatherController.getCurrent({
        lat: 10.7769,
        lng: 106.7009,
        locationName: "TP. Hồ Chí Minh",
      });
      expect(snapshot).toBeDefined();
      expect(snapshot.locationName).toBe("TP. Hồ Chí Minh");
      expect(typeof snapshot.temperatureC).toBe("number");
      expect(Array.isArray(snapshot.hourlyForecast)).toBe(true);
    });

    it("GET /api/weather/districts — returns weather & flood risk for 7 HCMC districts", async () => {
      const districts = await weatherController.getDistrictsWeather();
      expect(districts).toHaveLength(7);
      expect(districts[0].district).toBe("Bình Thạnh");
      expect(districts[0]).toHaveProperty("floodRiskLevel");
    });

    it("POST /api/weather/sync-forecasts — syncs weather into forecast slots", async () => {
      const res = await weatherController.syncForecasts();
      expect(res.slots).toHaveLength(4);
      expect(res.slots[0].id).toBe("now");
    });
  });

  describe("2. MapModule E2E (/api/map)", () => {
    it("GET /api/map/config — returns free Vector Map styles (OpenFreeMap & CARTO)", () => {
      const cfg = mapController.getConfig();
      expect(cfg.recommendedStyle).toContain("openfreemap.org");
      expect(cfg.styles).toHaveProperty("openFreeMapLiberty");
      expect(cfg.styles).toHaveProperty("cartoVoyager");
    });

    it("GET /api/map/points — filters map points by layers & severity", async () => {
      const allPoints = await mapController.findAllPoints({});
      expect(allPoints.length).toBeGreaterThanOrEqual(10);

      const criticalPoints = await mapController.findAllPoints({
        severity: "critical",
      });
      expect(criticalPoints.every((p) => p.severity === "critical")).toBe(true);
    });

    it("GET /api/map/points/:id — returns point detail with linked report", async () => {
      const point = await mapController.findPointById("p3");
      expect(point.label).toBe("Nguyễn Văn Quá");
      expect(point.linkedReport?.id).toBe("RP-2418");
    });

    it("GET /api/map/geocode/reverse & /api/map/elevation — geocodes & checks terrain elevation", async () => {
      const geo = await mapController.reverseGeocode({
        lat: 10.7791,
        lng: 106.6836,
      });
      expect(geo).toHaveProperty("location");
      expect(geo).toHaveProperty("district");

      const elev = await mapController.getElevation({
        lat: 10.7934,
        lng: 106.7185,
      });
      expect(typeof elev.elevationM).toBe("number");
      expect(elev).toHaveProperty("terrainClassification");
    });
  });

  describe("3. JourneyModule E2E (/api/journey)", () => {
    it("GET /api/journey/forecasts & /api/journey/routes — returns forecast slots and safe/balanced routes", async () => {
      const forecasts = await journeyController.getForecasts();
      expect(forecasts).toHaveLength(4);

      const routesData = await journeyController.getRoutes();
      expect(routesData.routes.safe?.id).toBe("safe");
      expect(routesData.routes.balanced?.id).toBe("balanced");
      expect(routesData.navigationSteps.length).toBeGreaterThan(0);
    });

    it("GET /api/journey/compute-route — computes safe route between Campus 1 and Main Campus", async () => {
      const computed = await journeyController.computeRoute({
        fromLat: 10.7790693,
        fromLng: 106.6836363,
        toLat: 10.7597031,
        toLng: 106.6817595,
      });
      expect(computed).toHaveProperty("safeRoute");
      expect(computed).toHaveProperty("balancedRoute");
    });
  });

  describe("4. ReportsModule E2E (/api/reports)", () => {
    it("POST /api/reports -> PATCH /api/reports/:id/approve -> updates linked MapPoint to flood", async () => {
      const created = await reportsController.create({
        location: "Đường Võ Văn Ngân",
        district: "TP. Thủ Đức",
        description: "Nước ngập sâu sau mưa lớn 30 phút.",
        reportType: "flood",
        severity: "high",
        reportedDepth: 30,
        lat: 10.8505,
        lng: 106.7717,
        reporterId: "USR-1048",
      });
      expect(created.id).toMatch(/^RP-/);
      expect(created.status).toBe("pending");

      const approval = await reportsController.approve(created.id);
      expect(approval.report.status).toBe("verified");
      expect(approval.updatedMapPoint?.type).toBe("flood");
    });

    it("PATCH /api/reports/:id/reject — rejects report with reason", async () => {
      const rejection = await reportsController.reject("RP-2412", {
        reason: "Không trùng khớp camera khu vực",
      });
      expect(rejection.report.status).toBe("rejected");
      expect(rejection.report.rejectReason).toBe(
        "Không trùng khớp camera khu vực",
      );
    });
  });

  describe("5. AlertsModule E2E (/api/alerts)", () => {
    it("POST /api/alerts -> PATCH /api/alerts/:id -> PATCH /api/alerts/:id/end", async () => {
      const newAlert = await alertsController.create({
        area: "Võ Văn Ngân, TP. Thủ Đức",
        level: "Nghiêm trọng",
        hazardType: "Ngập đường",
        title: "Nước chảy xiết trên dốc Võ Văn Ngân",
        message: "Hạn chế xe 2 bánh lưu thông qua khu vực.",
        expiresAt: "22:00",
        channels: ["Web", "Push"],
      });
      expect(newAlert.id).toMatch(/^AL-/);
      expect(newAlert.status).toBe("active");

      const updated = await alertsController.update(newAlert.id, {
        expiresAt: "23:00",
      });
      expect(updated.expiresAt).toBe("23:00");

      const ended = await alertsController.endAlert(newAlert.id);
      expect(ended.alert.status).toBe("ended");
    });
  });

  describe("6. UsersModule E2E (/api/users)", () => {
    it("GET /api/users/:id, PATCH /api/users/:id/status & CSV generation", async () => {
      const user = await usersController.findOne("USR-0997");
      expect(user.name).toBe("Lê Quốc Bảo");
      expect(typeof user.approvalRate).toBe("number");

      const statusRes = await usersController.updateStatus("USR-0997", {
        status: "active",
      });
      expect(statusRes.user.status).toBe("active");
    });
  });

  describe("7. AnalyticsModule & 8. SeedModule E2E (/api/analytics, /api/seed)", () => {
    it("GET /api/analytics/overview & /api/analytics/trends", async () => {
      const overview = await analyticsController.getOverview();
      expect(overview).toHaveProperty("reportStatusCounts");
      expect(overview).toHaveProperty("severityBreakdown");
      expect(overview).toHaveProperty("districtBreakdown");
      expect(overview).toHaveProperty("trustBands");

      const trends24h = await analyticsController.getTrends("24h");
      expect(trends24h).toHaveProperty("labels");
      expect(trends24h).toHaveProperty("insight");
    });

    it("POST /api/seed/reset — restores clean seed state", async () => {
      const resetRes = await seedController.resetData();
      expect(resetRes.message).toContain("thành công");
    });
  });

  describe("8. Full-Stack Integration E2E: User App <-> Backend <-> Admin App", () => {
    let citizenReportId: string;

    it("Step 1 [User App]: Bootstraps Weather, Forecast Timeline & Safe Routes", async () => {
      const weather = await weatherController.getCurrent({});
      expect(weather.temperatureC).toBeGreaterThan(0);
      expect(weather.weatherCondition).toBeTruthy();
      expect(typeof weather.currentRainMm).toBe("number");

      const synced = await weatherController.syncForecasts();
      expect(synced.slots).toHaveLength(4);
      expect(synced.slots[0]).toHaveProperty("label");
      expect(synced.slots[0]).toHaveProperty("rain");
      expect(synced.slots[0]).toHaveProperty("risk");
      expect(typeof synced.slots[0].zone).toBe("number");

      const routesPayload = await journeyController.getRoutes();
      expect(
        routesPayload.routes.safe?.waypoints.length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        routesPayload.routes.balanced?.waypoints.length,
      ).toBeGreaterThanOrEqual(2);
      expect(routesPayload.navigationSteps.length).toBeGreaterThan(0);
    });

    it("Step 2 [User App -> Backend]: Citizen submits Flood Report from ReportModal.tsx", async () => {
      const createdReport = await reportsController.create({
        location: "Nguyễn Hữu Cảnh, Bình Thạnh",
        reportType: "flood",
        severity: "high",
        description:
          "Nước ngập gần nửa bánh xe dưới chân cầu vượt Nguyễn Hữu Cảnh.",
        reportedDepth: 32,
        lat: 10.7934,
        lng: 106.7185,
        reporterId: "USR-1048",
      });

      citizenReportId = createdReport.id;
      expect(citizenReportId).toMatch(/^RP-/);
      expect(createdReport.status).toBe("pending");
      expect(createdReport.severity).toBe("critical");
      expect(createdReport.district).toContain("Bình Thạnh");
    });

    it("Step 3 [Admin App]: Loads Dashboard & sees newly submitted Citizen Report + Map Marker", async () => {
      const [reports, mapPoints, alerts, users, trends] = await Promise.all([
        reportsController.findAll({}),
        mapController.findAllPoints({}),
        alertsController.findAll({}),
        usersController.findAll({}),
        analyticsController.getTrends(),
      ]);

      const pendingInQueue = reports.find((r) => r.id === citizenReportId);
      expect(pendingInQueue).toBeDefined();
      expect(pendingInQueue?.status).toBe("pending");

      const pendingMarker = mapPoints.find(
        (pt) => pt.linkedReportId === citizenReportId,
      );
      expect(pendingMarker).toBeDefined();
      expect(pendingMarker?.type).toBe("pending");

      expect(alerts.length).toBeGreaterThan(0);
      expect(users.length).toBeGreaterThan(0);
      expect(trends).toHaveProperty("24h");
      expect(trends).toHaveProperty("7d");
      expect(trends).toHaveProperty("30d");
    });

    it("Step 4 [Admin App -> Backend]: Approves Citizen Report -> Updates Map Marker & User Trust Score", async () => {
      const userBefore = await usersController.findOne("USR-1048");
      const verifiedBefore = userBefore.verifiedReports;

      const approval = await reportsController.approve(citizenReportId);
      expect(approval.report.status).toBe("verified");
      expect(approval.updatedMapPoint?.type).toBe("flood");
      expect(approval.updatedMapPoint?.severity).toBe("critical");

      const userAfter = await usersController.findOne("USR-1048");
      expect(userAfter.verifiedReports).toBe(verifiedBefore + 1);
    });

    it("Step 5 [Admin App]: Exports Community Contributors CSV & Restores Clean Seed State", async () => {
      const csvContent = await usersService.generateCsvContent();
      expect(csvContent).toContain("Mã người dùng");
      expect(csvContent).toContain("Họ tên");
      expect(csvContent).toContain("USR-1048");

      const resetRes = await seedController.resetData();
      expect(resetRes.message).toContain("thành công");
    });

    it("Step 6 [Realtime SSE Stream]: Emits live events to connected User & Admin subscribers", async () => {
      const receivedEvents: string[] = [];
      const sub = realtimeController.stream().subscribe((msg) => {
        if (msg.type) receivedEvents.push(msg.type);
      });

      await reportsController.create({
        location: "Quốc Hương, Thảo Điền, TP. Thủ Đức",
        reportType: "flood",
        severity: "high",
        lat: 10.8038,
        lng: 106.7329,
      });

      await weatherController.syncForecasts();

      sub.unsubscribe();

      expect(receivedEvents).toContain("connected");
      expect(receivedEvents).toContain("report.created");
      expect(receivedEvents).toContain("weather.updated");

      const status = realtimeController.getStatus();
      expect(status.status).toBe("online");
      expect(status.totalBroadcasts).toBeGreaterThan(0);

      await seedController.resetData();
    });
  });
});
