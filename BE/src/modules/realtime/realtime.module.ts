import { Global, Module } from "@nestjs/common";
import { RealtimeController } from "./controllers/realtime.controller";
import { RealtimeService } from "./services/realtime.service";

@Global()
@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
