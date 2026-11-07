import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WeatherSnapshotEntity } from "./models/weather-snapshot.entity";
import { ForecastSlotEntity } from "../journey/models/forecast-slot.entity";
import { MapPointEntity } from "../map/models/map-point.entity";
import { WeatherService } from "./services/weather.service";
import { WeatherController } from "./controllers/weather.controller";

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      WeatherSnapshotEntity,
      ForecastSlotEntity,
      MapPointEntity,
    ]),
  ],
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
