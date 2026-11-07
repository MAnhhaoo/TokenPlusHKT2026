import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

export type ReportSeverity = "critical" | "high" | "medium" | "low";
export type ReportStatus = "pending" | "verified" | "rejected";
export type ReportType = "flood" | "drain";
export type ReportVisual = "street" | "drain" | "night" | "traffic";

@Entity("flood_reports")
export class FloodReportEntity {
  @ApiProperty({ example: "RP-2418" })
  @PrimaryColumn({ type: "varchar", length: 32 })
  id: string;

  @ApiProperty({ example: "Đường Nguyễn Văn Quá" })
  @Column()
  location: string;

  @ApiProperty({ example: "Quận 12" })
  @Column()
  district: string;

  @ApiProperty({ example: "18:42, 24/05/2025" })
  @Column()
  reportedAt: string;

  @ApiProperty({ example: 6 })
  @Column({ type: "int", default: 1 })
  minutesAgo: number;

  @ApiProperty({
    example:
      "Nước lên nhanh, đã tràn hơn nửa bánh xe máy. Giao thông bắt đầu ùn.",
  })
  @Column({ type: "text" })
  description: string;

  @ApiProperty({ example: "flood", enum: ["flood", "drain"] })
  @Column({ type: "varchar", length: 16, default: "flood" })
  reportType: ReportType;

  @ApiProperty({ example: 35 })
  @Column({ type: "int" })
  reportedDepth: number;

  @ApiProperty({ example: 32 })
  @Column({ type: "int" })
  aiDepth: number;

  @ApiProperty({ example: 94 })
  @Column({ type: "int" })
  aiConfidence: number;

  @ApiProperty({
    example: "critical",
    enum: ["critical", "high", "medium", "low"],
  })
  @Column({ type: "varchar", length: 16 })
  severity: ReportSeverity;

  @ApiProperty({
    example: "pending",
    enum: ["pending", "verified", "rejected"],
  })
  @Column({ type: "varchar", length: 16, default: "pending" })
  status: ReportStatus;

  @ApiProperty({ required: false })
  @Column({ type: "varchar", nullable: true })
  rejectReason?: string;

  @ApiProperty({ example: "Trục đường chính" })
  @Column()
  priority: string;

  @ApiProperty({ example: "10.8381, 106.6304" })
  @Column()
  coordinates: string;

  @ApiProperty({ example: 12 })
  @Column({ type: "int", default: 1 })
  historyCount: number;

  @ApiProperty({
    example: "traffic",
    enum: ["street", "drain", "night", "traffic"],
  })
  @Column({ type: "varchar", length: 16, default: "street" })
  visual: ReportVisual;

  @ApiProperty({ required: false })
  @Column({ type: "text", nullable: true })
  photoUrl?: string;

  @ApiProperty({ required: false, example: "USR-1048" })
  @Column({ type: "varchar", length: 32, nullable: true })
  reporterId?: string;

  @ApiProperty({
    required: false,
    example: "Hệ thống AI Gemini phát hiện ngập sâu ~32 cm tại làn xe máy.",
  })
  @Column({ type: "text", nullable: true })
  aiSummary?: string;

  @ApiProperty({
    required: false,
    example:
      "Xe máy nên chuyển sang làn giữa tim đường hoặc chọn lộ trình thay thế.",
  })
  @Column({ type: "text", nullable: true })
  recommendation?: string;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
