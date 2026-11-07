import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FloodReportEntity } from "../reports/models/flood-report.entity";
import { AreaAlertEntity } from "../alerts/models/area-alert.entity";
import { MapPointEntity } from "../map/models/map-point.entity";
import { CommunityUserEntity } from "../users/models/community-user.entity";
import { ForecastSlotEntity } from "../journey/models/forecast-slot.entity";
import { RouteOptionEntity } from "../journey/models/route-option.entity";
import { TrendSeriesEntity } from "../analytics/models/trend-series.entity";
import { WeatherSnapshotEntity } from "../weather/models/weather-snapshot.entity";
import { SeedService } from "./services/seed.service";
import { SeedController } from "./controllers/seed.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FloodReportEntity,
      AreaAlertEntity,
      MapPointEntity,
      CommunityUserEntity,
      ForecastSlotEntity,
      RouteOptionEntity,
      TrendSeriesEntity,
      WeatherSnapshotEntity,
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
