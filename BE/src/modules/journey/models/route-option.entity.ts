import { Entity, PrimaryColumn, Column } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

export interface NavigationStepItem {
  icon: "turn-left" | "turn-right" | "straight";
  instruction: string;
  street: string;
  distance: string;
}

@Entity("route_options")
export class RouteOptionEntity {
  @ApiProperty({ example: "safe", enum: ["safe", "balanced"] })
  @PrimaryColumn({ type: "varchar", length: 32 })
  id: "safe" | "balanced";

  @ApiProperty({ example: "Tuyến đề xuất" })
  @Column()
  name: string;

  @ApiProperty({ example: "12 phút" })
  @Column()
  time: string;

  @ApiProperty({ example: "3,4 km" })
  @Column()
  distance: string;

  @ApiProperty({ example: "Nhanh nhất" })
  @Column()
  badge: string;

  @ApiProperty({
    example:
      "Đi theo Võ Thị Sáu, Đường 3 Tháng 2 và Nguyễn Văn Cừ để đến cơ sở chính.",
  })
  @Column({ type: "text" })
  detail: string;

  @ApiProperty({ type: "array", isArray: true })
  @Column({ type: "simple-json" })
  waypoints: number[][];

  @ApiProperty({ type: "array", isArray: true })
  @Column({ type: "simple-json" })
  navigationSteps: NavigationStepItem[];
}
