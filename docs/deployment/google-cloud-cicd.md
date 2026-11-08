# Google Cloud CI/CD

The pipeline currently covers only the NestJS API in `BE/` and the public user frontend in `FE/user/`. Admin and pull request preview deployments are outside this stage.

## Pipeline

| Event | Behavior |
| --- | --- |
| Pull request to `master` | Run build, typecheck, lint or format, and tests for changed BE and/or FE/user packages. Workflow changes run regression checks for every migrated package. |
| Push to `master` | Validate every migrated BE and FE/user package. If staging is enabled, deploy changed services to Cloud Run and/or Firebase Hosting. |
| Published release | Validate all migrated packages, deploy that release revision to staging, then deploy the same revision to production when the protected production Environment allows it. |

Deployment is disabled until `GCP_DEPLOY_STAGING` and `GCP_DEPLOY_PRODUCTION` are configured. The staging workflow records an attempt before deploying and records a successful revision only after all selected services deploy. If a run stops before its completion marker, the next staging run automatically redeploys all current BE and FE/user packages. It also carries changes forward from the last successful staging revision, and superseded push runs skip themselves so the latest run can deploy the accumulated change set.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:a73463ccac65d6ee14fce63b62a3cfbfc45ff243245607911c7d956ee2e8e7e9 -->

At the workflow level, the concurrency group is keyed by the release tag or push commit SHA. GitHub allows one running and one pending run per group; a new run replaces an older pending run without canceling the active run.

Staging and production jobs use separate repository-wide concurrency groups with `queue: max`. Each group allows one running job and up to 100 pending jobs; further jobs are canceled when the queue is full. A push does not replace a pending release staging job. If a release's staging job is canceled, production cannot deploy that release. Before rerunning canceled staging or production jobs, confirm the release is still the latest published non-prerelease release; if it has been superseded, use the latest release's workflow instead. After addressing a staging cancellation, rerun all jobs in the release workflow. Production also requires the release to remain the latest published non-prerelease release and pass its Environment gate.

After the release workflow finishes, if `master` is newer than the release revision, restore staging to the latest `master` revision: rerun all jobs in the latest `master` push workflow and verify the deployed services. An incomplete staging attempt is detected automatically, and that run forces a full BE and FE/user redeploy. GitHub only allows workflow runs to be rerun within 30 days; if the latest `master` push is older, create and merge an empty commit to `master` through the repository's normal branch-protection process to trigger a fresh staging run.

<!-- /coderabbit-ai-generated:v1 -->

The API is private by default on Cloud Run. `GCP_API_PUBLIC=true` enables unauthenticated Cloud Run access; use it only after application-level authentication is implemented and reviewed. With the API private, browser requests from Firebase Hosting need a separate authentication/connectivity design. CORS and API authentication are application concerns and are not configured by this pipeline.

## GitHub configuration

Create `staging` and `production` Environments. Require reviewer approval for `production`. Configure these repository variables only after the corresponding Google Cloud resources and WIF identities are ready:

| Repository variable | Value | Purpose |
| --- | --- | --- |
| `GCP_DEPLOY_STAGING` | `true` | Enable staging after successful validation on `master`. |
| `GCP_DEPLOY_PRODUCTION` | `true` | Enable release deployment after staging succeeds. |

Configure environment variables separately for staging and production:

| Environment variable | Required for | Notes |
| --- | --- | --- |
| `GCP_PROJECT_ID` | Every deploy | Google Cloud project ID. |
| `GCP_REGION` | Every deploy | Example: `asia-southeast1`. |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Every deploy | Full WIF provider resource name. |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | Every deploy | GitHub Actions deployer identity. |
| `GCP_RUNTIME_SERVICE_ACCOUNT` | API deploy | Cloud Run runtime identity. |
| `GCP_SQL_INSTANCE_CONNECTION_NAME` | API deploy | Cloud SQL connection name in `project:region:instance` format; each Environment must point to its own database instance. |
| `DB_DATABASE` | API deploy | PostgreSQL database name. |
| `DB_USERNAME` | API deploy | Built-in PostgreSQL application user. |
| `DB_PASSWORD_SECRET_NAME` | API deploy | Secret Manager secret ID containing that user's password; never put the password itself in a GitHub variable. |
| `DB_SYNCHRONIZE` | API deploy | Explicit TypeORM setting. Use `true` only for the blank staging trial while bootstrapping; production must use `false` and a migration process. |
| `GCP_API_PUBLIC` | Optional API deploy | Set to `true` only after the API has its own authentication. Unset keeps Cloud Run private. |
| `CLOUD_RUN_API_SERVICE` | Optional API deploy | Defaults to `saigondrain-api`. |
| `VITE_API_BASE_URL` | User frontend deploy when API is not deployed in the same run | API URL baked into the Vite build. |
| `FIREBASE_PROJECT_ID` | User frontend deploy | Firebase project ID. |
| `FIREBASE_USER_SITE_ID` | User frontend deploy | Firebase Hosting site ID for target `user`. |

## Google Cloud setup

Create the Google Cloud project, Cloud Run service, Firebase project/site, deployer and runtime service accounts, and WIF provider before enabling deployment. This workflow does not create cloud resources or store service-account keys.

Enable the APIs needed by the selected service:

- Cloud Run: `run.googleapis.com`.
- Cloud Build: `cloudbuild.googleapis.com`.
- Artifact Registry: `artifactregistry.googleapis.com`.
- Cloud SQL Admin: `sqladmin.googleapis.com`.
- Secret Manager: `secretmanager.googleapis.com`.
- Firebase Hosting: `firebasehosting.googleapis.com`.
- Firebase Management: `firebase.googleapis.com` when adding Firebase to an existing project or managing Firebase resources.

