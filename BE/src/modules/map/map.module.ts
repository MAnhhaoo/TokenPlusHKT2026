import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MapPointEntity } from "./models/map-point.entity";
import { FloodReportEntity } from "../reports/models/flood-report.entity";
import { MapService } from "./services/map.service";
import { MapController } from "./controllers/map.controller";
import { WeatherModule } from "../weather/weather.module";

@Module({
  imports: [
    HttpModule,
    WeatherModule,
    TypeOrmModule.forFeature([MapPointEntity, FloodReportEntity]),
  ],
  controllers: [MapController],
  providers: [MapService],
  exports: [MapService],
})
export class MapModule {}
