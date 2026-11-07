import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AnalyticsService } from "../services/analytics.service";

@ApiTags("7. Analytics & KPI (Thống kê điều hành & Xu hướng)")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  @ApiOperation({
    summary:
      "Tổng hợp toàn bộ chỉ số KPI điều hành, phân bố mức độ ngập, top quận ngập và top người đóng góp",
  })
  getOverview() {
    return this.analyticsService.getOverviewAnalytics();
  }

  @Get("trends")
  @ApiOperation({
    summary: "Lấy dữ liệu biểu đồ xu hướng mưa và báo cáo ngập (24h, 7d, 30d)",
  })
  @ApiQuery({
    name: "range",
    required: false,
    enum: ["24h", "7d", "30d"],
    description: "Khoảng thời gian thống kê (Để trống để lấy cả 3 mốc)",
  })
  getTrends(@Query("range") range?: "24h" | "7d" | "30d") {
    return this.analyticsService.getTrends(range);
  }
}
