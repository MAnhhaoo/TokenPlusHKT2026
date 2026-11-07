import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class QueryWeatherDto {
  @ApiPropertyOptional({
    example: 10.7769,
    description: "Vĩ độ (Latitude) tại TP.HCM",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({
    example: 106.7009,
    description: "Kinh độ (Longitude) tại TP.HCM",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({
    example: "TP. Hồ Chí Minh",
    description: "Tên khu vực/quận",
  })
  @IsOptional()
  @IsString()
  locationName?: string;
}
