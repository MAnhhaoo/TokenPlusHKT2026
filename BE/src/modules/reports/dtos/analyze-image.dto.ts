import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class AnalyzeImageDto {
  @ApiProperty({
    example: "data:image/jpeg;base64,...",
    description: "Chuỗi Base64 Data URL của ảnh hiện trường do người dân chụp",
  })
  @IsNotEmpty()
  @IsString()
  image: string;

  @ApiPropertyOptional({
    example: "Nguyễn Hữu Cảnh, Bình Thạnh",
    description: "Tên địa điểm hoặc vị trí báo cáo (nếu đã chọn)",
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    example: "Nước ngập nửa bánh xe, cống đang ứ đọng rác",
    description: "Mô tả ngắn của người dân",
  })
  @IsOptional()
  @IsString()
  description?: string;
}
