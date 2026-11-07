import { Controller, Get, MessageEvent, Sse } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Observable } from "rxjs";
import { RealtimeService } from "../services/realtime.service";

@ApiTags("0. Realtime Stream (SSE)")
@Controller("realtime")
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Sse("stream")
  @ApiOperation({
    summary:
      "Kênh truyền dữ liệu thời gian thực (Server-Sent Events) đồng bộ tức thì giữa User App và Admin App",
  })
  stream(): Observable<MessageEvent> {
    return this.realtimeService.getStream();
  }

  @Get("status")
  @ApiOperation({
    summary: "Kiểm tra trạng thái kênh truyền thời gian thực (Realtime Status)",
  })
  getStatus() {
    return this.realtimeService.getStatus();
  }
}
