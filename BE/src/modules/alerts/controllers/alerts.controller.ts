import {
  Body,
  Controller,
  Get,
  Optional,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AlertsService } from "../services/alerts.service";
import { CreateAlertDto, QueryAlertDto } from "../dtos/create-alert.dto";
import { UpdateAlertDto } from "../dtos/update-alert.dto";
import {
  AuthenticatedRequest,
  OperatorAuthGuard,
} from "../../../common/guards/operator-auth.guard";

@ApiTags("5. Area Alerts (Cảnh báo khu vực)")
@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  /**
   * Lấy danh sách cảnh báo khu vực theo bộ lọc trạng thái và mức độ.
   */
  @Get()
  @ApiOperation({
    summary: "Lấy danh sách cảnh báo khu vực (lọc theo status, level)",
  })
  findAll(@Query() query: QueryAlertDto) {
    return this.alertsService.findAll(query);
  }

  /**
   * Xem chi tiết một cảnh báo khu vực theo mã định danh.
   */
  @Get(":id")
  @ApiOperation({ summary: "Xem chi tiết một cảnh báo khu vực" })
  findOne(@Param("id") id: string) {
    return this.alertsService.findOne(id);
  }

  /**
   * Phát hành cảnh báo khu vực mới từ điều phối viên đã xác thực.
   */
  @UseGuards(OperatorAuthGuard)
  @Post()
  @ApiOperation({
    summary:
      "Phát cảnh báo khu vực mới tới các kênh (Web, Push, Trung tâm điều hành)",
  })
  create(
    @Body() dto: CreateAlertDto,
    @Optional() @Req() req?: AuthenticatedRequest,
  ) {
    const operatorActor =
      req?.operator?.sub && req.operator.sub !== "operator-demo"
        ? req.operator.sub
        : dto.createdBy || "Nguyễn Minh";
    return this.alertsService.create({
      ...dto,
      createdBy: operatorActor,
    });
  }

  /**
   * Cập nhật thông tin cảnh báo khu vực đang hoạt động.
   */
  @UseGuards(OperatorAuthGuard)
  @Patch(":id")
  @ApiOperation({
    summary: "Cập nhật nội dung, cấp độ, kênh phát hoặc thời hạn cảnh báo",
  })
  update(@Param("id") id: string, @Body() dto: UpdateAlertDto) {
    return this.alertsService.update(id, dto);
  }

  /**
   * Kết thúc một cảnh báo khu vực đang hoạt động.
   */
  @UseGuards(OperatorAuthGuard)
  @Patch(":id/end")
  @ApiOperation({ summary: "Kết thúc cảnh báo khu vực (status = ended)" })
  endAlert(@Param("id") id: string) {
    return this.alertsService.endAlert(id);
  }
}
