import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AreaAlertEntity } from "./models/area-alert.entity";
import { AlertsService } from "./services/alerts.service";
import { AlertsController } from "./controllers/alerts.controller";

@Module({
  imports: [TypeOrmModule.forFeature([AreaAlertEntity])],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