For Cloud Run source deploys, grant the deployer `roles/run.sourceDeveloper` and `roles/serviceusage.serviceUsageConsumer`, plus `roles/iam.serviceAccountUser` on the runtime account. Grant the Cloud Build service account `roles/run.builder` where required. For Hosting, grant the deployer `roles/firebasehosting.admin` and `roles/serviceusage.apiKeysViewer`. Keep the runtime account separate from the GitHub deployer. See [Cloud Run source deployment setup](https://docs.cloud.google.com/run/docs/deploying-source-code) and [Firebase Hosting IAM roles](https://firebase.google.com/docs/projects/iam/roles-predefined-product).

For each Cloud Run API runtime service account, grant `roles/cloudsql.client` on the project and `roles/secretmanager.secretAccessor` on that environment's database-password secret. The deploy workflow attaches Cloud SQL with `--add-cloudsql-instances` and sets `DB_HOST` to `/cloudsql/<connection-name>`; the database password is injected from Secret Manager as `DB_PASSWORD`. The Cloud SQL Unix socket connection is encrypted by Cloud SQL's connector integration. Do not open PostgreSQL port 5432 to the public internet.

Create a Secret Manager secret named by `DB_PASSWORD_SECRET_NAME` and store only the `saigondrain_app` database user's password in it. Keep the secret in Google Cloud; do not add its value to the repository, workflow file, GitHub variables, or chat.

### Current staging PostgreSQL trial

The currently created trial instance is for staging only. Set these values in the GitHub `staging` Environment:

| Environment variable | Value |
| --- | --- |
| `GCP_PROJECT_ID` | `tokenplus2026-514007` |
| `GCP_REGION` | `asia-southeast1` |
| `GCP_SQL_INSTANCE_CONNECTION_NAME` | `tokenplus2026-514007:asia-southeast1:saigondrain-pg-trial` |
| `DB_DATABASE` | `saigondrain` |
| `DB_USERNAME` | `saigondrain_app` |
| `DB_PASSWORD_SECRET_NAME` | `saigondrain-db-password` |
| `DB_SYNCHRONIZE` | `true` |

Before the first API deploy, connect to `saigondrain` in Cloud SQL Studio as `postgres` and run `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`. TypeORM uses `uuid-ossp` by default for generated UUID columns; install it with the admin account so the application role does not need elevated extension privileges. See [TypeORM's PostgreSQL driver options](https://typeorm.io/docs/drivers/postgres/).

The current backend has no TypeORM migrations. `DB_SYNCHRONIZE=true` is a temporary staging bootstrap for this new, empty trial database; it can change the schema as entities change and must not be used for production. Before enabling production deployment, create a separate production database and Secret Manager secret, implement and apply migrations, and set production `DB_SYNCHRONIZE=false`. Never point production at the 30-day trial instance.

## Workload Identity Federation

Use GitHub's OIDC provider `https://token.actions.githubusercontent.com` and short-lived Workload Identity Federation credentials. Do not create or upload a service-account JSON key. Follow Google's [WIF deployment-pipeline guide](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) and the [Google auth action guidance](https://github.com/google-github-actions/auth).

1. Create a Workload Identity Pool and OIDC provider for GitHub Actions.
2. Map the GitHub repository ID, ref, workflow reference, event name, and Environment claims.
3. Restrict the provider to this repository and `.github/workflows/deploy.yml`. Allow `master` pushes and release tags for staging; allow release tags only for production.
4. Allow the matching federated principal to impersonate the deploy service account with `roles/iam.workloadIdentityUser`.
5. Put the provider resource name and deployer service-account email in each GitHub Environment.

## User frontend hosting

[`firebase.json`](../../firebase.json) defines one Hosting target:

| Target | Environment variable | Build output |
| --- | --- | --- |
| `user` | `FIREBASE_USER_SITE_ID` | `FE/user/dist` |

The workflow runs `firebase target:apply hosting user` for the selected environment. `.firebaserc` is generated during deployment and ignored by Git. The frontend must build to `dist/`; the workflow installs dependencies from the package lock or the root frozen pnpm lockfile and injects `VITE_API_BASE_URL` before building.

## Application requirements

- **API:** `BE/` must contain a Node package with locked dependencies, `build`, `typecheck`, a lint or format script, a test or smoke-test script, and a Cloud Run entrypoint that listens on the provided `PORT`.
- **User frontend:** `FE/user/` must contain a locked package with `build`, `typecheck`, a lint or format script, and a test or smoke-test script. The build must write static assets to `FE/user/dist`.
- **API access:** the current pipeline keeps Cloud Run private unless explicitly configured otherwise. Configure application auth and CORS before making API endpoints publicly reachable or connecting a public browser client.

## Enablement checklist

1. Merge runnable BE and FE/user packages with frozen lockfiles and required scripts.
2. Create Cloud Run, Firebase Hosting, service-account, and WIF resources with least-privilege IAM.
3. Create the `staging` and `production` GitHub Environments, with required production reviewers.
4. Configure environment variables and verify the WIF claim conditions.
5. Set `GCP_DEPLOY_STAGING=true` after staging is ready. Set `GCP_DEPLOY_PRODUCTION=true` only after the production gate and variables are ready.
6. Confirm a PR reports the BE/FE user build, typecheck, style, and test jobs, and a release follows the staging then production path.
