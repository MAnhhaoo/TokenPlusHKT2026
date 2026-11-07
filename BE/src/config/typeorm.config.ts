import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { Logger } from "@nestjs/common";
import { Client } from "pg";

const logger = new Logger("TypeOrmConfig");

async function verifyAndEnsurePostgresDatabase(
  host: string,
  port: number,
  user: string,
  password: string,
  database: string,
): Promise<{ ok: boolean; reason?: string }> {
  const adminClient = new Client({
    host,
    port,
    user,
    password,
    database: "postgres",
    connectionTimeoutMillis: 3000,
  });

  try {
    await adminClient.connect();
    const res = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [database],
    );
    if (res.rowCount === 0) {
      logger.log(`Đang tự động tạo database PostgreSQL "${database}"...`);
      await adminClient.query(`CREATE DATABASE "${database}"`);
      logger.log(`Đã tạo database "${database}" thành công!`);
    }
    await adminClient.end();
    return { ok: true };
  } catch (err) {
    try {
      await adminClient.end();
    } catch {
      // ignore
    }
    return { ok: false, reason: (err as Error).message };
  }
}

export async function createTypeOrmOptions(
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> {
  const databaseUrl = configService.get<string>("DATABASE_URL");
  const synchronize =
    configService.get<string>("DB_SYNCHRONIZE", "true") === "true";

  if (databaseUrl) {
    const isCloud =
      databaseUrl.includes("neon") ||
      databaseUrl.includes("supabase") ||
      databaseUrl.includes("sslmode=require");
    logger.log("Đang kết nối PostgreSQL qua DATABASE_URL...");
    return {
      type: "postgres",
      url: databaseUrl,
      ssl: isCloud ? { rejectUnauthorized: false } : undefined,
      autoLoadEntities: true,
      synchronize,
    };
  }

  const host = configService.get<string>("DB_HOST", "localhost");
  const port = Number(configService.get<number>("DB_PORT", 5432));
  const username = configService.get<string>("DB_USERNAME", "postgres");
  const password = configService.get<string>("DB_PASSWORD", "postgres");
  const database = configService.get<string>("DB_DATABASE", "saigondrain");

  const check = await verifyAndEnsurePostgresDatabase(
    host,
    port,
    username,
    password,
    database,
  );
  if (check.ok) {
    logger.log(
      `Đã kết nối thành công tới PostgreSQL tại ${host}:${port}/${database}`,
    );
  } else {
    logger.error(
      `Không thể kết nối PostgreSQL tại ${host}:${port} (${check.reason}). Vui lòng kiểm tra cấu hình DB_PASSWORD trong .env!`,
    );
  }

  return {
    type: "postgres",
    host,
    port,
    username,
    password,
    database,
    autoLoadEntities: true,
    synchronize,
  };
}
