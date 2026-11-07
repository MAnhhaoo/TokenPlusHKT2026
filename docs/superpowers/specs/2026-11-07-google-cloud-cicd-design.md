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
- Staging tracks the last successful deployment and carries forward changes from superseded pushes.
- Production runs only after the release revision completed staging and the protected Environment gate allows it.

## Acceptance criteria

1. A PR changing BE or FE/user runs build, typecheck, style, and test checks for the affected package.
2. A PR changing workflow files runs regression checks for every migrated BE/FE user package.
3. Master pushes run full validation and deploy changed packages to staging only when enabled.
4. A published release follows staging first and deploys the same revision to production only when enabled and approved.
5. Google Cloud authentication uses WIF; deploy jobs do not store long-lived service-account keys.
6. Admin, ML, and PR preview jobs are absent from this initial scope.
