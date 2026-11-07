import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

export interface HourlyWeatherItem {
  time: string;
  rainMm: number;
  precipitationProbability: number;
  temperatureC: number;
}

@Entity("weather_snapshots")
export class WeatherSnapshotEntity {
  @ApiProperty({ example: "c56a4180-65aa-42ec-a945-5fd21dec0538" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ example: "open-meteo" })
  @Column({ default: "open-meteo" })
  provider: string;

  @ApiProperty({ example: "TP. Hồ Chí Minh" })
  @Column({ default: "TP. Hồ Chí Minh" })
  locationName: string;

  @ApiProperty({ example: 10.7769 })
  @Column({ type: "float" })
  lat: number;

  @ApiProperty({ example: 106.7009 })
  @Column({ type: "float" })
  lng: number;

  @ApiProperty({ example: 4.5 })
  @Column({ type: "float", default: 4.5 })
  elevationM: number;

  @ApiProperty({ example: 28.4 })
  @Column({ type: "float" })
  temperatureC: number;

  @ApiProperty({ example: 84 })
  @Column({ type: "int" })
  humidityPercent: number;

  @ApiProperty({ example: 14.2 })
  @Column({ type: "float" })
  windSpeedKmh: number;

  @ApiProperty({ example: 18.5 })
  @Column({ type: "float" })
  currentRainMm: number;

  @ApiProperty({ example: "Mưa rào" })
  @Column({ nullable: true, default: "Mưa rào" })
  weatherCondition: string;

  @ApiProperty({
    example: "Cao",
    enum: ["Thấp", "Trung bình", "Cao", "Rất cao"],
  })
  @Column({ nullable: true, default: "Thấp" })
  floodRiskLevel: "Thấp" | "Trung bình" | "Cao" | "Rất cao";

  @ApiProperty({ type: "array", isArray: true })
  @Column({ type: "simple-json", nullable: true })
  hourlyForecast: HourlyWeatherItem[];

  @ApiProperty()
  @CreateDateColumn()
  fetchedAt: Date;
}
