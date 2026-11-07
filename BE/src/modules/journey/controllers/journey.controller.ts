import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JourneyService } from "../services/journey.service";
import { ComputeRouteDto } from "../dtos/compute-route.dto";

@ApiTags("3. Journey & OSRM Routing (Dự báo mưa & Dẫn đường tránh ngập)")
@Controller("journey")
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  @Get("forecasts")
  @ApiOperation({
    summary:
      "Lấy 4 mốc thời gian dự báo mưa và vùng nguy cơ ngập (now, +30p, +60p, +90p)",
  })
  getForecasts() {
    return this.journeyService.getForecasts();
  }

  @Get("routes")
  @ApiOperation({
    summary:
      "Lấy dữ liệu Tuyến đề xuất (safe), Tuyến dự phòng (balanced) và các bước chỉ dẫn Turn-by-Turn",
  })
  getRoutes() {
    return this.journeyService.getRoutesData();
  }

  @Get("compute-route")
  @ApiOperation({
    summary:
      "Gọi OSRM Routing API tính toán lộ trình thực tế giữa 2 tọa độ và chấm điểm an toàn né điểm ngập",
  })
  computeRoute(@Query() query: ComputeRouteDto) {
    return this.journeyService.computeSafeRoutes(query);
  }
}
