import { ConflictException, NotFoundException } from "@nestjs/common";
import { ReportsService } from "./services/reports.service";

describe("Report lifecycle contracts", () => {
  let reports: any,
    points: any,
    users: any,
    events: any,
    service: ReportsService;
  beforeEach(() => {
    const repo = () => ({
      count: jest.fn().mockResolvedValue(0),
      create: (x: any) => x,
      save: jest.fn(async (x: any) => x),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    });
    reports = repo();
    points = repo();
    users = repo();
    events = { broadcast: jest.fn() };
    service = new ReportsService(
      reports,
      points,
      users,
      {
        reverseGeocode: jest
          .fn()
          .mockResolvedValue({ location: "Street", district: "District" }),
      } as any,
      events,
    );
  });
  it("creates pending report and linked marker with normalized severity", async () => {
    const report = await service.create({
      reportType: "drain",
      severity: "high",
      reporterId: "U1",
    });
    expect(report).toMatchObject({
      status: "pending",
      severity: "critical",
      aiDepth: 33,
    });
    expect(points.save.mock.calls[0][0]).toMatchObject({
      linkedReportId: report.id,
      type: "pending",
      depth: 35,
    });
    expect(events.broadcast.mock.calls[0][0]).toBe("report.created");
  });
  it("approves once with capped trust and rejects repeated review", async () => {
    const report = { id: "R", status: "pending", aiDepth: 20, reporterId: "U" };
    const point = { type: "pending", depth: 24 };
    const user = { verifiedReports: 2, trustScore: 99 };
    reports.findOne.mockResolvedValue(report);
    points.findOne.mockResolvedValue(point);
    users.findOne.mockResolvedValue(user);
    const result = await service.approve("R");
    expect(result.report.status).toBe("verified");
    expect(point).toMatchObject({ type: "flood", depth: 20 });
    expect(user).toMatchObject({ verifiedReports: 3, trustScore: 100 });
    await expect(service.approve("R")).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.reject("R")).rejects.toBeInstanceOf(ConflictException);
    expect(user.verifiedReports).toBe(3);
  });
  it("rejects pending report and removes active flood depth", async () => {
    reports.findOne.mockResolvedValue({ status: "pending", reporterId: "U" });
    const point = { type: "pending", depth: 40 };
    const user = { rejectedReports: 2 };
    points.findOne.mockResolvedValue(point);
    users.findOne.mockResolvedValue(user);
    expect((await service.reject("R", "invalid")).report).toMatchObject({
      status: "rejected",
      rejectReason: "invalid",
    });
    expect(point).toEqual({ type: "risk", depth: 0 });
    expect(user.rejectedReports).toBe(3);
  });
  it("returns not found without publishing a review event", async () => {
    await expect(service.approve("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(events.broadcast).not.toHaveBeenCalled();
  });
  it("does not publish if transaction fails", async () => {
    reports.manager = {
      transaction: jest.fn().mockRejectedValue(new Error("rollback")),
    };
    await expect(service.approve("R")).rejects.toThrow("rollback");
    expect(events.broadcast).not.toHaveBeenCalled();
  });
});
