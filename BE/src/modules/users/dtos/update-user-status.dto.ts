import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { UserStatus } from "../models/community-user.entity";

export class UpdateUserStatusDto {
  @ApiProperty({
    example: "review",
    enum: ["active", "review", "blocked"],
    description: "Trạng thái người dùng: active | review | blocked",
  })
  @IsIn(["active", "review", "blocked"])
  status: UserStatus;
}

export class QueryUserDto {
  @ApiPropertyOptional({ enum: ["active", "review", "blocked"] })
  @IsOptional()
  @IsIn(["active", "review", "blocked"])
  status?: UserStatus;

  @ApiPropertyOptional({ example: "Bình Thạnh" })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: "Hoàng Anh" })
  @IsOptional()
  @IsString()
  search?: string;
}

export class RegisterUserDto {
  @ApiProperty({ example: "Nguyễn Minh Tuấn", description: "Họ và tên" })
  @IsString()
  @IsNotEmpty({ message: "Vui lòng nhập họ và tên" })
  name: string;

  @ApiProperty({ example: "0909 123 456", description: "Số điện thoại" })
  @IsString()
  @IsNotEmpty({ message: "Vui lòng nhập số điện thoại" })
  phone: string;

  @ApiProperty({ example: "minhtuan@email.vn", description: "Địa chỉ Email" })
  @IsEmail({}, { message: "Email không hợp lệ" })
  email: string;

  @ApiProperty({ example: "Bình Thạnh", description: "Quận/Huyện tại TP.HCM" })
  @IsString()
  @IsNotEmpty({ message: "Vui lòng chọn khu vực Quận/Huyện" })
  district: string;

  @ApiProperty({ example: "123456", description: "Mật khẩu tối thiểu 6 ký tự" })
  @IsString()
  @MinLength(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
  password: string;
}

export class LoginUserDto {
  @ApiProperty({
    example: "hoanganh.tran@email.vn",
    description: "Email hoặc Số điện thoại đăng nhập",
  })
  @IsString()
  @IsNotEmpty({ message: "Vui lòng nhập Email hoặc Số điện thoại" })
  identifier: string;

  @ApiProperty({ example: "123456", description: "Mật khẩu" })
  @IsString()
  @IsNotEmpty({ message: "Vui lòng nhập mật khẩu" })
  password: string;
}
