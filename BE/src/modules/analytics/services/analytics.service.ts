import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TrendSeriesEntity } from "../models/trend-series.entity";
import { FloodReportEntity } from "../../reports/models/flood-report.entity";
import { AreaAlertEntity } from "../../alerts/models/area-alert.entity";
import { MapPointEntity } from "../../map/models/map-point.entity";
import { CommunityUserEntity } from "../../users/models/community-user.entity";

const SEVERITY_ORDER = ["critical", "high", "medium"] as const;

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Nghiêm trọng",
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp",
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(TrendSeriesEntity)
    private readonly trendRepo: Repository<TrendSeriesEntity>,
    @InjectRepository(FloodReportEntity)
    private readonly reportRepo: Repository<FloodReportEntity>,
    @InjectRepository(AreaAlertEntity)
    private readonly alertRepo: Repository<AreaAlertEntity>,
    @InjectRepository(MapPointEntity)
    private readonly mapPointRepo: Repository<MapPointEntity>,
    @InjectRepository(CommunityUserEntity)
    private readonly userRepo: Repository<CommunityUserEntity>,
  ) {}

  /**
   * Tổng hợp các chỉ số phân tích tổng quan về báo cáo, bản đồ ngập, cảnh báo và người đóng góp hàng đầu.
   */
  async getOverviewAnalytics() {
    const [reports, alerts, mapPoints, users] = await Promise.all([
      this.reportRepo.find(),
      this.alertRepo.find(),
      this.mapPointRepo.find(),
      this.userRepo.find(),
    ]);

    const reportStatusCounts = {
      pending: reports.filter((r) => r.status === "pending").length,
      verified: reports.filter((r) => r.status === "verified").length,
      rejected: reports.filter((r) => r.status === "rejected").length,
      total: reports.length,
    };

    const totalReports = Math.max(reports.length, 1);
    const severityBreakdown = SEVERITY_ORDER.map((severity) => {
      const count = reports.filter((r) => r.severity === severity).length;
      return {
        key: severity,
        label: SEVERITY_LABEL[severity],
        count,
        percent: Math.round((count / totalReports) * 100),
      };
    });

    const districtCounts = new Map<string, number>();
    reports.forEach((r) => {
      districtCounts.set(r.district, (districtCounts.get(r.district) ?? 0) + 1);
    });
    const districtBreakdown = [...districtCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([district, count]) => ({
        label: district,
        count,
        percent: Math.round((count / totalReports) * 100),
      }));

    const totalPoints = Math.max(mapPoints.length, 1);
    const mapPointBreakdown = SEVERITY_ORDER.map((severity) => {
      const count = mapPoints.filter((p) => p.severity === severity).length;
      return {
        key: severity,
        label: SEVERITY_LABEL[severity],
        count,
        percent: Math.round((count / totalPoints) * 100),
      };
    });

    const averageDepth = reports.length
      ? Math.round(
          reports.reduce((sum, r) => sum + r.aiDepth, 0) / reports.length,
        )
      : 0;

    const counted = reports.filter((r) => r.status !== "pending").length;
    const verificationRate = counted
      ? Math.round((reportStatusCounts.verified / counted) * 100)
      : null;

    const totalUsers = Math.max(users.length, 1);
    const bands = [
      { label: "85 – 100", count: 0, key: "safe" },
      { label: "60 – 84", count: 0, key: "watch" },
      { label: "Dưới 60", count: 0, key: "danger" },
    ];
    users.forEach((u) => {
      if (u.trustScore >= 85) bands[0].count += 1;
      else if (u.trustScore >= 60) bands[1].count += 1;
      else bands[2].count += 1;
    });
    const trustBands = bands.map((b) => ({
      ...b,
      percent: Math.round((b.count / totalUsers) * 100),
    }));

    const topContributors = [...users]
      .sort((a, b) => b.verifiedReports - a.verifiedReports)
      .slice(0, 5)
      .map((u) => ({
        id: u.id,
        name: u.name,
        initials: u.initials,
        district: u.district,
        reports: u.reports,
        verifiedReports: u.verifiedReports,
        trustScore: u.trustScore,
        status: u.status,
        identityVerified: u.identityVerified,
      }));

    const channelMap = new Map<string, number>();
    alerts.forEach((alert) => {
      (alert.channels ?? []).forEach((ch) => {
        channelMap.set(ch, (channelMap.get(ch) ?? 0) + 1);
      });
    });
    const channelCoverage = [...channelMap.entries()].map(([label, count]) => ({
      label,
      count,
    }));

    const alertLevelCounts = {
      active: alerts.filter((a) => a.status === "active").length,
      ended: alerts.filter((a) => a.status === "ended").length,
    };

    return {
      reportStatusCounts,
      severityBreakdown,
      districtBreakdown,
      mapPointBreakdown,
      averageDepth,
      verificationRate,
      trustBands,
      topContributors,
      channelCoverage,
      alertLevelCounts,
    };
  }

  /**
   * Lấy dữ liệu chuỗi thời gian xu hướng mưa và báo cáo ngập thực tế từ CSDL theo khung 24h, 7d hoặc 30d.
   */
  async getTrends(range?: "24h" | "7d" | "30d") {
    const [allReports, storedTrends] = await Promise.all([
      this.reportRepo.find(),
      this.trendRepo.find(),
    ]);

    const nowMs = Date.now();
    const hcmcFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      hour12: false,
      weekday: "short",
    });

    const labels24h = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"];
    const reports24h = [0, 0, 0, 0, 0, 0];
    const labels7d = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const reports7d = [0, 0, 0, 0, 0, 0, 0];
    const labels30d = ["T1", "T2", "T3", "T4"];
    const reports30d = [0, 0, 0, 0];

    const weekdayIdxMap: Record<string, number> = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    };

    for (const report of allReports) {
      const ts = report.createdAt ? new Date(report.createdAt).getTime() : nowMs;
      const ageMs = Math.max(0, nowMs - ts);
      const ageDays = ageMs / (24 * 60 * 60 * 1000);

      if (ageDays <= 1) {
        const parts = hcmcFormatter.formatToParts(new Date(ts));
        const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
        const hour = parseInt(hourStr, 10) || 0;
        const bucket = Math.min(5, Math.floor(hour / 4));
        reports24h[bucket] += 1;
      }

      if (ageDays <= 7) {
        const parts = hcmcFormatter.formatToParts(new Date(ts));
        const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
        const idx = weekdayIdxMap[wd] ?? 0;
        reports7d[idx] += 1;
      }

      if (ageDays <= 30) {
        // T4 là tuần hiện tại (0-7 ngày), T3 (7-14 ngày), T2 (14-21 ngày), T1 (21-30 ngày)
        const weekOffset = Math.min(3, Math.floor(ageDays / 7));
        const weekIdx = 3 - weekOffset;
        reports30d[weekIdx] += 1;
      }
    }

    const storedMap = new Map(storedTrends.map((t) => [t.rangeKey, t]));
    const rain24h = storedMap.get("24h")?.rain?.length === 6
      ? storedMap.get("24h")!.rain
      : [0, 0, 0, 0, 0, 0];
    const rain7d = storedMap.get("7d")?.rain?.length === 7
      ? storedMap.get("7d")!.rain
      : [0, 0, 0, 0, 0, 0, 0];
    const rain30d = storedMap.get("30d")?.rain?.length === 4
      ? storedMap.get("30d")!.rain
      : [0, 0, 0, 0];

    const total24h = reports24h.reduce((s, v) => s + v, 0);
    const total7d = reports7d.reduce((s, v) => s + v, 0);
    const total30d = reports30d.reduce((s, v) => s + v, 0);

    const result: Record<string, unknown> = {
      "24h": {
        rangeKey: "24h",
        labels: labels24h,
        reports: reports24h,
        rain: rain24h,
        insight: `Ghi nhận ${total24h} báo cáo thực tế trong 24 giờ qua từ PostgreSQL.`,
      },
      "7d": {
        rangeKey: "7d",
        labels: labels7d,
        reports: reports7d,
        rain: rain7d,
        insight: `Ghi nhận ${total7d} báo cáo thực tế trong 7 ngày qua từ PostgreSQL.`,
      },
      "30d": {
        rangeKey: "30d",
        labels: labels30d,
        reports: reports30d,
        rain: rain30d,
        insight: `Ghi nhận ${total30d} báo cáo thực tế trong 30 ngày qua từ PostgreSQL.`,
      },
    };

    return range ? result[range] : result;
  }
}
