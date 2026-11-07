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
   * Lấy dữ liệu chuỗi thời gian xu hướng mưa và báo cáo ngập theo khung 24h, 7d hoặc 30d.
   */
  async getTrends(range?: "24h" | "7d" | "30d") {
    if (range) {
      const item = await this.trendRepo.findOne({
        where: { rangeKey: range },
      });
      if (item) return item;
    }
    const all = await this.trendRepo.find();
    const result: Record<string, unknown> = {};
    all.forEach((t) => {
      result[t.rangeKey] = {
        labels: t.labels,
        reports: t.reports,
        rain: t.rain,
        insight: t.insight,
      };
    });
    return range ? result[range] : result;
  }
}
