# Cloud Run Health Check Implementation Plan

> **For agentic workers:** Follow the Superpowers execution workflow. Steps use checkbox syntax for tracking.

**Goal:** Expose a lightweight `/health` endpoint with a deployed revision identifier and verify it during public Cloud Run deployments.

**Architecture:** Add a small NestJS health module outside the global `/api` prefix. Extend the deployment workflow to validate its HTTP response and JSON contract for staging and public production API deployments.

**Tech Stack:** NestJS 11, TypeScript, GitHub Actions, Bash, curl, jq.

**Spec:** `docs/PRD.md` — API health requirements at `/health`.

## Global Constraints

- Keep this as a liveness endpoint; do not make database connectivity a prerequisite for HTTP 200.
- Do not change GCP resources, branch protection, environment configuration, or trigger production deployment.
- Preserve the existing `/api` prefix for application routes.

## Review Focus

- `/health` must remain outside `/api` while other routes keep their current prefix.
- The endpoint must return a non-empty version identifier in Cloud Run and locally.
- CI must fail clearly when a deployed public API does not return the expected health response.

---

### Task 1: Add the health endpoint

**Files:**
- Create: `BE/src/modules/health/health.controller.ts`
- Create: `BE/src/modules/health/health.module.ts`
- Modify: `BE/src/app.module.ts`
- Modify: `BE/src/main.ts`

- [x] Register a GET `/health` controller and expose it outside the global `api` prefix.
- [x] Return `status: "ok"` and Cloud Run revision (or `local` outside Cloud Run).

### Task 2: Verify deployed API health

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [x] Validate status 200 and the health JSON contract after staging deployment.
- [x] Add the same smoke check after public production API deployment; do not alter production triggers.
- [x] Run the backend build and inspect the final diff. Backend build, typecheck, Prettier, workflow YAML parsing, and `git diff --check` passed.
