import { Entity, PrimaryColumn, Column, UpdateDateColumn } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

export type MapPointType = "flood" | "pending" | "risk" | "sensor" | "history";
export type PointSeverity = "critical" | "high" | "medium";

@Entity("map_points")
export class MapPointEntity {
  @ApiProperty({ example: "p1" })
  @PrimaryColumn({ type: "varchar", length: 32 })
  id: string;

  @ApiProperty({ example: 60 })
  @Column({ type: "float" })
  x: number;

  @ApiProperty({ example: 42 })
  @Column({ type: "float" })
  y: number;

  @ApiProperty({ example: 10.7982 })
  @Column({ type: "float", default: 10.7769 })
  lat: number;

  @ApiProperty({ example: 106.7189 })
  @Column({ type: "float", default: 106.7009 })
  lng: number;

  @ApiProperty({ example: 1.8 })
  @Column({ type: "float", default: 3.0 })
  elevationM: number;

  @ApiProperty({
    example: "flood",
    enum: ["flood", "pending", "risk", "sensor"],
  })
  @Column({ type: "varchar", length: 32 })
  type: MapPointType;

  @ApiProperty({ example: "critical", enum: ["critical", "high", "medium"] })
  @Column({ type: "varchar", length: 32 })
  severity: PointSeverity;

  @ApiProperty({ example: "Nguyễn Hữu Cảnh" })
  @Column()
  label: string;

  @ApiProperty({ example: "Bình Thạnh" })
  @Column()
  district: string;

  @ApiProperty({ example: 82 })
  @Column({ type: "float", default: 0 })
  rainfall: number;

  @ApiProperty({ example: 45 })
  @Column({ type: "int", default: 0 })
  depth: number;

  @ApiProperty({ example: 21 })
  @Column({ type: "int", default: 0 })
  historyCount: number;

  @ApiProperty({ example: "RP-2418", required: false })
  @Column({ type: "varchar", length: 32, nullable: true })
  linkedReportId?: string;

  @ApiProperty({ required: false, example: 45 })
  @Column({ name: "estimateddurationmin", type: "int", nullable: true })
  estimatedDurationMin?: number;

  @ApiProperty({ required: false, example: "00:25, 08/11/2026" })
  @Column({
    name: "estimatedclearat",
    type: "varchar",
    length: 64,
    nullable: true,
  })
  estimatedClearAt?: string;

  @ApiProperty({ required: false, example: 0.65 })
  @Column({ name: "drainageratecmpermin", type: "float", nullable: true })
  drainageRateCmPerMin?: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
