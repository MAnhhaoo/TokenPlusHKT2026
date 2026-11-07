# Google Cloud CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the new repository for real CI checks and staged/production deployment to Google Cloud as application code is migrated from SaigonDrain.

**Architecture:** GitHub Actions runs checks only for migrated application paths. Cloud Run hosts the API and any HTTP ML inference service; Firebase Hosting serves the user and admin frontends. GitHub Actions authenticates through Workload Identity Federation, with environment-specific staging and production settings.

**Tech Stack:** GitHub Actions, Node.js 22, npm for the existing standalone admin app, pnpm 12.15.0 for future workspaces, Python 3.12 with uv, Google Cloud Run, Firebase Hosting, Workload Identity Federation.

**Spec:** `docs/superpowers/specs/2026-11-07-google-cloud-cicd-design.md`

## Global Constraints

- The target repository's default branch is `master`.
- The current repository has a standalone npm admin package and lowercase `ml/` package; `BE/` and `FE/user/` remain placeholders. CI must not report an empty/no-op run as application validation.
- Map migrated code to `BE/`, `FE/user/`, `FE/admin/`, and the existing `ml/` package; recognize `ML/` as a migration alias on Linux runners.
- Use Workload Identity Federation; do not commit service-account keys or runtime secrets.
- Do not create Google Cloud resources or migrate the full application in this workflow-foundation change.
- Keep production deployment behind the `production` GitHub Environment; the repository owner configures required reviewers and cloud variables.

## Review Focus

- A workflow-only PR must not imply application source changed; it should run regression checks for migrated packages already present in the merge commit.
- A changed component missing its package manifest or matching npm/pnpm/uv lockfile must produce an actionable failure.
- Missing GCP/Firebase configuration must be visible as deploy-not-configured; it must never be reported as a successful deployment.
- Fork pull requests must not receive Google Cloud credentials or deploy privileges.
- User/admin frontends must build to the Firebase Hosting directories declared in `firebase.json`.

---

## File Layout

- Create `.github/workflows/ci.yml` for PR checks and reusable full validation.
- Create `.github/workflows/deploy.yml` to publish trusted Firebase PR previews, call full validation on `master`/release, then deploy staging and release-gated production.
- Create `firebase.json` for the two Hosting targets and their build directories.
- Create `.gitignore` entries for generated Workload Identity credential files and environment-specific Firebase mappings.
- Create `docs/deployment/google-cloud-cicd.md` for Google Cloud, GitHub Environment, WIF, Firebase target, and activation setup.

### Task 1: CI for Migrated Packages

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes the existing or migrated package manifests and lockfiles in `BE/`, `FE/user/`, `FE/admin/`, `ml/`, and `ML/`.
- Produces a required PR check that runs package build, typecheck, lint/style checks, and tests when the relevant package exists; changed packages missing both supported script forms or their lockfile fail with a clear message.

- [x] Add a pull-request trigger scoped to application/workflow paths, a reusable `workflow_call` full-validation mode for master/release deploys, and `workflow_dispatch` without treating an empty repository as tested.
- [x] Add Node checks using Node 22 and either a package-local npm lockfile or pnpm 12.15.0 workspace lockfile; run build/typecheck, lint or format check, and test or smoke test.
- [x] Add Python checks using Python 3.12 on Ubuntu and Windows with `uv lock --check`, `uv sync --locked --group dev`, Ruff lint/format checks, and pytest when `ml/` or `ML/` contains a package.
- [x] Fail the preflight when a changed application component has no runnable manifest or required lockfile; report absent optional components as not migrated.
- [x] Validate workflow YAML with `actionlint` and verify merge-base detection plus full regression validation when a workflow-only PR targets a branch that advanced with migrated packages.

### Task 2: Google Cloud Deployment Foundation

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `.gitignore`
- Create: `firebase.json`
- Create: `docs/deployment/google-cloud-cicd.md`

**Interfaces:**
- Consumes GitHub Environment variables for project ID, region, WIF provider, deploy service account, and Firebase site IDs.
- Produces Cloud Run deployment for migrated API/serving ML packages and Firebase Hosting deploys for `FE/user` and `FE/admin`; production uses the `production` GitHub Environment.

- [x] Define Firebase Hosting targets `user` and `admin` with public directories `FE/user/dist` and `FE/admin/dist`.
- [x] Configure staging after successful reusable CI on merge to `master`, production on a published release after staging and the protected environment gate, and Firebase PR preview from the trusted deploy workflow after CI succeeds.
- [x] Take the PR number from the trusted `workflow_run` payload; validate artifact frontend flags as JSON booleans, reject symbolic links, and never execute downloaded artifact contents in the trusted workflow.
- [x] Authenticate with `google-github-actions/auth@v3` and Workload Identity Federation; grant `contents: read` and `id-token: write` to deploy jobs, with `actions: read` only on the trusted preview jobs that download CI artifacts.
- [x] Deploy the API to Cloud Run from `BE/`; deploy ML only when `ml/serving/Dockerfile` or `ML/serving/Dockerfile` exists. Do not deploy training notebooks or datasets.
- [x] Document the required Google APIs, WIF provider/service-account roles, GitHub Environment variables, Firebase site targets, and the manual owner-side environment protection step.
- [x] Validate workflow YAML with `actionlint`, parse `firebase.json`, inspect permission scopes, and confirm deployment cannot run from fork PRs.

---
