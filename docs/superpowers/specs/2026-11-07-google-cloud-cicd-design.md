# Google Cloud CI/CD design

**Status:** Approved for the initial migration stage.

## Goal

Set up a GitHub Actions pipeline for the application packages being moved into this repository now: the NestJS backend at `BE/` and the user React frontend at `FE/user/`.

## Scope

- On pull requests to `master`, build, typecheck, lint or format, and test changed BE and/or FE/user packages.
- On pushes to `master`, validate all migrated BE and FE/user packages; deploy changed services to staging only when the staging environment is configured.
- On published releases, validate all migrated packages, deploy the release revision to staging, then deploy the same revision to production through the protected production Environment.
- Authenticate GitHub Actions to Google Cloud with Workload Identity Federation.
- Host FE/user on Firebase Hosting and BE on Cloud Run.
- Connect each Cloud Run API environment to its own Cloud SQL PostgreSQL instance using a Cloud Run SQL attachment and Secret Manager credentials.
- Keep the 30-day Cloud SQL trial scoped to staging; production must use a separate database and secret.
- Keep Cloud Run private by default. Public access requires a later application-authentication decision.

## Deferred

- FE/admin CI and deployment.
- ML checks and deployment.
- Firebase Hosting pull request previews.
- API authentication/CORS changes and public browser access to Cloud Run.
- Creation of Google Cloud resources or automatic provisioning of GitHub Environments.

## Constraints

- Empty placeholder directories are not successful application validation.
- CI must fail when a changed package lacks a manifest, lockfile, or required script.
- Deployment remains disabled until repository switches, Environment variables, WIF, and cloud resources are configured.
- Staging tracks the last successful deployment and carries forward changes from superseded pushes. An attempt without a linked completion marker forces all current BE and FE/user packages to redeploy on the next staging run.
- Release staging and production must skip a release superseded by a later published non-prerelease release.
- Production runs only after the release revision completed staging and the protected Environment gate allows it.

## Acceptance criteria

1. A PR changing BE or FE/user runs build, typecheck, style, and test checks for the affected package.
2. A PR changing workflow files runs regression checks for every migrated BE/FE user package.
3. Master pushes run full validation and deploy changed packages to staging only when enabled.
4. A published release follows staging first and deploys the same revision to production only when enabled and approved.
5. An incomplete staging attempt causes the next eligible staging run to redeploy all current BE and FE/user packages.
6. Google Cloud authentication uses WIF; deploy jobs do not store long-lived service-account keys.
7. Admin, ML, and PR preview jobs are absent from this initial scope.
8. API deploys attach the environment's Cloud SQL instance and inject the database password from Secret Manager; staging and production use separate database configuration.
