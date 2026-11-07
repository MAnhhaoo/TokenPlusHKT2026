import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class ComputeRouteDto {
  @ApiPropertyOptional({
    example: 10.7790693,
    description: "Vĩ độ điểm xuất phát (Mặc định: Cơ sở 1 ĐH Sài Gòn)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fromLat?: number;

  @ApiPropertyOptional({
    example: 106.6836363,
    description: "Kinh độ điểm xuất phát (Mặc định: Cơ sở 1 ĐH Sài Gòn)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fromLng?: number;

  @ApiPropertyOptional({
    example: 10.7597031,
    description: "Vĩ độ điểm đích (Mặc định: Cơ sở chính ĐH Sài Gòn)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  toLat?: number;

  @ApiPropertyOptional({
    example: 106.6817595,
    description: "Kinh độ điểm đích (Mặc định: Cơ sở chính ĐH Sài Gòn)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  toLng?: number;

  @ApiPropertyOptional({
    example: "motorcycle",
    description:
      "Loại phương tiện: motorcycle (xe máy - hỗ trợ luồn lách qua hẻm) hoặc car (ô tô)",
  })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({
    example: "motorcycle",
  })
  @IsOptional()
  @IsString()
  vehicleType?: string;
}
