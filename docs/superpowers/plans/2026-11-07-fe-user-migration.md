# Frontend User Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Move the SaigonDrain User frontend into `FE/user` and preserve its local connection to the NestJS API on port 3000.

**Architecture:** Copy the committed application files from `frontend/user` while excluding the Android project and Vercel-specific config. Keep Vite's `/api` proxy pointed at `VITE_BACKEND_URL` or `http://localhost:3000`, and keep the frontend API base defaulting to `/api`. Add a build artifact smoke check and generate the missing root pnpm lockfile so the workspace can install reproducibly.

**Tech Stack:** React 19, TypeScript, Vite 8, MapLibre GL, Tailwind CSS 4, pnpm 12.15.0, Oxfmt 0.75.0.

**Spec:** `Trien_Khai_Phan_2_Thu_Tu_Cac_Buoc.docx` (Step 4), plus the user's approved Cloud Run API and Firebase Hosting frontend decision.

## Global Constraints

- Destination: `FE/user/`; source: `frontend/user/` on SaigonDrain `main`.
- Preserve the 17 existing User components, React 19, MapLibre GL, TypeScript checking, and Vite build.
- The development server must use port 5173 and proxy `/api` to `http://localhost:3000` by default.
- Do not copy `frontend/user/android/` in this step; keep the destination's Android scaffold for Step 6.
- Do not copy Vercel deployment config; the approved frontend host is Firebase Hosting.
- Do not overwrite existing root setup, PRD, admin frontend, or CI/CD configuration.
- Do not commit generated `node_modules/` or `dist/` output.
- Use Oxfmt 0.75.0 for the User package; 0.2.0 corrupts inline TypeScript object types when formatting.
- The backend code is currently in PR #11 (`long`); this PR contains the User frontend only and depends on the backend PR for runtime API availability.

## Review Focus

- A clean workspace install resolves the User package and existing workspace apps from the root pnpm lockfile.
- The production build emits `dist/index.html` and every referenced bundled asset.
- The development server stays on port 5173 and the `/api` proxy targets port 3000 by default.
- Existing `FE/user/android/` placeholder files remain untouched.
- Production API configuration continues to accept `VITE_API_BASE_URL` for the Cloud Run URL.

---

### Task 1: Migrate and validate the User frontend

**Files:**
- Create: `FE/user/tests/smoke.mjs`
- Copy: committed app files from `frontend/user/` to `FE/user/`, excluding `android/` and `vercel.json`
- Modify: `FE/user/package.json` to expose `test:smoke`
- Create: root `pnpm-lock.yaml`
- Create: this plan

**Interfaces:**
- Consumes: root workspace manifests, the Step 4 source app, and the NestJS API convention `/api` on port 3000.
- Produces: `@saigondrain/user` under `FE/user`, runnable via root `pnpm run dev:user` and buildable by the existing Firebase Hosting pipeline.

- [x] Write a smoke check that requires `dist/index.html` and verifies that each referenced `/assets/` file exists and is non-empty.
- [x] Run `node FE/user/tests/smoke.mjs` before copying the app; expect it to fail because the User build output does not exist yet.
- [x] Copy source app files, add the `test:smoke` package script, and use Oxfmt 0.75.0 for the User package.
- [x] Generate the root lockfile using pnpm 12.15.0.
- [x] Run `pnpm install --frozen-lockfile` from the repository root.
- [x] Run `pnpm --filter @saigondrain/user typecheck`, `pnpm --filter @saigondrain/user build`, and `pnpm --filter @saigondrain/user test:smoke`; expect all three to pass.
- [x] Run the User dev server and verify HTTP 200 on `http://127.0.0.1:5173/`; verify `/api` proxy forwarding to a local probe on port 3000; compare API prefix and port with NestJS in PR #11.
- [x] Review the diff to ensure Android placeholders, `FE/admin`, PRD, and existing CI/CD files were not changed.
