import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { AlertLevel, AlertStatus } from "../models/area-alert.entity";

export class CreateAlertDto {
  @ApiProperty({ example: "Nguyễn Hữu Cảnh, Bình Thạnh" })
  @IsString()
  @IsNotEmpty()
  area: string;

  @ApiProperty({
    example: "Nghiêm trọng",
    enum: ["Theo dõi", "Cảnh báo", "Nghiêm trọng"],
  })
  @IsIn(["Theo dõi", "Cảnh báo", "Nghiêm trọng"])
  level: AlertLevel;

  @ApiProperty({ example: "Ngập đường" })
  @IsString()
  @IsNotEmpty()
  hazardType: string;

  @ApiProperty({ example: "Ngập sâu, hạn chế di chuyển" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: "Mực nước đang vượt 40 cm. Người dân tránh lưu thông qua khu vực.",
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: "21:00" })
  @IsString()
  expiresAt: string;

  @ApiProperty({ example: ["Web", "Push", "Trung tâm điều hành"] })
  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @ApiPropertyOptional({ example: "Nguyễn Minh" })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class QueryAlertDto {
  @ApiPropertyOptional({ enum: ["active", "ended"] })
  @IsOptional()
  @IsIn(["active", "ended"])
  status?: AlertStatus;

  @ApiPropertyOptional({ enum: ["Theo dõi", "Cảnh báo", "Nghiêm trọng"] })
  @IsOptional()
  @IsIn(["Theo dõi", "Cảnh báo", "Nghiêm trọng"])
  level?: AlertLevel;
}
