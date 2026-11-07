import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AlertsService } from "../services/alerts.service";
import { CreateAlertDto, QueryAlertDto } from "../dtos/create-alert.dto";
import { UpdateAlertDto } from "../dtos/update-alert.dto";

@ApiTags("5. Area Alerts (Cảnh báo khu vực)")
@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({
    summary: "Lấy danh sách cảnh báo khu vực (lọc theo status, level)",
  })
  findAll(@Query() query: QueryAlertDto) {
    return this.alertsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Xem chi tiết một cảnh báo khu vực" })
  findOne(@Param("id") id: string) {
    return this.alertsService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary:
      "Phát cảnh báo khu vực mới tới các kênh (Web, Push, Trung tâm điều hành)",
  })
  create(@Body() dto: CreateAlertDto) {
    return this.alertsService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Cập nhật nội dung, cấp độ, kênh phát hoặc thời hạn cảnh báo",
  })
  update(@Param("id") id: string, @Body() dto: UpdateAlertDto) {
    return this.alertsService.update(id, dto);
  }

  @Patch(":id/end")
  @ApiOperation({ summary: "Kết thúc cảnh báo khu vực (status = ended)" })
  endAlert(@Param("id") id: string) {
    return this.alertsService.endAlert(id);
  }
}
