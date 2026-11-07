import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsNumber, IsOptional, IsString } from "class-validator";
import {
  ReportSeverity,
  ReportType,
  ReportVisual,
} from "../models/flood-report.entity";

export class CreateReportDto {
  @ApiPropertyOptional({
    example: "105 Bà Huyện Thanh Quan",
    description:
      "Nếu bỏ trống và có truyền lat/lng, hệ thống sẽ tự Reverse Geocode",
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: "Quận 3" })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({
    example: "Nước dâng qua nửa bánh xe máy sau cơn mưa lớn.",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: "flood", enum: ["flood", "drain"] })
  @IsIn(["flood", "drain"])
  reportType: ReportType;

  @ApiProperty({
    example: "medium",
    enum: ["critical", "high", "medium", "low"],
  })
  @IsIn(["critical", "high", "medium", "low"])
  severity: ReportSeverity;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  reportedDepth?: number;

  @ApiPropertyOptional({ example: 10.7790693 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 106.6836363 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: "10.7791, 106.6836" })
  @IsOptional()
  @IsString()
  coordinates?: string;

  @ApiPropertyOptional({
    example: "street",
    enum: ["street", "drain", "night", "traffic"],
  })
  @IsOptional()
  @IsIn(["street", "drain", "night", "traffic"])
  visual?: ReportVisual;

  @ApiPropertyOptional({ example: "flood-scene.jpg" })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ example: "USR-1048" })
  @IsOptional()
  @IsString()
  reporterId?: string;

  @ApiPropertyOptional({
    example: "Hệ thống AI Gemini phát hiện ngập sâu ~32 cm tại làn xe máy.",
  })
  @IsOptional()
  @IsString()
  aiSummary?: string;

  @ApiPropertyOptional({
    example:
      "Xe máy nên chuyển sang làn giữa tim đường hoặc chọn lộ trình thay thế.",
  })
  @IsOptional()
  @IsString()
  recommendation?: string;
}
