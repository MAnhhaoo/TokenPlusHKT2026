import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class SearchGeocodeDto {
  @ApiProperty({
    example: "Nguyễn Hữu Cảnh, Bình Thạnh",
    description: "Từ khóa địa điểm cần tìm tại TP.HCM",
  })
  @IsString()
  q: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class ReverseGeocodeDto {
  @ApiProperty({ example: 10.7790693 })
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 106.6836363 })
  @Type(() => Number)
  @IsNumber()
  lng: number;
}
