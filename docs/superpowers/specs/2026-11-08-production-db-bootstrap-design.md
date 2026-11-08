# Production Database Bootstrap Design

## Intent

Allow the NestJS API to start against a new production PostgreSQL database with `DB_SYNCHRONIZE=false`, while allowing the production Firebase site to call the API.

## Goals

- Create the current TypeORM entity schema through a versioned migration.
- Run pending migrations when the API connects with synchronization disabled.
- Serialize pending migrations across concurrent Cloud Run starts with a PostgreSQL advisory lock.
- Pass and validate the production `CORS_ORIGINS` value in the Cloud Run deployment.
- Keep the existing staging synchronization behavior unchanged.

## Non-goals

- Create or upgrade Cloud SQL resources.
- Publish a GitHub release or deploy production.
- Change existing entity fields or seed production data.

## Approaches

- **TypeORM baseline migration (recommended):** records the entity schema in the repository and runs it through TypeORM when production synchronization is disabled. This follows the existing NestJS/TypeORM stack and gives future schema changes a migration path.
- **Enable synchronization in production:** rejected because the deployment workflow intentionally requires `DB_SYNCHRONIZE=false` and schema synchronization is not an appropriate production schema-management strategy.
- **Manually create schema in Cloud SQL Studio:** rejected as the primary approach because it leaves schema changes outside source control and makes later environments harder to reproduce.

## Design

- Add one baseline migration covering the eight currently registered entity tables.
- Configure TypeORM to load compiled and source migration files and run them only when `DB_SYNCHRONIZE` is false.
- Serialize migration history table creation and migration execution with a PostgreSQL advisory lock.
- Configure TypeORM UUID generation to use `gen_random_uuid()` so the migration default matches entity metadata.
- Make the baseline table creation idempotent so an existing staging schema created by synchronization is not destroyed if the migration is later enabled there.
- Require `CORS_ORIGINS` for production backend deployments and include it in Cloud Run environment variables.
- Keep the production service/site isolation in GitHub Environment variables (`saigondrain-api-prod` and `saigondrain-prod-2026-514007`).

## Constraints and risks

- Production database creation and billing are user-managed; the existing 30-day trial instance is not the production target.
- The runtime database user must be able to create tables in the target schema while the initial migration runs.
- This change does not run a production deploy. A fresh database still needs to be created and its password stored in Secret Manager before a release.
