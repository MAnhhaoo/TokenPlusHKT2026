import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FloodReportEntity } from "./models/flood-report.entity";
import { MapPointEntity } from "../map/models/map-point.entity";
import { CommunityUserEntity } from "../users/models/community-user.entity";
import { AreaAlertEntity } from "../alerts/models/area-alert.entity";
import { ReportsService } from "./services/reports.service";
import { GeminiVisionService } from "./services/gemini-vision.service";
import { ReportsController } from "./controllers/reports.controller";
import { MapModule } from "../map/map.module";
import { WeatherModule } from "../weather/weather.module";

@Module({
  imports: [
    MapModule,
    WeatherModule,
    TypeOrmModule.forFeature([
      FloodReportEntity,
      MapPointEntity,
      CommunityUserEntity,
      AreaAlertEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, GeminiVisionService],
  exports: [ReportsService, GeminiVisionService],
})
export class ReportsModule {}
