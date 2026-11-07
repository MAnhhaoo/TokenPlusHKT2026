import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TrendSeriesEntity } from "./models/trend-series.entity";
import { FloodReportEntity } from "../reports/models/flood-report.entity";
import { AreaAlertEntity } from "../alerts/models/area-alert.entity";
import { MapPointEntity } from "../map/models/map-point.entity";
import { CommunityUserEntity } from "../users/models/community-user.entity";
import { AnalyticsService } from "./services/analytics.service";
import { AnalyticsController } from "./controllers/analytics.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrendSeriesEntity,
      FloodReportEntity,
      AreaAlertEntity,
      MapPointEntity,
      CommunityUserEntity,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
