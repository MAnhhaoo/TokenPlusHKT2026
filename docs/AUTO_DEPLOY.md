# Automatic website deployment

Every merge into `master` runs CI, deploys staging, and then deploys production automatically when staging succeeds. This includes documentation-only successors, so a newer documentation commit cannot strand application changes from an older skipped deployment. Publishing a `v*` release remains supported. Obsolete revisions are skipped before production deployment.

Changes under `BE/`, `FE/user/`, and `FE/admin/` are recognized. Admin changes use the combined frontend deployment scope. CI checks the admin typecheck and build in addition to the existing BE and user checks.

Each production deployment builds the API and both frontends from the same commit. The user app is served at `/`; the admin app is built with `/admin/` as its base and copied into the same Firebase Hosting bundle. The hosting configuration rewrites admin paths to the admin entry point. Both routes are checked after deployment.

Production binds `GEMINI_API_KEY` to the Secret Manager secret named by the production Environment variable `GEMINI_API_KEY_SECRET_NAME`. Set this variable to `saigondrain-gemini-api-key`. The runtime service account must have Secret Accessor on that secret. No key value belongs in GitHub variables or source control.

## GitHub configuration

- Keep repository variables `GCP_DEPLOY_STAGING=true` and `GCP_DEPLOY_PRODUCTION=true`.
- In the `production` Environment, disable Required reviewers and Wait timer to allow unattended deployment.
- Allow the branch `master` and release tags `v*` in the Environment's deployment branch policies.
- Keep the existing production GCP, Cloud SQL, CORS and Firebase variables configured.
- The Workload Identity Provider must permit this repository's pushes to `refs/heads/master` and release tags `refs/tags/v*`.

The current hackathon deployment shares the configured PostgreSQL database between staging and production through the explicit `ALLOW_SHARED_DEMO_DATABASE=true` exception. Automatic deployment does not change application authentication or grant users administrative rights.
