import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FloodReportEntity } from "./models/flood-report.entity";
import { MapPointEntity } from "../map/models/map-point.entity";
import { CommunityUserEntity } from "../users/models/community-user.entity";
import { ReportsService } from "./services/reports.service";
import { ReportsController } from "./controllers/reports.controller";
import { MapModule } from "../map/map.module";

@Module({
  imports: [
    MapModule,
    TypeOrmModule.forFeature([
      FloodReportEntity,
      MapPointEntity,
      CommunityUserEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
