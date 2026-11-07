import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

export type AlertLevel = "Theo dõi" | "Cảnh báo" | "Nghiêm trọng";
export type AlertStatus = "active" | "ended";

@Entity("area_alerts")
export class AreaAlertEntity {
  @ApiProperty({ example: "AL-0189" })
  @PrimaryColumn({ type: "varchar", length: 32 })
  id: string;

  @ApiProperty({ example: "Nguyễn Hữu Cảnh, Bình Thạnh" })
  @Column()
  area: string;

  @ApiProperty({
    example: "Nghiêm trọng",
    enum: ["Theo dõi", "Cảnh báo", "Nghiêm trọng"],
  })
  @Column({ type: "varchar", length: 32 })
  level: AlertLevel;

  @ApiProperty({ example: "Ngập đường" })
  @Column()
  hazardType: string;

  @ApiProperty({ example: "Ngập sâu, hạn chế di chuyển" })
  @Column()
  title: string;

  @ApiProperty({
    example: "Mực nước đang vượt 40 cm. Người dân tránh lưu thông qua khu vực.",
  })
  @Column({ type: "text" })
  message: string;

  @ApiProperty({ example: "17:48" })
  @Column()
  startedAt: string;

  @ApiProperty({ example: "20:30" })
  @Column()
  expiresAt: string;

  @ApiProperty({ example: "active", enum: ["active", "ended"] })
  @Column({ type: "varchar", length: 16, default: "active" })
  status: AlertStatus;

  @ApiProperty({ example: ["Web", "Push", "Trung tâm điều hành"] })
  @Column({ type: "simple-json" })
  channels: string[];

  @ApiProperty({ example: "Nguyễn Minh" })
  @Column({ default: "Nguyễn Minh" })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
