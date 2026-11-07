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
import { ReportsService } from "../services/reports.service";
import { CreateReportDto } from "../dtos/create-report.dto";
import { RejectReportDto } from "../dtos/review-report.dto";
import { QueryReportDto } from "../dtos/query-report.dto";

@ApiTags("4. Flood Reports (Báo cáo ngập & Xác minh cộng đồng)")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({
    summary:
      "Lấy danh sách báo cáo ngập cộng đồng (lọc theo status, severity, district)",
  })
  findAll(@Query() query: QueryReportDto) {
    return this.reportsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Xem chi tiết báo cáo hiện trường kèm cảnh báo báo cáo trùng lặp",
  })
  findOne(@Param("id") id: string) {
    return this.reportsService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary:
      "Người dân gửi báo cáo ngập/tắc cống mới (Tự động Reverse Geocode & phân tích AI)",
  })
  create(@Body() dto: CreateReportDto) {
    return this.reportsService.create(dto);
  }

  @Patch(":id/approve")
  @ApiOperation({
    summary:
      "Điều phối viên xác nhận báo cáo -> chuyển sang verified và cập nhật điểm ngập trên bản đồ",
  })
  approve(@Param("id") id: string) {
    return this.reportsService.approve(id);
  }

  @Patch(":id/reject")
  @ApiOperation({
    summary: "Điều phối viên từ chối báo cáo kèm lý do",
  })
  reject(@Param("id") id: string, @Body() dto: RejectReportDto) {
    return this.reportsService.reject(id, dto.reason);
  }
}
