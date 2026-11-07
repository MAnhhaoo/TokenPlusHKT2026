import { DataSource } from "typeorm";
import { FloodReportEntity } from "../src/modules/reports/models/flood-report.entity";
import { MapPointEntity } from "../src/modules/map/models/map-point.entity";
import { CommunityUserEntity } from "../src/modules/users/models/community-user.entity";
import { AreaAlertEntity } from "../src/modules/alerts/models/area-alert.entity";
import { ReportsService } from "../src/modules/reports/services/reports.service";
// Fixed loopback address and dedicated database: never consume DATABASE_URL or production settings.
describe("Isolated PostgreSQL report transactions", () => {
  const ds = new DataSource({
    type: "postgres",
    host: "127.0.0.1",
    port: 55439,
    username: "saigondrain_test",
    password: "local_test_only",
    database: "saigondrain_isolated_test",
    entities: [FloodReportEntity, MapPointEntity, CommunityUserEntity, AreaAlertEntity],
    synchronize: true,
    dropSchema: true,
    connectTimeoutMS: 2000,
  });
  let service: ReportsService;
  beforeAll(async () => {
    await ds.initialize();
    service = new ReportsService(
      ds.getRepository(FloodReportEntity),
      ds.getRepository(MapPointEntity),
      ds.getRepository(CommunityUserEntity),
      ds.getRepository(AreaAlertEntity),
      {
        reverseGeocode: async () => ({
          location: "Test street",
          district: "Test district",
        }),
      } as any,
      { analyzeImage: jest.fn().mockResolvedValue(null) } as any,
    );
  }, 10000);
  afterAll(async () => {
    if (ds.isInitialized) await ds.destroy();
  });
  beforeEach(async () => {
    await ds.getRepository(MapPointEntity).clear();
    await ds.getRepository(FloodReportEntity).clear();
    await ds.getRepository(CommunityUserEntity).clear();
  });
  it("persists rejection and increments reporter counter exactly once", async () => {
    const userRepo = ds.getRepository(CommunityUserEntity);
    await userRepo.save(
      userRepo.create({
        id: "U-reject",
        name: "Test User",
        initials: "TU",
        phone: "0900000000",
        email: "reject@example.test",
        district: "Test district",
        joinedAt: "07/11/2026",
        lastActive: "now",
        reports: 1,
        verifiedReports: 0,
        rejectedReports: 2,
        trustScore: 85,
        status: "active",
        identityVerified: true,
        warnings: 0,
      }),
    );
    const report = await service.create({
      reportType: "flood",
      severity: "medium",
      reporterId: "U-reject",
    });
    await service.reject(report.id, "Fixture evidence mismatch");
    await expect(service.reject(report.id, "repeat")).rejects.toMatchObject({
      status: 409,
    });
    expect(
      await ds
        .getRepository(FloodReportEntity)
        .findOneByOrFail({ id: report.id }),
    ).toMatchObject({
      status: "rejected",
      rejectReason: "Fixture evidence mismatch",
    });
    expect(
      await ds
        .getRepository(MapPointEntity)
        .findOneByOrFail({ linkedReportId: report.id }),
    ).toMatchObject({ type: "risk", depth: 0 });
    expect(await userRepo.findOneByOrFail({ id: "U-reject" })).toMatchObject({
      rejectedReports: 3,
      trustScore: 85,
    });
  });
  it("persists report and marker then approves exactly once", async () => {
    const report = await service.create({
      reportType: "flood",
      severity: "medium",
    });
    await service.approve(report.id);
    await expect(service.approve(report.id)).rejects.toMatchObject({
      status: 409,
    });
    expect(
      await ds
        .getRepository(FloodReportEntity)
        .findOneByOrFail({ id: report.id }),
    ).toMatchObject({ status: "verified" });
    expect(
      await ds
        .getRepository(MapPointEntity)
        .findOneByOrFail({ linkedReportId: report.id }),
    ).toMatchObject({ type: "flood" });
  });
  it("rolls back report review when marker write fails", async () => {
    const report = await service.create({
      reportType: "flood",
      severity: "medium",
    });
    await ds.query(
      `ALTER TABLE map_points ADD CONSTRAINT test_no_flood CHECK (type <> 'flood')`,
    );
    try {
      await expect(service.approve(report.id)).rejects.toThrow();
      expect(
        await ds
          .getRepository(FloodReportEntity)
          .findOneByOrFail({ id: report.id }),
      ).toMatchObject({ status: "pending" });
    } finally {
      await ds.query("ALTER TABLE map_points DROP CONSTRAINT test_no_flood");
    }
  });
  it("rolls back report creation when marker persistence fails [regression]", async () => {
    await ds.query(
      `ALTER TABLE map_points ADD CONSTRAINT test_no_pending CHECK (type <> 'pending')`,
    );
    try {
      await expect(
        service.create({ reportType: "flood", severity: "medium" }),
      ).rejects.toThrow();
      expect(await ds.getRepository(FloodReportEntity).count()).toBe(0);
    } finally {
      await ds.query("ALTER TABLE map_points DROP CONSTRAINT test_no_pending");
    }
  });
});
