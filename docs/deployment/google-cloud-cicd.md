# Google Cloud CI/CD setup

This repository is being migrated from the earlier SaigonDrain project in small steps. The workflows validate only migrated packages under `BE/`, `FE/user/`, `FE/admin/`, and `ML/`; an empty placeholder directory is not treated as a passing application check.

## Pipeline behavior

| Event | Result |
| --- | --- |
| Pull request to `master` | Run CI for changed application packages. Same-repository frontend PRs can publish a seven-day Firebase preview when `GCP_PREVIEW_ENABLED=true`. Fork PRs never receive Google credentials. |
| Push to `master` | Run full validation on migrated packages. If application code changed and staging is configured, deploy only changed services to the `staging` environment. |
| Published GitHub release | Run full validation, deploy the release commit to staging, then deploy that same source revision to production only when `GCP_DEPLOY_PRODUCTION=true` and the `production` Environment gate allows it. |
| No migrated application source | Report that application checks or deployment were skipped; do not report the repository as application-validated. |

The deploy workflow runs from the default branch after CI completes. For PR previews it reads only validated frontend booleans from the artifact, takes the PR number from the trusted `workflow_run` event, and downloads static build output; it does not check out or execute PR workflow code. The trusted workflow uses the Firebase configuration from `master`. GitHub documents that `workflow_run` workflows can access secrets and write tokens even when the preceding workflow cannot, and warns against running untrusted code on this event; keep this trust boundary intact. See [GitHub's `workflow_run` security guidance](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).

## GitHub configuration

Create the `staging`, `production`, and `preview` Environments in repository settings. Set the variables below at the indicated scope. Values are GitHub Actions **variables**, not secrets; do not put private keys in them.

### Repository variables

| Variable | Value | Effect |
| --- | --- | --- |
| `GCP_PREVIEW_ENABLED` | `true` | Allows same-repository frontend PR artifacts to be deployed to temporary preview channels. Set to `false` or remove it to disable previews. |
| `GCP_DEPLOY_STAGING` | `true` | Enables automatic staging deploys after a successful full CI run on `master` and before release production deploys. |
| `GCP_DEPLOY_PRODUCTION` | `true` | Enables production deploys for published releases. The production Environment should require reviewer approval. |

Only the exact string `true` enables a switch. Leave a switch unset until its environment and Google Cloud identity are ready.

### Environment variables

Configure staging and production independently. The preview Environment needs only the identity and Firebase variables listed in the right column. Service names may be set at each environment or omitted to use the defaults.

| Variable | Staging / production | Preview | Required when |
| --- | --- | --- | --- |
| `GCP_PROJECT_ID` | Google Cloud project ID | Same project ID | Every deploy job |
| `GCP_REGION` | Cloud Run region, e.g. `asia-southeast1` | — | Staging / production job |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full provider resource name: `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER` | Same format | Every deploy job |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | Service account email used by GitHub Actions | Preview should use a Firebase-only service account | Every deploy job |
| `GCP_RUNTIME_SERVICE_ACCOUNT` | Runtime service account email for Cloud Run | — | API or ML serving deploy |
| `GCP_API_PUBLIC` | `true` to allow unauthenticated requests; unset or any other value keeps the API private | — | Optional; API deploy |
| `VITE_API_BASE_URL` | Existing API URL used when a frontend changes without the API changing in the same deployment | — | Frontend deploy if the API is not deployed in that run |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Firebase project ID | Firebase Hosting deploy |
| `FIREBASE_USER_SITE_ID` | Hosting site ID for the user app | Same site ID | User frontend deploy/preview |
| `FIREBASE_ADMIN_SITE_ID` | Hosting site ID for the admin app | Same site ID | Admin frontend deploy/preview |
| `CLOUD_RUN_API_SERVICE` | Optional Cloud Run API service name; default `saigondrain-api` | — | Optional |
| `CLOUD_RUN_ML_SERVICE` | Optional Cloud Run ML service name; default `saigondrain-ml` | — | Optional |

Use separate GCP projects for staging and production when feasible. If using one project, keep separate environment variables, service accounts, Cloud Run service names, and Firebase sites so each deployment target is explicit.

## Google Cloud preparation

An administrator should create the Firebase project and Hosting sites, service accounts, Workload Identity Federation provider, and IAM bindings before enabling the GitHub switches. This workflow does not create those resources.

Enable the APIs needed by the configured targets:

- Cloud Run API: `run.googleapis.com`.
- Cloud Build API: `cloudbuild.googleapis.com` (used by Cloud Run source builds).
- Artifact Registry API: `artifactregistry.googleapis.com` (Cloud Run source builds store built images here).
- Firebase Hosting API: `firebasehosting.googleapis.com`.
- Firebase Management API: `firebase.googleapis.com` when adding Firebase to an existing Google Cloud project or managing Firebase resources.

Cloud Run source deployment uses buildpacks and Cloud Build. The GitHub deployer needs `roles/run.sourceDeveloper` and `roles/serviceusage.serviceUsageConsumer`, plus `roles/iam.serviceAccountUser` on the runtime identity. Grant the Cloud Build service account `roles/run.builder` as required by the project setup. See [Cloud Run source deployment roles and setup](https://docs.cloud.google.com/run/docs/deploying-source-code).

For Firebase Hosting deployment, grant the deployer `roles/firebasehosting.admin` and `roles/serviceusage.apiKeysViewer` on the Firebase project. Keep this separate from the runtime service account. Preview should use a Firebase-only service account. See [Firebase Hosting IAM roles](https://firebase.google.com/docs/projects/iam/roles-predefined-product).

The API is deployed privately by default. Set `GCP_API_PUBLIC=true` only if the API implements its own application-level authentication and is intended to accept unauthenticated Cloud Run requests. Frontend origins, CORS, and API authentication still need to be configured in the application.

## Workload Identity Federation

Use GitHub's OIDC provider `https://token.actions.githubusercontent.com` and Workload Identity Federation (WIF) to exchange short-lived credentials. Do not create or upload a service-account JSON key. Follow Google's [deployment-pipeline WIF guide](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) and the [Google auth action guidance](https://github.com/google-github-actions/auth).

1. Create a Workload Identity Pool and OIDC provider for GitHub Actions.
2. Configure the issuer URL above and map at least:

   ```text
   google.subject=assertion.sub
   attribute.repository_id=assertion.repository_id
   attribute.ref=assertion.ref
   attribute.workflow_ref=assertion.workflow_ref
   attribute.event_name=assertion.event_name
   attribute.environment=assertion.environment
   ```

3. Restrict the provider condition to this repository's immutable numeric `repository_id`, the trusted workflow `MAnhhaoo/TokenPlusHKT2026/.github/workflows/deploy.yml`, and the allowed refs and GitHub Environments. Use `refs/heads/master` for staging; permit release tags only for production. For previews, permit only the `preview` Environment and the `workflow_run` event. Do not grant access based only on a repository name or branch supplied by an untrusted PR.
4. Allow the matching federated principal to impersonate the deploy service account with `roles/iam.workloadIdentityUser`. Bind separate staging, production, and preview service accounts or use separate narrowly scoped bindings where practical.
5. Put the provider resource name and service-account email in that GitHub Environment's variables.

The identity used for Cloud Run deploys needs access to the project and runtime service account described above. The runtime service account should contain only permissions the running API or inference service needs; it is distinct from the GitHub deployer identity.

## Firebase Hosting sites and builds

[`firebase.json`](../../firebase.json) defines two named Hosting targets:

| Target | Site ID variable | Build directory |
| --- | --- | --- |
| `user` | `FIREBASE_USER_SITE_ID` | `FE/user/dist` |
| `admin` | `FIREBASE_ADMIN_SITE_ID` | `FE/admin/dist` |

Create one Firebase Hosting site for each app and record its site ID in both staging and production environments (and preview if previews are enabled). The workflows run `firebase target:apply` for the selected environment; `.firebaserc` is generated at deploy time and ignored so one environment's site mapping cannot be committed over another's. Firebase documents [multi-site targets](https://firebase.google.com/docs/hosting/multisites).

Frontend packages must build successfully from the repository root with the locked pnpm workspace and write static output to their declared `dist` directory. The workflow sets `VITE_API_BASE_URL` before Vite builds. When the API deploys in the same run, the new Cloud Run URL is used; otherwise, set the environment's `VITE_API_BASE_URL` to the API URL that frontend should call.

Same-repository PR previews use the `hosting-user` / `hosting-admin` artifacts from CI and deploy to a channel named `pr-N` that expires after seven days. Fork PRs never upload preview artifacts or receive OIDC credentials. Configure the `preview` Environment variables and WIF binding before setting `GCP_PREVIEW_ENABLED=true`.

## Application source contracts

- **API:** `BE/` must become a runnable Node package with a start command that listens on the Cloud Run-provided `PORT`. CI requires `package.json`, the workspace files, and `build`, `typecheck`, `lint`, and `test` scripts before validating a changed package.
- **User/admin frontend:** `FE/user/` and `FE/admin/` must be pnpm workspace packages with the same required scripts and build to `dist/`.
- **ML:** `ML/` must provide `pyproject.toml` and `uv.lock`; CI runs frozen dependency sync, Ruff, and pytest. Training code, notebooks, and datasets are never deployed. A Cloud Run inference service is deployed only when a changed ML package contains `ML/serving/Dockerfile`; that directory must contain a working HTTP service and the Cloud Run service is kept private.

## Enablement checklist

1. Migrate a runnable package from the old SaigonDrain repository into the matching directory in this repository.
2. Add required package manifests, frozen lockfiles, and build/typecheck/lint/test scripts. Keep the API's auth and configuration requirements explicit.
3. Create the Google Cloud and Firebase resources, enable their APIs, and grant the least-privilege IAM roles above.
4. Create the GitHub Environments and their variables. Add required reviewers and branch/tag rules to `production` before enabling production.
5. Confirm that the WIF provider conditions match the repository ID, trusted deploy workflow, ref, event, and Environment.
6. Set `GCP_DEPLOY_STAGING=true` after staging is ready. Enable previews with `GCP_PREVIEW_ENABLED=true` only after the preview identity and site variables are ready. Set `GCP_DEPLOY_PRODUCTION=true` only after the production Environment gate and variables are ready.
7. Confirm that a package change runs its checks and that the deployment summary names the expected target. A release is required to run the production path.

At the time this workflow foundation is added, the target repository has placeholders but no application packages, and no Google Cloud resources or GitHub Environment variables have been created for it. CI therefore reports that no application code was validated, and deployments remain gated until the migration and environment setup are complete.
