import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RejectReportDto {
  @ApiPropertyOptional({
    example: "Ảnh mờ không rõ hiện trường ngập",
    description: "Lý do từ chối báo cáo",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
