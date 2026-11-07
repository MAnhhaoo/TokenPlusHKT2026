import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

export type UserStatus = "active" | "review" | "blocked";

@Entity("community_users")
export class CommunityUserEntity {
  @ApiProperty({ example: "USR-1048" })
  @PrimaryColumn({ type: "varchar", length: 32 })
  id: string;

  @ApiProperty({ example: "Trần Hoàng Anh" })
  @Column()
  name: string;

  @ApiProperty({ example: "TA" })
  @Column({ type: "varchar", length: 8 })
  initials: string;

  @ApiProperty({ example: "0903 482 615" })
  @Column()
  phone: string;

  @ApiProperty({ example: "hoanganh.tran@email.vn" })
  @Column()
  email: string;

  @ApiProperty({ example: "Bình Thạnh" })
  @Column()
  district: string;

  @ApiProperty({ example: "12/01/2025" })
  @Column()
  joinedAt: string;

  @ApiProperty({ example: "2 phút trước" })
  @Column()
  lastActive: string;

  @ApiProperty({ example: 28 })
  @Column({ type: "int", default: 0 })
  reports: number;

  @ApiProperty({ example: 25 })
  @Column({ type: "int", default: 0 })
  verifiedReports: number;

  @ApiProperty({ example: 1 })
  @Column({ type: "int", default: 0 })
  rejectedReports: number;

  @ApiProperty({ example: 96 })
  @Column({ type: "int", default: 80 })
  trustScore: number;

  @ApiProperty({ example: "active", enum: ["active", "review", "blocked"] })
  @Column({ type: "varchar", length: 16, default: "active" })
  status: UserStatus;

  @ApiProperty({ example: true })
  @Column({ type: "boolean", default: false })
  identityVerified: boolean;

  @ApiProperty({ example: 0 })
  @Column({ type: "int", default: 0 })
  warnings: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  passwordHash?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
