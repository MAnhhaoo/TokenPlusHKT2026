# Google Cloud CI/CD Design

## Intent

Move SaigonDrain forward without restarting: migrate working parts into `MAnhhaoo/TokenPlusHKT2026` in reviewable increments, and make each migrated part pass automated checks before it can deploy.

## Current state

- The target repository has placeholder directories (`BE`, `FE`, `contracts`, `infra`, `docs`) and the PRD, but no application manifests or GitHub Actions workflows.
- The source repository has a pnpm/Node workspace with a NestJS backend and Vite frontends, plus a Python ML package. Its existing GitHub Actions workflow builds an Android debug APK and uploads it; it does not provide the requested lint/test/deploy pipeline.
- The target repository's default branch is `master`.

## Approaches

1. **Cloud Run for API/ML and Firebase Hosting for frontends — selected.** This matches the existing NestJS API and static Vite builds, and keeps frontend hosting separate from backend runtime.
2. **Cloud Run for all services.** This uses one deployment platform but requires separate frontend containers and additional container configuration.

## Proposed flow

- Pull requests to `master`: run build, typecheck, lint, and tests for the packages that have been migrated. Frontend lint/test commands must be added if they remain absent from the source packages. A workflow must report missing runnable packages as not ready; it must not present an empty/no-op run as successful validation.
- Pull requests: publish Firebase Hosting preview channels after Firebase project/site configuration is available.
- Merge to `master`: deploy migrated API and serving ML services to Cloud Run staging, and the user/admin frontends to Firebase Hosting staging.
- Version release: after CI passes and the protected production environment is approved, deploy the same source revision to production.
- GitHub Actions authenticates to Google Cloud with Workload Identity Federation. Long-lived service-account keys are not stored in GitHub.
- Deploy ML to Cloud Run only if it has an HTTP inference service; training code, notebooks, and datasets stay out of the serving deployment.

## Scope and limits

This design covers the pipeline foundation and its activation path; it does not copy the entire source repository or create Google Cloud resources. The target repository needs at least one runnable migrated service before build/test/deploy jobs can be meaningfully enabled. The Google Cloud project, region, Workload Identity provider/service account, Firebase project and Hosting site IDs, and runtime secrets must be supplied through repository/environment configuration before deployment can run.

## Review focus

- A missing package or test command must not make CI look green while no application code was checked.
- Secrets and cloud credentials must not be committed to the repository.
- Production must receive only a revision that passed CI and staging verification.
- ML training artifacts must not be deployed as an online inference service.

## Decisions needed before implementation

- Confirm this architecture and the staged rollout above.
- For real deployment, provide or create the Google Cloud and Firebase project/site configuration; workflow files can use placeholders until then.