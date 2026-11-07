import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ReportsService } from "../services/reports.service";
import { CreateReportDto } from "../dtos/create-report.dto";
import { AnalyzeImageDto } from "../dtos/analyze-image.dto";
import { RejectReportDto } from "../dtos/review-report.dto";
import { QueryReportDto } from "../dtos/query-report.dto";
import { OperatorAuthGuard } from "../../../common/guards/operator-auth.guard";

@ApiTags("4. Flood Reports (Báo cáo ngập & Xác minh cộng đồng)")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Phân tích ảnh hiện trường bằng mô hình Google Gemini 1.5 Flash Vision.
   */
  @Post("analyze-image")
  @ApiOperation({
    summary:
      "Phân tích ảnh hiện trường bằng Google Gemini Multimodal AI (ước tính mực nước, thời tiết, tình trạng cống, đánh giá rủi ro)",
  })
  analyzeImage(@Body() dto: AnalyzeImageDto) {
    return this.reportsService.analyzeImage(dto);
  }

  /**
   * Lấy danh sách báo cáo ngập cộng đồng theo bộ lọc.
   */
  @Get()
  @ApiOperation({
    summary:
      "Lấy danh sách báo cáo ngập cộng đồng (lọc theo status, severity, district)",
  })
  findAll(@Query() query: QueryReportDto) {
    return this.reportsService.findAll(query);
  }

  /**
   * Xem chi tiết một báo cáo ngập hiện trường.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Xem chi tiết báo cáo hiện trường kèm cảnh báo báo cáo trùng lặp",
  })
  findOne(@Param("id") id: string) {
    return this.reportsService.findOne(id);
  }

  /**
   * Tiếp nhận báo cáo ngập hoặc tắc cống mới từ người dân.
   */
  @Post()
  @ApiOperation({
    summary:
      "Người dân gửi báo cáo ngập/tắc cống mới (Tự động Reverse Geocode & phân tích AI)",
  })
  create(@Body() dto: CreateReportDto) {
    return this.reportsService.create(dto);
  }

  /**
   * Điều phối viên xác nhận báo cáo hợp lệ và cập nhật điểm ngập trên bản đồ.
   */
  @UseGuards(OperatorAuthGuard)
  @Patch(":id/approve")
  @ApiOperation({
    summary:
      "Điều phối viên xác nhận báo cáo -> chuyển sang verified và cập nhật điểm ngập trên bản đồ",
  })
  approve(@Param("id") id: string) {
    return this.reportsService.approve(id);
  }

  /**
   * Điều phối viên khóa / ẩn báo cáo khỏi bản đồ cộng đồng.
   */
  @UseGuards(OperatorAuthGuard)
  @Patch(":id/reject")
  @ApiOperation({
    summary: "Quản trị viên khóa / ẩn báo cáo khỏi bản đồ cộng đồng kèm lý do",
  })
  reject(@Param("id") id: string, @Body() dto: RejectReportDto) {
    return this.reportsService.reject(id, dto.reason);
  }

  /**
   * Quản trị viên chuyển đổi trạng thái Khóa / Mở lại báo cáo.
   */
  @UseGuards(OperatorAuthGuard)
  @Patch(":id/toggle-lock")
  @ApiOperation({
    summary: "Quản trị viên bật/tắt khóa báo cáo (Khóa hoặc Mở khóa lại)",
  })
  toggleLock(@Param("id") id: string, @Body() dto: RejectReportDto) {
    return this.reportsService.toggleLock(id, dto.reason);
  }
}
