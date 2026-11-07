import { Entity, PrimaryColumn, Column } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

@Entity("forecast_slots")
export class ForecastSlotEntity {
  @ApiProperty({
    example: "30",
    description: "ID mốc thời gian: now | 30 | 60 | 90",
  })
  @PrimaryColumn({ type: "varchar", length: 16 })
  id: string;

  @ApiProperty({ example: "+30 phút" })
  @Column()
  label: string;

  @ApiProperty({ example: "34 mm" })
  @Column()
  rain: string;

  @ApiProperty({ example: 34 })
  @Column({ type: "float", default: 0 })
  rainMm: number;

  @ApiProperty({ example: "Cao" })
  @Column()
  risk: string;

  @ApiProperty({
    example: 1,
    description: "0: An toàn, 1: Cảnh báo, 2: Nguy hiểm",
  })
  @Column({ type: "int", default: 0 })
  zone: number;

  @ApiProperty({ example: 1 })
  @Column({ type: "int", default: 0 })
  sortOrder: number;
}
