import { Entity, PrimaryColumn, Column } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

@Entity("trend_series")
export class TrendSeriesEntity {
  @ApiProperty({ example: "24h", enum: ["24h", "7d", "30d"] })
  @PrimaryColumn({ type: "varchar", length: 16 })
  rangeKey: "24h" | "7d" | "30d";

  @ApiProperty({
    example: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
  })
  @Column({ type: "simple-json" })
  labels: string[];

  @ApiProperty({ example: [5, 3, 8, 12, 25, 17] })
  @Column({ type: "simple-json" })
  reports: number[];

  @ApiProperty({ example: [14, 9, 18, 27, 61, 44] })
  @Column({ type: "simple-json" })
  rain: number[];

  @ApiProperty({ example: "Đỉnh báo cáo trùng thời điểm mưa lớn lúc 17:30." })
  @Column({ type: "text" })
  insight: string;
}
