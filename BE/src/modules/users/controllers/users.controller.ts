import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { UsersService } from "../services/users.service";
import {
  LoginUserDto,
  QueryUserDto,
  RegisterUserDto,
  UpdateUserStatusDto,
} from "../dtos/update-user-status.dto";

@ApiTags(
  "6. Community Users & Auth (Đăng ký, Đăng nhập & Người dùng cộng đồng)",
)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("register")
  @ApiOperation({
    summary:
      "Đăng ký tài khoản người dùng mới (lưu vào PostgreSQL community_users & phát sự kiện Realtime)",
  })
  register(@Body() dto: RegisterUserDto) {
    return this.usersService.register(dto);
  }

  @Post("login")
  @ApiOperation({
    summary: "Đăng nhập bằng Email hoặc Số điện thoại + Mật khẩu",
  })
  login(@Body() dto: LoginUserDto) {
    return this.usersService.login(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      "Lấy danh sách người dùng cộng đồng (lọc theo status, district, tìm kiếm tên/email)",
  })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get("export-csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header(
    "Content-Disposition",
    'attachment; filename="saigondrain-nguoi-dung.csv"',
  )
  @ApiOperation({
    summary:
      "Xuất danh sách người dùng cộng đồng ra file CSV chuẩn tiếng Việt UTF-8 BOM",
  })
  async exportCsv(@Res() res: Response) {
    const csv = await this.usersService.generateCsvContent();
    res.send(csv);
  }

  @Get(":id")
  @ApiOperation({
    summary:
      "Xem hồ sơ chi tiết người dùng kèm tỷ lệ báo cáo chính xác (approvalRate)",
  })
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(":id/status")
  @ApiOperation({
    summary:
      "Đổi trạng thái tài khoản người dùng (active: Mở khóa, review: Xem xét, blocked: Khóa)",
  })
  updateStatus(@Param("id") id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, dto.status);
  }
}
