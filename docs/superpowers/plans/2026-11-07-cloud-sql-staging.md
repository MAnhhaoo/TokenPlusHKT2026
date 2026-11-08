# Cloud SQL staging connection implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the NestJS Cloud Run API to the environment-specific Cloud SQL PostgreSQL instance without storing database passwords in GitHub.

**Architecture:** Cloud Run attaches Cloud SQL and connects through the Unix socket at `/cloudsql/<connection-name>`. GitHub Actions references a Secret Manager version for `DB_PASSWORD`; the Cloud Run runtime service account gets Cloud SQL Client and secret accessor permissions. The gifted trial instance is staging-only; production must use separate resources.

**Tech Stack:** GitHub Actions, `google-github-actions/deploy-cloudrun@v3`, Cloud Run, Cloud SQL for PostgreSQL, Secret Manager, NestJS TypeORM.

**Spec:** `docs/superpowers/specs/2026-11-07-google-cloud-cicd-design.md` and `docs/deployment/google-cloud-cicd.md`.

## Global Constraints

- Do not store database passwords in the repository or GitHub workflow variables.
- Keep Cloud Run private by default.
- Never configure the staging trial database as production.
- Keep TypeORM schema synchronization enabled only for the empty staging trial until a migration workflow replaces it.

## Review Focus

- A changed BE deploy fails preflight when Cloud SQL or secret configuration is missing.
- Cloud Run's `DB_HOST` points to the attached Unix socket, not the instance public IP.
- The runtime service account can access the SQL instance and only the needed Secret Manager secret.
- Production uses its own SQL connection and password secret.
- `DB_SYNCHRONIZE` is explicit per environment and never silently defaults to `true` for production.

---

### Task 1: Attach environment-specific Cloud SQL configuration to API deploys

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `docs/deployment/google-cloud-cicd.md`
- Modify: `docs/superpowers/specs/2026-11-07-google-cloud-cicd-design.md`

**Interfaces:**
- Consumes GitHub Environment variables `GCP_SQL_INSTANCE_CONNECTION_NAME`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD_SECRET_NAME`, and `DB_SYNCHRONIZE`.
- Produces Cloud Run `DB_*` configuration, a Cloud SQL attachment, and a Secret Manager reference for `DB_PASSWORD`.

- [x] Validate required database variables before an API deployment.
- [x] Configure staging and production API deploys with per-environment Cloud SQL and Secret Manager values.
- [x] Document the staging values, required Google Cloud APIs, runtime IAM roles, and secret creation steps.
- [x] Parse the workflow YAML, run `git diff --check`, and inspect the final diff; do not deploy cloud resources from this change.
