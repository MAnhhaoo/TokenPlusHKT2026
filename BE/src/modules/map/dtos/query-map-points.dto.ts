import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsNumber, IsOptional, IsString } from "class-validator";
import { MapPointType, PointSeverity } from "../models/map-point.entity";

export class QueryMapPointsDto {
  @ApiPropertyOptional({
    example: "flood,risk,rain,history",
    description:
      "Danh sách lớp bản đồ cách nhau dấu phẩy (flood, risk, rain, history)",
  })
  @IsOptional()
  @IsString()
  layers?: string;

  @ApiPropertyOptional({
    example: "all",
    enum: ["all", "critical", "high", "medium"],
  })
  @IsOptional()
  @IsIn(["all", "critical", "high", "medium"])
  severity?: "all" | PointSeverity;

  @ApiPropertyOptional({
    example: 0,
    description: "Lượng mưa (mm) để suy luận rủi ro thời gian thực",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rainMm?: number;

  @ApiPropertyOptional({
    example: "realtime",
    enum: ["realtime", "history"],
    description: "Chế độ thời gian thực hoặc xem toàn bộ 250 điểm lịch sử",
  })
  @IsOptional()
  @IsString()
  mode?: "realtime" | "history";

  @ApiPropertyOptional({
    example: "true",
    description: "Loại trừ các điểm xuất phát từ báo cáo cộng đồng của người dân",
  })
  @IsOptional()
  @IsString()
  excludeReports?: string;
}

export class CreateMapPointDto {
  @ApiProperty({ example: "p11" })
  @IsString()
  id: string;

  @ApiProperty({ example: 55 })
  @Type(() => Number)
  @IsNumber()
  x: number;

  @ApiProperty({ example: 48 })
  @Type(() => Number)
  @IsNumber()
  y: number;

  @ApiPropertyOptional({ example: 10.779 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 106.6836 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiProperty({
    example: "flood",
    enum: ["flood", "pending", "risk", "sensor"],
  })
  @IsIn(["flood", "pending", "risk", "sensor"])
  type: MapPointType;

  @ApiProperty({ example: "high", enum: ["critical", "high", "medium"] })
  @IsIn(["critical", "high", "medium"])
  severity: PointSeverity;

  @ApiProperty({ example: " Võ Văn Ngân" })
  @IsString()
  label: string;

  @ApiProperty({ example: "TP. Thủ Đức" })
  @IsString()
  district: string;

  @ApiProperty({ example: 62 })
  @Type(() => Number)
  @IsNumber()
  rainfall: number;

  @ApiProperty({ example: 28 })
  @Type(() => Number)
  @IsNumber()
  depth: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  historyCount?: number;
}

export class UpdateMapPointDto {
  @ApiPropertyOptional({ enum: ["flood", "pending", "risk", "sensor"] })
  @IsOptional()
  @IsIn(["flood", "pending", "risk", "sensor"])
  type?: MapPointType;

  @ApiPropertyOptional({ enum: ["critical", "high", "medium"] })
  @IsOptional()
  @IsIn(["critical", "high", "medium"])
  severity?: PointSeverity;

  @ApiPropertyOptional({ example: 75 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rainfall?: number;

  @ApiPropertyOptional({ example: 38 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  depth?: number;
}
