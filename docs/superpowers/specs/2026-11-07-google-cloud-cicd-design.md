# Google Cloud CI/CD Design

## Intent

Move SaigonDrain forward without restarting: migrate working parts into `MAnhhaoo/TokenPlusHKT2026` in reviewable increments, and make each migrated part pass automated checks before it can deploy.

## Current state

- The target repository now has a standalone npm/Vite admin frontend under `FE/admin/` and a lowercase Python ML research package under `ml/`, including `uv.lock` and tests. `BE/` and `FE/user/` are still placeholders, and this branch adds the first CI/deploy workflows.
- The earlier SaigonDrain repository remains the source for gradual migration; CI must accommodate the target repository's current npm and uv lockfiles while allowing future pnpm workspace packages.
- The target repository's default branch is `master`.

## Approaches

1. **Cloud Run for API/ML and Firebase Hosting for frontends — selected.** This matches the existing NestJS API and static Vite builds, and keeps frontend hosting separate from backend runtime.
2. **Cloud Run for all services.** This uses one deployment platform but requires separate frontend containers and additional container configuration.

## Proposed flow

- Pull requests to `master`: run build, typecheck, style/lint checks, and tests for changed migrated packages. Support package-local npm and workspace pnpm locks; use the admin app's format check and browser smoke test where standard lint/test scripts are absent. A workflow must report missing runnable packages as not ready; it must not present an empty/no-op run as successful validation.
- Pull requests: publish Firebase Hosting preview channels after Firebase project/site configuration is available.
- Merge to `master`: deploy migrated API and serving ML services to Cloud Run staging, and the user/admin frontends to Firebase Hosting staging.
- Version release: after CI passes and the protected production environment is approved, deploy the same source revision to production.
- GitHub Actions authenticates to Google Cloud with Workload Identity Federation. Long-lived service-account keys are not stored in GitHub.
- Run the existing `ml/` package checks on Ubuntu and Windows. Deploy ML to Cloud Run only if it has an HTTP inference service; training code, notebooks, and datasets stay out of the serving deployment.

## Scope and limits

This design covers the pipeline foundation and its activation path; it does not copy the entire source repository or create Google Cloud resources. Existing `FE/admin/` and `ml/` packages provide CI targets; Cloud Run and Firebase deployment waits for deployable services and owner-provided environment configuration. The Google Cloud project, region, Workload Identity provider/service account, Firebase project and Hosting site IDs, and runtime secrets must be supplied before deployment can run.

## Review focus

- A missing package or test command must not make CI look green while no application code was checked.
- Secrets and cloud credentials must not be committed to the repository.
- Production must receive only a revision that passed CI and staging verification.
- ML training artifacts must not be deployed as an online inference service.

## Remaining owner configuration

- The user approved Cloud Run for API/ML, Firebase Hosting for the frontend, and the staged rollout above.
- For real deployment, create the Google Cloud and Firebase project/site configuration and GitHub Environment protections/variables; workflow files use gated variables until then.
