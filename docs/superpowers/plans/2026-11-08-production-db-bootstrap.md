# Production Database Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the API able to initialize a new production PostgreSQL schema safely and allow the production Firebase site through CORS.

**Architecture:** Keep NestJS and TypeORM. Add one baseline migration for registered entities, run migrations when synchronization is disabled, and pass the production CORS origin through the existing Cloud Run deployment workflow.

**Tech Stack:** NestJS 11, TypeORM 0.3, PostgreSQL 18, GitHub Actions, Cloud Run.

**Spec:** `docs/superpowers/specs/2026-11-08-production-db-bootstrap-design.md`

## Global Constraints

- Production must use `DB_SYNCHRONIZE=false`.
- Staging currently uses `DB_SYNCHRONIZE=true`; preserve that behavior.
- Do not use the staging Cloud SQL trial instance or staging password secret for production.
- Do not publish a release or deploy production as part of this code change.
- Do not add or run tests unless the user asks; perform static/type checks only.

## Review Focus

- Empty production schema: migration creates every registered entity table.
- Existing synchronized schema: baseline migration does not drop or replace existing tables.
- Production CORS configuration: the site origin reaches Cloud Run and is required when deploying BE.
- Compiled runtime path: migration discovery works from the built `dist` layout.
- Production secret/database values remain external to source control.

---

### Task 1: Baseline TypeORM migration

**Files:**
- Create: `BE/src/migrations/1794096000000-InitialSaigonDrainSchema.ts`
- Modify: `BE/src/config/typeorm.config.ts`

**Interfaces:**
- Consumes: the eight existing TypeORM entities registered by their Nest modules.
- Produces: a migration that creates their PostgreSQL tables and a TypeORM options object that runs migrations when synchronization is disabled.

- [x] Add a TypeORM migration with idempotent `CREATE TABLE IF NOT EXISTS` statements for `area_alerts`, `trend_series`, `forecast_slots`, `route_options`, `map_points`, `flood_reports`, `community_users`, and `weather_snapshots`.
- [x] Configure migration discovery for both `src` (`.ts`) and compiled `dist` (`.js`) paths.
- [x] Set `migrationsRun` to true only when `DB_SYNCHRONIZE` is false; keep current staging behavior.
- [x] Make `down` drop the baseline tables in reverse creation order.

### Task 2: Production CORS deployment wiring

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: production environment variable `CORS_ORIGINS`.
- Produces: a production Cloud Run revision configured to allow the production Firebase site.

- [x] Require `CORS_ORIGINS` when the production backend changes.
- [x] Include `CORS_ORIGINS` in the production Cloud Run environment variables.

### Task 3: Static verification

**Files:**
- Review the diff for the files above.

- [x] Run the BE TypeScript compiler (`tsc --noEmit -p BE/tsconfig.json`) and confirm it succeeds. The local pnpm shim could not launch in this Windows shell.
- [x] Run `git diff --check` and confirm it reports no whitespace errors.
- [x] Do not create Cloud SQL, trigger a release, or deploy production as part of this code change.
