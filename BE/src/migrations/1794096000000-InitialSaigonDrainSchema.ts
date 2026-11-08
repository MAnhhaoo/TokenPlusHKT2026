import { MigrationInterface, QueryRunner } from "typeorm";

/** Baseline schema for the eight entities currently registered by the API. */
export class InitialSaigonDrainSchema1794096000000 implements MigrationInterface {
  name = "InitialSaigonDrainSchema1794096000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "area_alerts" (
        "id" varchar(32) NOT NULL,
        "area" varchar NOT NULL,
        "level" varchar(32) NOT NULL,
        "hazardType" varchar NOT NULL,
        "title" varchar NOT NULL,
        "message" text NOT NULL,
        "startedAt" varchar NOT NULL,
        "expiresAt" varchar NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'active',
        "channels" text NOT NULL,
        "createdBy" varchar NOT NULL DEFAULT 'Nguyễn Minh',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_area_alerts_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trend_series" (
        "rangeKey" varchar(16) NOT NULL,
        "labels" text NOT NULL,
        "reports" text NOT NULL,
        "rain" text NOT NULL,
        "insight" text NOT NULL,
        CONSTRAINT "PK_trend_series_rangeKey" PRIMARY KEY ("rangeKey")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "forecast_slots" (
        "id" varchar(16) NOT NULL,
        "label" varchar NOT NULL,
        "rain" varchar NOT NULL,
        "rainMm" double precision NOT NULL DEFAULT 0,
        "risk" varchar NOT NULL,
        "zone" integer NOT NULL DEFAULT 0,
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_forecast_slots_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "route_options" (
        "id" varchar(32) NOT NULL,
        "name" varchar NOT NULL,
        "time" varchar NOT NULL,
        "distance" varchar NOT NULL,
        "badge" varchar NOT NULL,
        "detail" text NOT NULL,
        "waypoints" text NOT NULL,
        "navigationSteps" text NOT NULL,
        CONSTRAINT "PK_route_options_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "map_points" (
        "id" varchar(32) NOT NULL,
        "x" double precision NOT NULL,
        "y" double precision NOT NULL,
        "lat" double precision NOT NULL DEFAULT 10.7769,
        "lng" double precision NOT NULL DEFAULT 106.7009,
        "elevationM" double precision NOT NULL DEFAULT 3.0,
        "type" varchar(32) NOT NULL,
        "severity" varchar(32) NOT NULL,
        "label" varchar NOT NULL,
        "district" varchar NOT NULL,
        "rainfall" double precision NOT NULL DEFAULT 0,
        "depth" integer NOT NULL DEFAULT 0,
        "historyCount" integer NOT NULL DEFAULT 0,
        "linkedReportId" varchar(32),
        "estimateddurationmin" integer,
        "estimatedclearat" varchar(64),
        "drainageratecmpermin" double precision,
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_map_points_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "flood_reports" (
        "id" varchar(32) NOT NULL,
        "location" varchar NOT NULL,
        "district" varchar NOT NULL,
        "reportedAt" varchar NOT NULL,
        "minutesAgo" integer NOT NULL DEFAULT 1,
        "description" text NOT NULL,
        "reportType" varchar(16) NOT NULL DEFAULT 'flood',
        "reportedDepth" integer NOT NULL,
        "aiDepth" integer NOT NULL,
        "aiConfidence" integer NOT NULL,
        "severity" varchar(16) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "rejectReason" varchar,
        "priority" varchar NOT NULL,
        "coordinates" varchar NOT NULL,
        "historyCount" integer NOT NULL DEFAULT 1,
        "visual" varchar(16) NOT NULL DEFAULT 'street',
        "photoUrl" text,
        "reporterId" varchar(32),
        "aiSummary" text,
        "recommendation" text,
        "estimateddurationmin" integer,
        "estimatedclearat" varchar(64),
        "drainageratecmpermin" double precision,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_flood_reports_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "community_users" (
        "id" varchar(32) NOT NULL,
        "name" varchar NOT NULL,
        "initials" varchar(8) NOT NULL,
        "phone" varchar NOT NULL,
        "email" varchar NOT NULL,
        "district" varchar NOT NULL,
        "joinedAt" varchar NOT NULL,
        "lastActive" varchar NOT NULL,
        "reports" integer NOT NULL DEFAULT 0,
        "verifiedReports" integer NOT NULL DEFAULT 0,
        "rejectedReports" integer NOT NULL DEFAULT 0,
        "trustScore" integer NOT NULL DEFAULT 80,
        "status" varchar(16) NOT NULL DEFAULT 'active',
        "identityVerified" boolean NOT NULL DEFAULT false,
        "warnings" integer NOT NULL DEFAULT 0,
        "passwordHash" varchar(255),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_community_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "weather_snapshots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider" varchar NOT NULL DEFAULT 'open-meteo',
        "locationName" varchar NOT NULL DEFAULT 'TP. Hồ Chí Minh',
        "lat" double precision NOT NULL,
        "lng" double precision NOT NULL,
        "elevationM" double precision NOT NULL DEFAULT 4.5,
        "temperatureC" double precision NOT NULL,
        "humidityPercent" integer NOT NULL,
        "windSpeedKmh" double precision NOT NULL,
        "currentRainMm" double precision NOT NULL,
        "weatherCondition" varchar DEFAULT 'Mưa rào',
        "floodRiskLevel" varchar DEFAULT 'Thấp',
        "hourlyForecast" text,
        "fetchedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_weather_snapshots_id" PRIMARY KEY ("id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "weather_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "community_users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "flood_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "map_points"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "route_options"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "forecast_slots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trend_series"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "area_alerts"`);
  }
}
