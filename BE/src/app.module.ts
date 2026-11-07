import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { createTypeOrmOptions } from "./config/typeorm.config";
import { WeatherModule } from "./modules/weather/weather.module";
import { MapModule } from "./modules/map/map.module";
import { JourneyModule } from "./modules/journey/journey.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AlertsModule } from "./modules/alerts/alerts.module";
import { UsersModule } from "./modules/users/users.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { SeedModule } from "./modules/seed/seed.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createTypeOrmOptions(configService),
    }),
    RealtimeModule,
    WeatherModule,
    MapModule,
    JourneyModule,
    ReportsModule,
    AlertsModule,
    UsersModule,
    AnalyticsModule,
    SeedModule,
  ],
})
export class AppModule {}
