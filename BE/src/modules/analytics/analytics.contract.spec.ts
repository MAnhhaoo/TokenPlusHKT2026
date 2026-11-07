import { AnalyticsService } from "./services/analytics.service";

const repo = (rows: any[] = []) => ({
  find: jest.fn().mockResolvedValue(rows),
  findOne: jest.fn().mockResolvedValue(null),
});

describe("Analytics contracts", () => {
  it("BE-AN01 empty datasets produce zero counts and null verification rate, never NaN", async () => {
    const service = new AnalyticsService(
      repo() as any,
      repo() as any,
      repo() as any,
      repo() as any,
      repo() as any,
    );
    const data = await service.getOverviewAnalytics();
    expect(data.reportStatusCounts).toEqual({
      pending: 0,
      verified: 0,
      rejected: 0,
      total: 0,
    });
    expect(data.verificationRate).toBeNull();
    expect(data.averageDepth).toBe(0);
    expect(data.severityBreakdown.every((item) => item.percent === 0)).toBe(
      true,
    );
    expect(data.trustBands.every((item) => item.percent === 0)).toBe(true);
    expect(data.topContributors).toEqual([]);
  });

  it("BE-AN02 counts all statuses but verification denominator excludes pending, sorts a copy and omits private fields", async () => {
    const users = [
      {
        id: "low",
        verifiedReports: 1,
        trustScore: 59,
        passwordHash: "private",
        email: "private@example.test",
      },
      { id: "high", verifiedReports: 5, trustScore: 85 },
      { id: "mid", verifiedReports: 2, trustScore: 60 },
    ];
    const service = new AnalyticsService(
      repo() as any,
      repo([
        { status: "pending", severity: "medium", district: "A", aiDepth: 10 },
        {
          status: "verified",
          severity: "critical",
          district: "A",
          aiDepth: 20,
        },
        { status: "rejected", severity: "high", district: "B", aiDepth: 30 },
      ]) as any,
      repo([
        { status: "active", channels: ["Web", "Push"] },
        { status: "ended", channels: ["Web"] },
      ]) as any,
      repo([{ severity: "critical" }]) as any,
      repo(users) as any,
    );
    const data = await service.getOverviewAnalytics();
    expect(data.verificationRate).toBe(50);
    expect(data.averageDepth).toBe(20);
    expect(data.districtBreakdown[0]).toEqual({
      label: "A",
      count: 2,
      percent: 67,
    });
    expect(data.trustBands.map((item) => item.count)).toEqual([1, 1, 1]);
    expect(data.topContributors.map((item) => item.id)).toEqual([
      "high",
      "mid",
      "low",
    ]);
    expect(users.map((item) => item.id)).toEqual(["low", "high", "mid"]);
    expect(data.topContributors[2]).not.toHaveProperty("passwordHash");
    expect(data.topContributors[2]).not.toHaveProperty("email");
    expect(data.channelCoverage).toEqual([
      { label: "Web", count: 2 },
      { label: "Push", count: 1 },
    ]);
    expect(data.alertLevelCounts).toEqual({ active: 1, ended: 1 });
  });

  it("BE-AN03 trend ranges preserve stored series and return undefined for absent range", async () => {
    const trends = repo([
      {
        rangeKey: "24h",
        labels: ["00h"],
        reports: [2],
        rain: [3],
        insight: "fixture",
      },
    ]);
    const service = new AnalyticsService(
      trends as any,
      repo() as any,
      repo() as any,
      repo() as any,
      repo() as any,
    );
    expect(await service.getTrends()).toEqual({
      "24h": { labels: ["00h"], reports: [2], rain: [3], insight: "fixture" },
    });
    expect(await service.getTrends("7d")).toBeUndefined();
    const row = { rangeKey: "24h", reports: [2] };
    trends.findOne.mockResolvedValueOnce(row);
    expect(await service.getTrends("24h")).toBe(row);
  });
});
