# Google Cloud CI/CD implementation plan

**Status:** Implemented for the approved BE + FE/user scope.

## Work completed

- [x] Add pull request CI for build, typecheck, lint/format, and test/smoke checks in `BE/` and `FE/user/`.
- [x] Run full regression checks when CI workflow files change.
- [x] Add full package validation on `master` pushes and published releases.
- [x] Add Cloud Run staging deploys and Firebase Hosting deploys for the user frontend, gated by GitHub Environment variables.
- [x] Add release staging followed by protected production deployment of the same revision.
- [x] Use Workload Identity Federation and keep the Cloud Run API private by default.
- [x] Track successful staging revisions so skipped or superseded pushes are included by the next deploy.
- [x] Remove Admin, ML, and Firebase PR preview jobs from this stage.
- [x] Document required Google Cloud, Firebase, WIF, and GitHub Environment setup.

## Files

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `firebase.json`
- `.gitignore`
- `docs/deployment/google-cloud-cicd.md`
- `docs/superpowers/specs/2026-11-07-google-cloud-cicd-design.md`

## Operational prerequisites

Google Cloud resources, the WIF provider, GitHub Environments, their variables, and production reviewers must be configured before deployment switches are enabled. Deployment remains off by default until `GCP_DEPLOY_STAGING` and `GCP_DEPLOY_PRODUCTION` are set.
