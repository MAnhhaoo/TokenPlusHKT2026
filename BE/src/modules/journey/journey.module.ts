import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ForecastSlotEntity } from "./models/forecast-slot.entity";
import { RouteOptionEntity } from "./models/route-option.entity";
import { MapPointEntity } from "../map/models/map-point.entity";
import { WeatherModule } from "../weather/weather.module";
import { MapModule } from "../map/map.module";
import { JourneyService } from "./services/journey.service";
import { JourneyController } from "./controllers/journey.controller";

@Module({
  imports: [
    HttpModule,
    WeatherModule,
    MapModule,
    TypeOrmModule.forFeature([
      ForecastSlotEntity,
      RouteOptionEntity,
      MapPointEntity,
    ]),
  ],
  controllers: [JourneyController],
  providers: [JourneyService],
  exports: [JourneyService],
})
export class JourneyModule {}
