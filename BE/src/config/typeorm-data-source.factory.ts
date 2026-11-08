import { TypeOrmDataSourceFactory } from "@nestjs/typeorm";
import { DataSource, DataSourceOptions } from "typeorm";

const MIGRATION_LOCK_KEY = "saigondrain:typeorm:migrations";

/**
 * Initialize the datasource and serialize pending PostgreSQL migrations across
 * Cloud Run instances before Nest starts serving requests.
 */
export const createTypeOrmDataSource: TypeOrmDataSourceFactory = async (
  options,
) => {
  if (!options) {
    throw new Error("TypeORM datasource options are required.");
  }

  const migrationsRun = options.migrationsRun === true;
  const dataSource = new DataSource({
    ...options,
    migrationsRun: false,
  } as DataSourceOptions);

  try {
    await dataSource.initialize();

    if (!migrationsRun) {
      return dataSource;
    }
    if (options.type !== "postgres") {
      throw new Error("Serialized startup migrations require PostgreSQL.");
    }

    const lockRunner = dataSource.createQueryRunner();
    await lockRunner.connect();
    let lockAcquired = false;

    try {
      await lockRunner.query("SELECT pg_advisory_lock(hashtext($1)::bigint)", [
        MIGRATION_LOCK_KEY,
      ]);
      lockAcquired = true;
      await dataSource.runMigrations({
        transaction: dataSource.options.migrationsTransactionMode,
      });
    } finally {
      try {
        if (lockAcquired) {
          await lockRunner.query(
            "SELECT pg_advisory_unlock(hashtext($1)::bigint)",
            [MIGRATION_LOCK_KEY],
          );
        }
      } finally {
        await lockRunner.release();
      }
    }

    return dataSource;
  } catch (error) {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    throw error;
  }
};
