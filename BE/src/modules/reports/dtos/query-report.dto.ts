import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { ReportSeverity, ReportStatus } from "../models/flood-report.entity";

export class QueryReportDto {
  @ApiPropertyOptional({
    enum: ["pending", "verified", "rejected"],
  })
  @IsOptional()
  @IsIn(["pending", "verified", "rejected"])
  status?: ReportStatus;

  @ApiPropertyOptional({
    enum: ["critical", "high", "medium", "low"],
  })
  @IsOptional()
  @IsIn(["critical", "high", "medium", "low"])
  severity?: ReportSeverity;

  @ApiPropertyOptional({ example: "Quận 12" })
  @IsOptional()
  @IsString()
  district?: string;
}
