import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsIn, IsOptional, IsString } from "class-validator";
import { AlertLevel } from "../models/area-alert.entity";

export class UpdateAlertDto {
  @ApiPropertyOptional({ example: "Nguyễn Hữu Cảnh, Bình Thạnh" })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ enum: ["Theo dõi", "Cảnh báo", "Nghiêm trọng"] })
  @IsOptional()
  @IsIn(["Theo dõi", "Cảnh báo", "Nghiêm trọng"])
  level?: AlertLevel;

  @ApiPropertyOptional({ example: "Ngập đường" })
  @IsOptional()
  @IsString()
  hazardType?: string;

  @ApiPropertyOptional({ example: "Ngập sâu, hạn chế di chuyển" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: "Mực nước vượt 40 cm, lực lượng thoát nước đang xử lý.",
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ example: "21:30" })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: ["Web", "Push"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];
}
