# Feature Specification: Pull Request Ephemeral Environments

**Feature Branch**: `001-ephemeral-environment`  
**Created**: 2025-12-19  
**Status**: Draft

---

## Clarifications

### Session 2025-12-20 (Initial Clarifications)

- Q: What ResourceQuota limits should be enforced per ephemeral namespace? → A: Minimal (2 CPU, 4Gi memory, 5 pods max) with 1 replica for preview deployments
- Q: Should ephemeral environments clone and build the full documentation set or a minimal subset? → A: Full documentation (all versions, all pages)
- Q: What authentication/authorization should ephemeral preview environments enforce? → A: Public access (no auth)
- Q: What rate limiting should be applied to preview environment traffic? → A: Kubernetes-level only (connection limits)
- Q: What maintenance/update strategy for the persistent base infrastructure (cluster, PostgreSQL)? → A: Manual as-needed updates

### Session 2025-12-20 (Architecture Decisions)

- Q: Should preview environments import production Kustomize manifests or use separate Pulumi code? → A: **Migrate all infrastructure (local, preview, production) to Pulumi** to eliminate tool sprawl (Helm + Kustomize + Pulumi → Pulumi only)
- Q: Should Redis and monitoring be included in migration? → A: No, Redis is unused and monitoring is managed separately
- Q: What about js-config ConfigMap for web? → A: Required, contains environment-specific JavaScript configuration (API URLs), must be created per-environment
- Q: Reuse production Gateway or create separate for preview? → A: Separate Gateway for preview environments (isolation)
- Q: Migrate to GitHub Container Registry (ghcr.io) from DockerHub? → A: Yes, simplifies GitHub Actions integration and eliminates rate limits
- Q: Should Pulumi manage per-environment databases? → A: Yes, Pulumi creates separate databases for local, preview, and production
- Q: Migration order? → A: local (Minikube) → preview (ephemeral) → production (DigitalOcean cluster)

### Session 2025-12-21 (ESC and Production Pipeline)

- Q: How should production deployment workflow set image references? → A: Production workflow must use `pulumi config set` to set `webImage` and `apiImage` from build outputs (not hardcoded in stack YAML)
- Q: What happens to existing preview database when ESC password changes? → A: Database deployment will fail to start with new password; must update existing database password or destroy/recreate database with new credentials

### Session 2025-12-21 (Separate Preview Cluster Architecture)

- Q: Should preview environments share the production Kubernetes cluster? → A: **No - Create dedicated preview cluster** (`aphiria-com-preview-cluster` on DigitalOcean)
- Q: Why separate clusters instead of shared cluster with namespaces? → A: **Complexity reduction** - Eliminates complex dependency management between preview-base and production stacks sharing the same cluster
- **Rationale**:
  1. **Complete isolation**: Preview cluster failures cannot impact production
  2. **Simpler Pulumi state management**: No shared cluster resources between preview and production stacks
  3. **Independent scaling**: Preview cluster sized for ephemeral workloads (smaller node pool)
  4. **Easier teardown**: Can destroy entire preview cluster if needed without production risk
  5. **Cost optimization**: Preview cluster uses lower-cost DigitalOcean node pools
- **Implementation**: `stacks/preview-base.ts` provisions dedicated DigitalOcean cluster + PostgreSQL + Gateway
- **Trade-off**: Higher cost (2 clusters vs 1), but significantly reduced operational complexity

---

## Summary

This feature introduces ephemeral, pull-request–scoped preview environments that allow maintainers to validate changes in a production-like setting before merging.

Each pull request may be deployed into an isolated environment with predictable public URLs:

- Web: `{PR_NUMBER}.pr.aphiria.com` (e.g., `123.pr.aphiria.com`)
- API: `{PR_NUMBER}.pr-api.aphiria.com` (e.g., `123.pr-api.aphiria.com`)

Preview environments are:
- isolated from production
- automatically updated on new commits
- gated behind explicit maintainer approval
- destroyed automatically when the pull request is closed or merged

This repository is public and open source; therefore, all privileged deployment actions must be protected against untrusted contributors.

---

## User Scenarios & Testing (Mandatory)

### User Story 1 — Preview Pull Request Changes (P1)

As a maintainer, I want to preview pull request changes in a live, isolated environment so that I can validate functionality and behavior before merging.

**Acceptance Scenarios**

1. **Given** a pull request is opened  
   **When** the maintainer approves preview deployment  
   **Then** a preview environment is provisioned with a unique URL

2. **Given** a preview environment exists  
   **When** new commits are pushed to the PR  
   **Then** the environment is updated to reflect the latest commit

3. **Given** the preview environment is ready  
   **When** the preview URL is accessed  
   **Then** the application reflects the PR’s code changes without impacting production

4. **Given** a preview deployment succeeded for PR SHA X
   **When** that SHA is promoted to production
   **Then** production runs the identical image digest that was tested in preview, with production environment configuration applied.

---

### User Story 2 — Share Preview with Stakeholders (P2)

As a maintainer, I want to share a working preview URL so that reviewers or stakeholders can validate behavior without local setup.

**Acceptance Scenarios**

1. **Given** a preview environment exists
   **When** the preview URL is shared
   **Then** others can access the environment using a browser without authentication

2. **Given** multiple users access the preview
   **When** they interact with the application
   **Then** their usage does not affect production or other previews

---

### User Story 3 — Automatic Environment Cleanup (P3)

As a maintainer, I want preview environments to be destroyed automatically when a PR is no longer active so that resources are not wasted.

**Acceptance Scenarios**

1. **Given** a pull request is merged  
   **When** the merge completes  
   **Then** the associated ephemeral environment is destroyed

2. **Given** a pull request is closed without merging  
   **When** the PR is closed  
   **Then** the associated ephemeral environment is destroyed

3. **Given** an environment is destroyed  
   **When** the preview URL is accessed  
   **Then** the environment is no longer reachable

> Note: Environments are destroyed on PR close or merge only.  
> No time-based (e.g., 1-hour) teardown is performed.

---

## Requirements (Mandatory)

### Functional Requirements

- **FR-001**: The system MUST support deploying an isolated preview environment per pull request
- **FR-002**: Each preview MUST have stable, predictable URLs derived from the PR number (web + API)
- **FR-003**: Preview environments MUST deploy the latest commit from the PR
- **FR-004**: Preview environments MUST update automatically when new commits are pushed
- **FR-005**: Preview environments MUST be destroyed when the PR is closed or merged
- **FR-006**: Preview environments MUST be isolated from production and from other previews
- **FR-007**: Deployment progress and failure states MUST be observable
- **FR-008**: Provisioning failures MUST be reported clearly
- **FR-009**: All resources created for a preview MUST be removed on teardown
- **FR-010**: Preview environments MUST deploy both web and API containers with full application behavior
- **FR-011**: Preview deployments MUST auto-approve for PRs authored by repository admins/maintainers
- **FR-012**: Preview deployments MUST require manual approval for PRs authored by external contributors
- **FR-072**: GitHub environment protection MUST be used as defense-in-depth alongside workflow-based checks
- **FR-073**: The `preview` environment MUST use `workflow_run` trigger (runs on master branch workflow) to prevent workflow tampering
- **FR-074**: The workflow MUST programmatically auto-approve deployments for maintainer PRs using GitHub API
- **FR-075**: Deployment tracking MUST be maintained via GitHub environment deployment history
- **FR-076**: Auto-approval MUST use a Personal Access Token (PAT) with `repo` and `read:org` scopes stored in `DEPLOYMENT_APPROVAL_TOKEN` secret
- **FR-077**: The `preview` environment protection MUST have `prevent_self_review: false` to allow maintainer self-approval
- **FR-078**: The auto-approval job MUST run concurrently with the deploy job and approve pending deployments via the GitHub API
- **FR-029**: Each preview environment MUST provision separate Kubernetes Deployments for web and API components (1 replica each for preview traffic)
- **FR-030**: Web and API deployments MUST use the same immutable container images (by digest) as production
- **FR-031**: Gateway/Ingress routing MUST direct `{PR}.pr.aphiria.com` to web service and `{PR}.pr-api.aphiria.com` to API service
- **FR-033**: Gateway/Ingress MUST enforce connection-level rate limiting to prevent resource exhaustion
- **FR-032**: Each preview environment MUST run database migrations via Phinx before deployments start
- **FR-102**: Each preview environment MUST run the LexemeSeeder (Phinx seed) to populate the search index
- **FR-034**: The database migration job MUST complete successfully before API deployment is marked ready
- **FR-035**: LexemeSeeder MUST read compiled documentation from the API container's filesystem
- **FR-036**: Preview URLs MUST be surfaced in pull request comments or status checks
- **FR-079**: Pulumi preview output MUST be posted as a PR comment after the preview step completes
- **FR-080**: Preview comments MUST be collapsible (using `<details>` tag) to avoid cluttering the PR discussion
- **FR-081**: Preview comments MUST indicate success/failure status with visual indicators (✅/❌)
- **FR-082**: Preview comments MUST be updated (not duplicated) when the workflow re-runs for the same PR
- **FR-037**: Preview deployments MUST be gated behind explicit maintainer approval
- **FR-038**: Untrusted contributors MUST NOT be able to trigger privileged deployments
- **FR-039**: Privileged credentials MUST NOT be accessible before approval
- **FR-066**: Pulumi preview output MUST be posted to the pull request as a comment BEFORE deployment approval is requested
- **FR-067**: The preview comment MUST show all infrastructure changes (creates, updates, deletes) that will occur
- **FR-068**: Deployment workflows MUST NOT use `--skip-preview` flag to ensure maintainers can review infrastructure changes
- **FR-051**: Preview environments MUST be publicly accessible without authentication (security via URL obscurity)
- **FR-040** (Build once): The system MUST build a single container image per commit and reuse it across preview and production deployments (includes full documentation build).
- **FR-041** (Immutable promotion): Production deployments MUST reference the same immutable image (by digest) that was deployed and tested in the preview environment.
Kubernetes
- **FR-042** (Runtime config): Environment-specific configuration MUST be provided at deploy/runtime (env vars/secrets/config), not by rebuilding the image.
- **FR-043**: Each ephemeral environment MUST generate a unique Kubernetes ConfigMap with PR-specific configuration
- **FR-044**: ConfigMap MUST include PR-specific values: `APP_WEB_URL`, `APP_API_URL`, `APP_COOKIE_DOMAIN`
- **FR-045**: ConfigMap names MUST follow the pattern `env-vars-pr-{PR_NUMBER}` for isolation
- **FR-046**: Kubernetes Secrets MUST be generated per-PR for sensitive configuration (DB credentials, etc.)
- **FR-047**: Secret names MUST follow the pattern `env-var-secrets-pr-{PR_NUMBER}`

#### Pulumi ESC Integration

- **FR-083**: CD-specific secrets (PostgreSQL passwords, DigitalOcean tokens) MUST be migrated from GitHub Secrets to Pulumi ESC
- **FR-085**: Stack YAML files MUST import appropriate ESC environments via `environment:` block
- **FR-086**: Workflows MUST NOT use `pulumi config set --secret` for secrets stored in ESC
- **FR-087**: CI-specific secrets (GHCR_TOKEN, PULUMI_ACCESS_TOKEN) MUST remain in GitHub Secrets
- **FR-088**: ESC environment `aphiria-com/preview` MUST contain: `postgresql:password`, `digitalocean:token` (preview cluster scoped)
- **FR-089**: ESC environment `aphiria-com/production` MUST contain: `postgresql:password`, `digitalocean:token` (production cluster scoped)
- **FR-091**: Local development MUST support `esc run` for Pulumi operations but NOT require ESC access for basic Minikube usage
- **FR-092**: `preview-base` stack MUST import `aphiria-com/preview` ESC environment
- **FR-093**: `preview-pr-{N}` stacks MUST import `aphiria-com/preview` ESC environment (inherits shared preview secrets)
- **FR-094**: `production` stack MUST import `aphiria-com/production` ESC environment
- **FR-095**: `local` stack MAY optionally import `aphiria-com/local` ESC environment for `esc run` support
- **FR-096**: ESC migration MUST be tested in preview environment before applying to production
- **FR-097**: GitHub Secrets `POSTGRESQL_PREVIEW_PASSWORD`, `POSTGRESQL_ADMIN_PASSWORD`, `DIGITALOCEAN_ACCESS_TOKEN` MUST be removed after successful ESC migration

---

## Configuration Injection

### GitHub Context Variables

The PR number and related metadata are available in GitHub Actions via context variables:

- `${{ github.event.pull_request.number }}` - PR number (e.g., `123`)
- `${{ github.event.pull_request.head.sha }}` - Commit SHA
- `${{ github.repository }}` - Repository name
- `${{ github.event.pull_request.head.ref }}` - Source branch name

### API Application Environment Variables

For each ephemeral environment, environment variables are injected via Kubernetes ConfigMap and Secret resources created by the Pulumi preview-pr stack.

#### Actual Implementation (stacks/preview-pr.ts)

**ConfigMap: `preview-config`** (non-sensitive configuration):
- `DB_HOST`: PostgreSQL host from preview-base stack output (Service: `db` in `default` namespace)
- `DB_PORT`: `"5432"`
- `DB_NAME`: `aphiria_pr_{{ PR_NUMBER }}` (e.g., `aphiria_pr_123`)
- `DB_USER`: From Pulumi ESC `postgresql:user` (e.g., `aphiria`)
- `APP_ENV`: `"preview"`
- `PR_NUMBER`: PR number as string
- `WEB_URL`: `https://{{ PR_NUMBER }}.pr.aphiria.com`
- `API_URL`: `https://{{ PR_NUMBER }}.pr-api.aphiria.com`

**Secret: `preview-secret`** (sensitive configuration):
- `DB_PASSWORD`: From Pulumi ESC `postgresql:password` (unique preview password)

**⚠️ Known Gap**: The following environment variables required by Aphiria are currently **NOT** set in preview environments (see issue tracking):
- `APP_BUILDER_API`: `"\\Aphiria\\Framework\\Api\\SynchronousApiApplicationBuilder"`
- `APP_BUILDER_CONSOLE`: `"\\Aphiria\\Framework\\Console\\ConsoleApplicationBuilder"`
- `APP_COOKIE_DOMAIN`: `.{{ PR_NUMBER }}.pr.aphiria.com`
- `APP_COOKIE_SECURE`: `"1"`
- `DOC_LEXEMES_TABLE_NAME`: `""`
- `LOG_LEVEL`: `"debug"`

**Resolution**: These missing variables should be added to the ConfigMap in `stacks/preview-pr.ts` (lines 187-203) or the stack should be refactored to use the shared `createAPIDeployment` component from `components/api-deployment.ts`, which already includes all required environment variables.

#### Reference: Required Environment Variables (from Kustomize base/production)

For comparison, the production Kustomize manifest (`infrastructure/kubernetes/base/core/config-maps.yml`) defines:
- `APP_BUILDER_API`, `APP_BUILDER_CONSOLE`, `APP_ENV`, `APP_WEB_URL`, `APP_API_URL`, `APP_COOKIE_DOMAIN`, `APP_COOKIE_SECURE`, `DB_HOST`, `DB_NAME`, `DB_PORT`, `DOC_LEXEMES_TABLE_NAME`, `LOG_LEVEL`

### Pulumi ESC Architecture

**Purpose**: Centralize CD-specific secrets in Pulumi ESC to eliminate duplication between GitHub Secrets and Pulumi stack config files.

#### ESC Environment Structure (ACTUAL IMPLEMENTATION)

**ESC Project**: `aphiria.com` (note: uses dots, not hyphens)

**Environments**:
- `aphiria.com/Preview` - Preview cluster secrets
- `aphiria.com/Production` - Production cluster secrets

**Note**: We chose a flat structure (2 environments) instead of a hierarchical structure with shared `common` environment to simplify initial implementation. Common values like `postgresql:user` are duplicated in both environments.

#### ESC Environment Definitions

**aphiria.com/Preview**:
```yaml
values:
  pulumiConfig:
    "postgresql:user": aphiria
    "postgresql:password":
      fn::secret: <unique-preview-password>
    "digitalocean:token":
      fn::secret: <preview-cluster-scoped-token>
```

**Note**: Both `preview-base` and `preview-pr-*` stacks use `postgresql:user` and `postgresql:password` from ESC. The per-PR stacks use these credentials to create separate databases within the shared PostgreSQL instance.

**aphiria.com/Production**:
```yaml
values:
  pulumiConfig:
    "postgresql:user": aphiria
    "postgresql:password":
      fn::secret: <unique-production-password>
    "digitalocean:token":
      fn::secret: <production-cluster-scoped-token>
```

**Key Requirements**:
- Config keys MUST be quoted: `"postgresql:user"` not `postgresql: { user: ... }`
- Non-secret values are plain strings: `aphiria` not `fn::secret: aphiria`
- Secrets use `fn::secret:` wrapper
- Zero password reuse between environments

#### Stack Configuration Files

**Pulumi.preview-base.yml**:
```yaml
environment:
  - aphiria.com/Preview
```

**Pulumi.production.yml**:
```yaml
environment:
  - aphiria.com/Production
config:
  aphiria-com-infrastructure:webImage: davidbyoung/aphiria.com-web:8e1ebfd326d7d20aea7104f1269cb1a9ce325d69-a9b9031929d39f8dd4863bec41bbe5b76cb2b555
  aphiria-com-infrastructure:apiImage: nginx:alpine
```

**Pulumi.local.yml**:
```yaml
# Local development stack - uses traditional Pulumi config (no ESC required)
# This allows developers without ESC access to run Pulumi locally

config:
  # Set these using: pulumi config set postgresql:user aphiria
  # Set secrets using: pulumi config set --secret postgresql:password <your-password>
```

#### TypeScript Code Access

Pulumi stacks access ESC values via standard Config API:

```typescript
const config = new pulumi.Config("postgresql");
const dbUser = config.require("user");         // From common ESC
const dbPassword = config.requireSecret("password");  // From preview/production ESC
```

#### Migration Impact

**Before ESC**:
- Secrets stored in GitHub Secrets
- Workflows run `pulumi config set --secret postgresql:password "${{ secrets.POSTGRESQL_PREVIEW_PASSWORD }}"`
- Secrets duplicated in Pulumi stack config files (encrypted)

**After ESC**:
- Secrets stored once in Pulumi ESC
- No `pulumi config set --secret` commands needed
- GitHub Secrets only used for CI-specific operations (GHCR_TOKEN, PULUMI_ACCESS_TOKEN)

**Removed GitHub Secrets** (moved to ESC):
- `POSTGRESQL_PREVIEW_PASSWORD` → ESC `aphiria.com/Preview`
- `DIGITALOCEAN_ACCESS_TOKEN` → ESC `aphiria.com/Preview` and `aphiria.com/Production` (separate tokens)
- `PULUMI_CONFIG_PASSPHRASE` → Not needed (Pulumi Cloud encryption)
- `KUBECONFIG` → Generated dynamically from stack outputs

**Remaining GitHub Secrets** (CI-specific):
- `PULUMI_ACCESS_TOKEN` - Required for Pulumi Cloud authentication
- `GHCR_TOKEN` - Required for pushing Docker images to GitHub Container Registry

#### Local Development

**Local stack uses traditional Pulumi config** (no ESC required):

```bash
# Initialize local stack
pulumi stack init local

# Set config manually
pulumi config set postgresql:user aphiria
pulumi config set --secret postgresql:password postgres

# Deploy
pulumi up --stack local
```

This approach allows developers to work without ESC access while preview/production use ESC for centralized secret management.

#### Workflow Integration: Stack-to-ESC Binding

**Correct approach** (during stack initialization):
```bash
# Create stack
pulumi stack init preview-base

# Bind to ESC environment
pulumi config env add aphiria.com/Preview --stack preview-base
```

**Lessons Learned**:
1. Pulumi Neo may provide incorrect CLI syntax - always verify with `pulumi <command> --help`

### Workflow Integration (ESC Binding in CI/CD)

**Key points**:
1. Extract PR number from `${{ github.event.pull_request.number }}`
2. Check if stack exists before creating
3. If creating new stack, immediately bind to ESC environment
4. Secrets (PostgreSQL passwords, DigitalOcean tokens) are automatically loaded from ESC
5. No `pulumi config set --secret` commands needed

---

## CI/CD Workflow Architecture

### Actual Implementation (2025-12-22)

The preview environment workflows are **fully implemented** and operational. The architecture uses dedicated workflows for preview environments, with plans to create reusable workflows for production in the future.

#### **Implemented Workflows**

**1. Test Workflow** (`.github/workflows/test.yml`)
- **Trigger**: Push to master, pull requests, daily schedule
- **Purpose**: PHP code testing (PHPUnit, PHPcs, Psalm), Pulumi TypeScript build verification
- **Jobs**:
  - Matrix testing: PHP 8.4 and 8.5
  - PostgreSQL 16 service container for integration tests
  - Documentation build (`gulp build`)
  - Database seeding (Phinx migrations + LexemeSeeder)
  - Static analysis and code coverage upload
  - Pulumi TypeScript build verification (only on PHP 8.4)

**2. Build Preview Images** (`.github/workflows/build-preview-images.yml`)
- **Trigger**: PR opened/synchronize/reopened (on source code changes only)
- **Purpose**: Multi-stage Docker image builds with caching optimization
- **Outputs**: Image digests attached as PR labels for deployment tracking
- **Jobs**:
  - **build**: Single job with 3 sequential Docker builds
    1. **Build image** (`aphiria.com-build`): Documentation compilation from https://github.com/aphiria/docs
    2. **Web image** (`aphiria.com-web`): nginx with compiled static HTML/CSS/JS
    3. **API image** (`aphiria.com-api`): nginx + PHP-FPM with compiled docs for LexemeSeeder
  - **Caching strategy**:
    - Primary: PR-specific GHA cache (`scope=build-${PR_NUMBER}`)
    - Fallback 1: General preview cache (`scope=build`)
    - Fallback 2: Master branch cache (`scope=build-master`)
  - **PR annotations**:
    - Comment with image digests
    - Labels: `preview:images-built`, `web-digest:${SHORT_HASH}`, `api-digest:${SHORT_HASH}`

**3. Build Master Cache** (`.github/workflows/build-master-cache.yml`)
- **Trigger**: Push to master branch
- **Purpose**: Populate GHA cache for faster initial PR builds
- **Output**: Cached layers for build, web, and API images at `scope=build-master`

**4. Deploy Preview Environment** (`.github/workflows/deploy-preview.yml`)
- **Trigger**: Successful completion of "Build Preview Images" workflow (workflow_run)
- **Purpose**: Deploy ephemeral preview environment with security gates
- **Jobs**:
  1. **ensure-base-stack** (runs first):
     - Checks if `preview-base` stack exists
     - Auto-provisions preview Kubernetes cluster if needed
     - Retry logic for cluster initialization (3 attempts, progressive backoff)
     - Validates cluster deployment via `clusterId` output

  2. **preview-infra** (runs after base stack ready):
     - Extracts PR number from workflow_run event
     - Creates or selects `preview-pr-${PR_NUMBER}` stack
     - Binds Pulumi ESC environment (`aphiria.com/Preview`)
     - **Runs `pulumi preview`** to show infrastructure changes
     - **Posts preview output as PR comment** (collapsible, before approval)
     - ✅ **OSS Security**: Maintainers see infrastructure changes before approval

  3. **check-author** (runs after preview):
     - Determines if PR author has admin/maintain permissions
     - Outputs: `is-maintainer` (boolean), `pr-number`

  4. **auto-approve** (runs if maintainer, parallel with deploy):
     - Waits for deployment to reach pending state (max 30 attempts × 2s)
     - Auto-approves via GitHub API using `DEPLOYMENT_APPROVAL_TOKEN`
     - Eliminates manual approval step for trusted contributors

  5. **deploy** (runs if maintainer, requires `preview` environment approval):
     - **Environment protection**: `preview` environment with required reviewers
     - Retrieves image digests from PR labels
     - Configures Pulumi stack with PR number, image digests, base stack reference
     - Generates kubeconfig from `preview-base` stack output
     - Deploys with 10-minute timeout
     - Waits for pod readiness (5-minute timeout)
     - Health checks: HTTP status validation for web and API URLs
     - **PR comment**: Deployment status, URLs, HTTP status codes
     - **Concurrency control**: `group: preview-${PR_NUMBER}`, no cancellation

  6. **notify-manual-approval** (runs if non-maintainer):
     - Posts PR comment explaining manual approval requirement

**5. Cleanup Preview Environment** (`.github/workflows/cleanup-preview.yml`)
- **Trigger**: PR closed or merged
- **Purpose**: Automatic resource cleanup
- **Jobs**:
  - **cleanup**:
    - Retrieves kubeconfig from `preview-base` stack
    - Runs `pulumi destroy --stack preview-pr-${PR_NUMBER}` (5-minute timeout)
    - Removes Pulumi stack from Pulumi Cloud
    - Verifies namespace deletion
    - Verifies database drop (connects to PostgreSQL pod to query `pg_database`)
    - Updates PR comment with cleanup status
    - Removes PR labels: `preview:*`, `web-digest:*`, `api-digest:*`

#### **Key Implementation Details**

**Security Model**:
- **workflow_run trigger**: Deploy workflow runs on master branch code, not PR branch (prevents workflow tampering)
- **Environment protection**: `preview` environment requires manual approval for non-maintainers
- **Auto-approval**: Uses PAT with `repo` and `read:org` scopes (stored in `DEPLOYMENT_APPROVAL_TOKEN`)
- **Infrastructure preview**: Posted BEFORE approval gate (FR-066-068)

**Image Digest Tracking**:
- Build workflow captures digests: `${{ steps.build-image.outputs.digest }}`
- Digests stored as PR labels: `web-digest:abc123def456` (first 12 chars of SHA-256)
- Deploy workflow reconstructs full digest: `sha256:` + label value
- Production can promote same digest tested in preview (build-once-deploy-many)

**Database Management**:
- Per-PR database created via Kubernetes Job: `CREATE DATABASE aphiria_pr_${PR_NUMBER}`
- Migrations run in API deployment initContainer: `vendor/bin/phinx migrate && vendor/bin/phinx seed:run`
- Cleanup verifies database drop by querying PostgreSQL directly

**Error Handling**:
- Base stack deployment: 3 retries with progressive backoff (60s, 120s)
- Health checks: Continue on error, post status codes to PR
- Cleanup: Continue on error for verification steps (namespace/database checks)

---

### Future: Reusable Workflows (Planned)

**Goal**: Minimize drift between PR preview builds and production builds by using parameterized, reusable workflows.

**Requirements**:
- **FR-048** (Workflow reuse): Docker image builds MUST use the same reusable workflow for both PR previews and production deployments
- **FR-049** (Workflow parameterization): Build workflows MUST be parameterized by environment (`preview`, `production`) to avoid duplication
- **FR-050** (Deployment consistency): Pulumi deployment workflows MUST use shared logic with environment-specific configuration passed as inputs
- **NFR-011** (Maintainability): Changes to build or deployment logic MUST only require updating a single reusable workflow, not multiple workflow files

**Planned Structure** (not yet implemented):
- `build-images.yml` - Reusable workflow for building Docker images
- `deploy-pulumi.yml` - Reusable workflow for Pulumi deployments
- Refactor `build-preview-images.yml` and `deploy-preview.yml` to use reusable workflows
- Create `deploy-production.yml` using reusable patterns

**Migration - Files to Remove** (after production migration):
- `build-docker-image.yml` - Replaced by `build-images.yml`
- `build-deploy.yml` - Replaced by `production-deploy.yml` + `deploy-pulumi.yml`

**Files to Update**:
- `test.yml` - Remove Pulumi preview steps if they exist (infrastructure preview is now in deploy-preview.yml)

### Parameterization Strategy

**Build Workflow Parameters**:
```yaml
# .github/workflows/build-images.yml
inputs:
  environment:
    type: string
    required: true
    description: "preview or production"
  image-tag-strategy:
    type: string
    required: true
    description: "pr-number, commit-sha, or latest"
  registry:
    type: string
    default: "ghcr.io"
  enable-cache:
    type: boolean
    default: true
```

**Deployment Workflow Parameters**:
```yaml
# .github/workflows/deploy-pulumi.yml
inputs:
  stack-name:
    type: string
    required: true
    description: "Pulumi stack name (e.g., preview-pr-123, production)"
  pulumi-program-path:
    type: string
    required: true
    description: "Path to Pulumi program (infrastructure/pulumi - stack selected via stack-name)"
  environment:
    type: string
    required: true
    description: "GitHub environment for approval gates (preview, production)"
  web-image-digest:
    type: string
    required: true
  api-image-digest:
    type: string
    required: true
  action:
    type: string
    default: "up"
    description: "Pulumi action: up or destroy"
```

### Workflow Invocation Examples

**Preview Deployment** (`.github/workflows/preview-deploy.yml`):
```yaml
jobs:
  build:
    uses: ./.github/workflows/build-images.yml
    with:
      environment: preview
      image-tag-strategy: pr-number
      enable-cache: true

  deploy:
    needs: build
    uses: ./.github/workflows/deploy-pulumi.yml
    with:
      stack-name: preview-pr-${{ github.event.pull_request.number }}
      pulumi-program-path: infrastructure/pulumi
      environment: preview
      web-image-digest: ${{ needs.build.outputs.web-digest }}
      api-image-digest: ${{ needs.build.outputs.api-digest }}
    secrets: inherit
```

**Production Deployment** (`.github/workflows/production-deploy.yml`):
```yaml
jobs:
  # Option 1: Build new images for production
  build:
    uses: ./.github/workflows/build-images.yml
    with:
      environment: production
      image-tag-strategy: commit-sha
      enable-cache: true

  # Option 2: Reuse preview images (build-once-deploy-many - PREFERRED)
  promote:
    runs-on: ubuntu-latest
    outputs:
      web-digest: ${{ steps.get-digests.outputs.web-digest }}
      api-digest: ${{ steps.get-digests.outputs.api-digest }}
    steps:
      - name: Get preview image digests from merged PR labels
        id: get-digests
        run: |
          # Extract digests from PR labels: image-digest/web:sha256:..., image-digest/api:sha256:...
          echo "web-digest=sha256:..." >> $GITHUB_OUTPUT
          echo "api-digest=sha256:..." >> $GITHUB_OUTPUT

  deploy:
    needs: promote
    uses: ./.github/workflows/deploy-pulumi.yml
    with:
      stack-name: production
      pulumi-program-path: infrastructure/pulumi
      environment: production
      web-image-digest: ${{ needs.promote.outputs.web-digest }}
      api-image-digest: ${{ needs.promote.outputs.api-digest }}
    secrets: inherit
```

### Benefits

1. **Single Source of Truth**: Build logic lives in one file (`build-images.yml`)
2. **No Drift**: Preview and production use identical build steps, just different parameters
3. **Easy Testing**: Can test production workflow changes in preview first
4. **Maintainability**: Bug fixes or improvements apply to all environments automatically
5. **Type Safety**: Workflow inputs are typed and validated by GitHub Actions

---

## Infrastructure Strategy

### Full Pulumi Migration

This feature includes a **comprehensive migration** from Helm/Kustomize to Pulumi for all environments:

**Current State (Pre-Migration)**:
- Helm: cert-manager + nginx-gateway-fabric (helmfile.yml)
- Kustomize: Application deployments (base + dev/prod overlays)
- Pulumi: DigitalOcean cluster creation only

**Target State (Post-Migration)**:
- Pulumi: Everything (Helm charts + application deployments + cluster management)
- Helm/Kustomize: Deprecated

**Rationale**:
1. **Tool Consolidation**: 3 tools (Helm + Kustomize + Pulumi) → 1 tool (Pulumi)
2. **Dynamic Infrastructure**: Pulumi excels at ephemeral/per-PR resources
3. **Type Safety**: TypeScript catches errors before deployment
4. **State Management**: Full deployment history and rollback capability
5. **DRY Principle**: Shared components reused across local, preview, production
6. **Better Local Dev**: Simpler Minikube workflow (`pulumi up` vs `helmfile + kubectl`)

**Migration Scope**:
- ✅ Helm charts (cert-manager, nginx-gateway) → Pulumi Helm provider
- ✅ Kustomize base manifests → Pulumi TypeScript components
- ✅ Environment overlays → Pulumi stacks with configurations
- ✅ Image registry migration: DockerHub → GitHub Container Registry (ghcr.io)
- ✅ Per-environment database management (local, preview, production)

**Migration Order**:
1. **local** (Minikube) - Test locally first, validate workflow
2. **preview** (preview-pr-*) - Automated preview environments on DigitalOcean
3. **production** (DigitalOcean cluster) - Live site deployment

**Backward Compatibility**:
- Existing Kustomize files remain at `infrastructure/kubernetes/` until ALL migration phases complete
- Files will be moved to `infrastructure/kubernetes-deprecated/` only after Phase 8 (production migration) succeeds
- After deprecation, preserved for 6 months as reference (can rollback via git history if needed)
- Deployment patterns remain identical (same Kubernetes resources, just defined in TypeScript)

---

## Deployment Gating (Open Source Safety)

### Policy

- Build and test steps may run automatically on all pull requests
- Infrastructure deployment and cluster access MUST require maintainer approval
- Preview deployments MUST NOT execute automatically for forked or untrusted PRs

### Mechanism

- Preview deployment jobs SHALL target a protected deployment environment
- The environment SHALL require manual approval by the maintainer
- Deployment secrets SHALL be scoped to the protected environment only

### Container Registry Strategy

**Migration to GitHub Container Registry (ghcr.io)**:

**Why ghcr.io instead of DockerHub**:
- ✅ No pull rate limits for authenticated users
- ✅ Native GitHub Actions integration (automatic authentication)
- ✅ Free for public repositories
- ✅ Image digests natively supported for build-once-deploy-many
- ✅ Packages automatically linked to repository

**Authentication**:
- Builds: GitHub Actions uses `secrets.GHCR_TOKEN` (Personal Access Token with `write:packages` scope)
- Registry username: `davidbyoung` (repository owner)
- **Why PAT instead of `GITHUB_TOKEN`**: For OSS projects, external contributors' `GITHUB_TOKEN` lacks permission to push to the repository owner's ghcr.io registry. A PAT ensures all builds (internal + external PRs) can push images.
- **Note**: Cannot use `GITHUB_` prefix for secret names (reserved by GitHub)
- Image naming:
  - Preview: `ghcr.io/aphiria/aphiria.com-{web|api|build}:pr-{PR_NUMBER}`
  - Production: `ghcr.io/aphiria/aphiria.com-{web|api}@sha256:{digest}`

**Image Promotion Flow**:
1. PR opened → Build images with PR tag
2. Preview deployed → Uses digest from PR build
3. PR merged → Tag digest as `latest` or version tag
4. Production deployed → References same digest tested in preview

---

## Key Entities

### Ephemeral Environment
- Attributes:
    - PR number
    - unique URLs (web + API)
    - status (provisioning / ready / failed / destroying)
    - deployed commit SHA
    - Kubernetes namespace: `preview-pr-{PR_NUMBER}`
    - Deployments: `web`, `api` (within namespace)
    - Services: `web`, `api` (within namespace)
    - Database: `aphiria_pr_{PR_NUMBER}` (logical database in shared PostgreSQL instance)
    - Jobs: `db-migration` (runs Phinx migrations + LexemeSeeder, within namespace)
- Lifecycle:
    - created on approved PR deployment
    - namespace created → database created → migrations run → LexemeSeeder populates search index → web/API deployed
    - updated on PR commits (re-runs migrations/seeder if needed)
    - destroyed on PR close or merge → database dropped → namespace deleted → Pulumi stack destroyed
    - **Note**: Base infrastructure (cluster, PostgreSQL instance, Gateway) persists after PR closure

---

## Success Criteria (Mandatory)

- **SC-001**: Preview environments are accessible within 5 minutes of approval
- **SC-002**: Both web and API preview URLs are posted to PRs after successful deployment
- **SC-003**: ≥95% of preview deployments succeed without manual intervention
- **SC-004**: Preview environments are destroyed on PR close or merge
- **SC-005**: No orphaned preview resources remain after PR closure
- **SC-006**: Maintainer approval is required before any privileged deployment

---

## Infrastructure & State Management

### Kubernetes Cluster Strategy

#### **Actual Implementation: Dedicated Preview Cluster (2025-12-21)**

The preview infrastructure uses a **dedicated Kubernetes cluster** separate from production, provisioned by the `preview-base` Pulumi stack.

**Persistent Base Infrastructure (Always Running):**

The following infrastructure persists **independently of PR lifecycle** and remains running even when zero PRs are active:

- **FR-018**: ✅ **IMPLEMENTED** - Dedicated preview Kubernetes cluster (`aphiria-com-preview-cluster` on DigitalOcean)
- **FR-019**: ✅ **IMPLEMENTED** - Dedicated cluster (not shared with production) for complete isolation
- **FR-020**: ✅ **IMPLEMENTED** - PostgreSQL 16 instance runs continuously in `default` namespace of preview cluster
- **FR-021**: ✅ **IMPLEMENTED** - nginx-gateway-fabric Gateway API with wildcard TLS (`*.pr.aphiria.com`, `*.pr-api.aphiria.com`)
- **FR-022**: ⚠️ **PENDING** - DNS wildcard records must be manually configured in DigitalOcean DNS (not automated)
- **FR-023**: ✅ **IMPLEMENTED** - GitHub Container Registry (ghcr.io) accessible with GHCR_TOKEN

**Architecture Decision: Separate Clusters (2025-12-21):**

Originally planned to share production cluster with namespace isolation, but **pivoted to dedicated preview cluster** for:
1. **Complete isolation**: Preview cluster failures cannot impact production
2. **Simpler Pulumi state**: No shared cluster resources between preview-base and production stacks
3. **Independent scaling**: Preview cluster uses smaller DigitalOcean node pool optimized for ephemeral workloads
4. **Easier operations**: Can destroy entire preview cluster for maintenance without production risk
5. **Cost optimization**: Preview cluster uses lower-cost DigitalOcean droplets

**Trade-offs:**
- ✅ **Pro**: Reduced operational complexity, complete production isolation
- ❌ **Con**: Higher cost (2 clusters vs 1), but acceptable for improved reliability

**Rationale:**
- Fast provisioning: No cluster spin-up time for first PR (cluster pre-provisioned)
- Predictable costs: Cluster costs are constant, not per-PR
- Simplified logic: No "detect last PR closed" complexity
- Industry standard: Matches Vercel, Render, Railway architecture

**Ephemeral Resources (Created/Destroyed per PR):**

- **FR-024**: Ephemeral environments MUST be isolated via Kubernetes namespaces
- **FR-025**: Each namespace MUST follow the pattern: `preview-pr-{PR_NUMBER}`
- **FR-026**: NetworkPolicies MUST prevent cross-namespace communication between ephemeral environments
- **FR-027**: ResourceQuotas MUST be applied to each ephemeral namespace to prevent resource exhaustion (2 CPU, 4Gi memory, 5 pods max)
- **FR-053**: Gateway/Ingress routes for preview environments MUST include connection limiting annotations to prevent abuse
- **FR-028**: When a PR closes, its namespace and all contained resources MUST be destroyed
- **FR-098**: When a PR closes, its database MUST be dropped from the shared PostgreSQL instance

**Per-PR Resources (Namespace-Scoped):**
- Kubernetes namespace: `ephemeral-pr-{PR_NUMBER}`
- Deployments: `web`, `api` (within PR namespace)
- Services: `web`, `api` (within PR namespace)
- ConfigMaps: `env-vars` (within PR namespace)
- Secrets: `env-var-secrets` (within PR namespace)
- Database: `aphiria_pr_{PR_NUMBER}` (logical database within shared PostgreSQL)
- Kubernetes Job: `db-migration` (runs Phinx migrations + LexemeSeeder)

### Database Strategy

**Persistent PostgreSQL Instance:**
- **FR-099**: A single PostgreSQL instance MUST run continuously in the cluster (independent of PR lifecycle)
- **FR-100**: The PostgreSQL instance persists even when zero PRs are active
- **FR-101**: All ephemeral environments MUST share this single PostgreSQL instance

**Per-PR Database Isolation:**
- **FR-103**: Each ephemeral environment MUST use a dedicated logical database: `aphiria_pr_{PR_NUMBER}`
- **FR-104**: Database users MUST be scoped per-PR or use a shared preview user with appropriate permissions
- **FR-105**: Database names MUST be passed via ConfigMap: `DB_NAME=aphiria_pr_{{ PR_NUMBER }}`
- **FR-106**: Application code MUST support dynamic database names via environment variables
- **FR-107**: On teardown, the PR-specific database MUST be dropped: `DROP DATABASE aphiria_pr_{PR_NUMBER}`
- **FR-108**: The PostgreSQL instance itself MUST NOT be destroyed when PRs close

**Rationale:**
- **Cost-effective**: Single PostgreSQL deployment vs. multiple instances per PR
- **Fast provisioning**: Creating a database is faster than deploying a full PostgreSQL instance
- **Isolation**: Separate databases provide security isolation equivalent to separate instances
- **Standard practice**: Industry-standard approach for preview environments (Vercel, Render, Fly.io)

### Pulumi Stack Strategy

#### **Actual Implementation (2025-12-22)**

**Base Infrastructure Stack (Persistent):**
- **FR-109**: ✅ **IMPLEMENTED** - `preview-base` stack manages persistent preview infrastructure
- **FR-110**: ✅ **IMPLEMENTED** - Stack name: `preview-base` (exact match)
- **FR-111**: ✅ **IMPLEMENTED** - Stack manages: DigitalOcean cluster, PostgreSQL deployment, Gateway API, Helm charts (cert-manager, nginx-gateway-fabric)
- **FR-112**: ✅ **IMPLEMENTED** - Base stack persists independently (never destroyed by PR workflows)
- **FR-113**: ✅ **IMPLEMENTED** - `ensure-base-stack` job in `deploy-preview.yml` checks and creates stack if missing
- **FR-043a**: ✅ **IMPLEMENTED** - Idempotent deployment with retry logic (3 attempts, progressive backoff)
- **FR-054**: ✅ **IMPLEMENTED** - Base infrastructure updates are manual (not automated in PR workflows)

**Stack Outputs** (exported by `preview-base`):
- `kubeconfig`: Kubernetes cluster configuration for kubectl/Pulumi access
- `clusterId`: DigitalOcean cluster ID (used for validation)
- `postgresqlHost`: Service name for PostgreSQL (`db` in `default` namespace)
- `gatewayName`: Gateway API Gateway resource name
- `tlsSecretName`: Wildcard TLS certificate secret name

**Per-PR Stacks (Preview):**
- **FR-114**: ✅ **IMPLEMENTED** - Each PR gets dedicated stack (e.g., `preview-pr-123`)
- **FR-115**: ✅ **IMPLEMENTED** - Stack naming: `preview-pr-{PR_NUMBER}` (auto-created in `deploy-preview.yml`)
- **FR-116**: ✅ **IMPLEMENTED** - Pulumi Cloud backend (supports concurrent operations)
- **FR-117**: ✅ **IMPLEMENTED** - Full automation: stack creation (deploy), destruction (cleanup)
- **FR-118**: ✅ **IMPLEMENTED** - `pulumi destroy` removes namespace, services, deployments; database drop verified in cleanup workflow
- **FR-119**: ✅ **IMPLEMENTED** - Per-PR stacks reference base stack via `StackReference`, never modify base resources
- **FR-120**: ✅ **IMPLEMENTED** - Stacks isolated by Pulumi project (`davidbyoung/aphiria-com-infrastructure`)

**Stack Configuration** (per-PR):
- `prNumber`: PR number (used for namespace, database names, URLs)
- `webImageDigest`: Web container image digest (from build workflow PR labels)
- `apiImageDigest`: API container image digest (from build workflow PR labels)
- `baseStackReference`: Reference to `preview-base` stack (`davidbyoung/aphiria-com-infrastructure/preview-base`)
- `postgresql:user`: From Pulumi ESC `aphiria.com/Preview` (e.g., `aphiria`)
- `postgresql:password`: From Pulumi ESC `aphiria.com/Preview` (secret)

**Pulumi ESC Integration (Declarative via Stack YAML):**
- **ESC Environment**: `aphiria.com/Preview`
- **Binding Method**: Declarative via `environment:` property in stack YAML files (NOT CLI binding)
- **Stack YAML Configuration**:
  ```yaml
  # Pulumi.preview-base.yml
  environment:
    - aphiria.com/Preview
  ```
  ```yaml
  # Pulumi.preview-pr-{N}.yml (created dynamically)
  environment:
    - aphiria.com/Preview
  config:
    prNumber: "123"
    webImageDigest: "sha256:abc..."
    apiImageDigest: "sha256:def..."
    baseStackReference: "davidbyoung/aphiria-com-infrastructure/preview-base"
  ```
- **Secrets loaded**: PostgreSQL credentials, DigitalOcean access token (cluster management)
- **Workflow integration**: Stack YAML files created with `environment:` property; no CLI `pulumi config env add` commands needed

### Rationale

**Separate base and per-PR stacks because:**
- Base infrastructure persists across all PRs (shared cost)
- Per-PR stacks only manage ephemeral resources
- Prevents accidental destruction of shared infrastructure
- Clear separation of persistent vs. ephemeral state
- Enables safe parallel PR deployments without base infrastructure contention

**Automatic base stack initialization because:**
- Eliminates manual bootstrapping steps
- Pulumi is idempotent - checking/deploying existing stack is fast (~1-2 seconds)
- Self-healing - base infrastructure automatically recreated if deleted
- Better developer experience - opening a PR "just works"
- Follows infrastructure-as-code best practices

---

## Assumptions

1. Application is containerized
2. CI/CD is handled via GitHub Actions
3. DNS supports wildcard subdomains
4. Preview environments do not use production secrets
5. Preview infrastructure cost is acceptable for short-lived environments
6. Maximum concurrent previews is limited by cluster capacity
7. Pulumi backend supports multiple concurrent stacks
8. Pulumi credentials allow stack creation/deletion operations
9. Documentation build (from https://github.com/aphiria/docs) completes successfully in Docker build stage using full documentation set (all versions, all pages)
10. LexemeSeeder can access compiled documentation files in the API container filesystem

### Documentation Structure

- **FR-069**: README.md MUST focus on local development and contribution workflows only
- **FR-070**: Infrastructure and secrets management documentation MUST be separated into `SECRETS.md`
- **FR-071**: `SECRETS.md` MUST document all GitHub repository secrets, rotation procedures, and required scopes

---

## Non-Functional Requirements

### Performance

- **NFR-001** (Build speed): Docker builds MUST use layer caching to avoid rebuilding unchanged dependencies and documentation on every CI run
- **NFR-002** (Cache strategy): Docker builds MUST use registry-based caching (GitHub Container Registry) to share layers across workflow runs
- **NFR-003** (Build time target): Full builds (including documentation compilation) SHOULD complete within 10 minutes on cache miss, <2 minutes on cache hit
- **NFR-004** (Deployment speed): Preview environments MUST be accessible within 5 minutes of approval

### Cost Optimization

- **NFR-005**: Shared PostgreSQL instance reduces preview environment costs by 70-80% vs. per-PR instances
- **NFR-006**: Preview environments use minimal replicas (1 web, 1 API) vs. production (2+ replicas)
- **NFR-007**: ResourceQuotas prevent runaway resource usage (2 CPU, 4Gi memory max per preview)

### Reliability

- **NFR-008**: Preview deployments MUST NOT impact production stability or performance
- **NFR-009**: Failed preview deployments MUST NOT leave orphaned resources (Pulumi state tracking ensures cleanup)
- **NFR-010**: Database migrations MUST be idempotent and reversible

### Development Environment

- **NFR-011**: Node.js version MUST be consistent across local development (install.sh) and CI/CD workflows
- **NFR-012**: Node.js 20.x MUST be used for Pulumi TypeScript compilation
- **NFR-013**: GitHub Actions workflows MUST use `actions/setup-node@v4` with explicit version specification

### Infrastructure Automation Principles

- **NFR-014**: Infrastructure tasks requiring cluster-internal resources MUST run inside the cluster (Kubernetes Jobs, init containers)
- **NFR-015**: Port-forwarding (`kubectl port-forward`) MUST NOT be used in CI/CD workflows (debugging tool only)
- **NFR-016**: Background processes MUST NOT be managed in GitHub Actions workflows (use Kubernetes Jobs instead)
- **NFR-017**: Database initialization MUST use Kubernetes Jobs provisioned by Pulumi, not external providers requiring network workarounds

**Rationale**: Port-forwarding and process management in CI/CD creates race conditions, requires cleanup handling, and is unreliable. Kubernetes Jobs are the standard pattern for cluster-internal setup tasks and are managed declaratively by Pulumi.

---

## Application Code Requirements

### Database Connection Configuration

The application already supports dynamic database configuration via environment variables (configured in `src/Databases/Binders/SqlBinder.php`):

```php
$dsn = sprintf(
    'pgsql:host=%s;dbname=%s;port=%d;options=\'--client_encoding=utf8\'',
    getenv('DB_HOST'),
    getenv('DB_NAME'),  // ← Reads from environment
    getenv('DB_PORT')
);
```

**Requirements:**
- **FR-055**: The application MUST read database name from `DB_NAME` environment variable
- **FR-056**: Phinx configuration MUST use the same PDO connection (already implemented in `phinx.php`)
- **FR-057**: LexemeSeeder MUST operate on the database specified by `DB_NAME` environment variable

**Verification:**
- ✅ `SqlBinder.php` already reads `DB_NAME` from environment
- ✅ `phinx.php` already uses container-resolved PDO connection
- ✅ No code changes required for PR-specific database support

### Database Provisioning Workflow

The db-migration Kubernetes Job must:

1. **Create database** (if not exists):
   ```sql
   CREATE DATABASE aphiria_pr_{{ PR_NUMBER }};
   ```

2. **Run Phinx migrations** with `DB_NAME=aphiria_pr_{{ PR_NUMBER }}`:
   ```bash
   php vendor/bin/phinx migrate -e production
   ```

3. **Run LexemeSeeder** with same `DB_NAME`:
   ```bash
   php vendor/bin/phinx seed:run -s LexemeSeeder -e production
   ```

### Database Teardown Workflow

On PR close/merge, Pulumi must:

1. **Drop database**:
   ```sql
   DROP DATABASE IF EXISTS aphiria_pr_{{ PR_NUMBER }};
   ```

2. **Verify cleanup**:
   - Query `pg_database` to ensure database is removed
   - Fail stack destroy if database still exists (prevents orphaned data)

---

## Polish Tasks

### Secrets Management

- **T073**: Document PAT (Personal Access Token) management strategy
  - Add to SECRETS.md: DEPLOYMENT_APPROVAL_TOKEN creation, scopes, rotation policy
  - Include instructions for creating PAT at https://github.com/settings/tokens/new
  - Required scopes: `repo`, `read:org`
  - Expiration recommendation: 1 year with calendar reminder for rotation
  - Describe how to update secret in repository settings
- **T074**: Audit and clean up repository secrets
  - Review all secrets in repository settings
  - Identify secrets that are no longer used (from old Helm/Helmfile/Terraform deployments)
  - Document which secrets are required for current Pulumi-based workflows
  - Remove deprecated secrets safely
  - Update SECRETS.md with current secrets inventory
- **T075**: Audit and clean up environment secrets
  - Review secrets configured in each environment (preview, production)
  - Identify which secrets should be environment-specific vs repository-wide
  - Document environment secret strategy in SECRETS.md
  - Remove deprecated environment secrets safely

### Workflow Refactoring

- **T070**: Create reusable deployment workflow (`.github/workflows/deploy.yml`) with `workflow_call` trigger
  - Parameterize: stack name, environment, image digests, Pulumi config values, PostgreSQL password
  - Support both `up` (deploy) and `destroy` (cleanup) operations
  - Include Pulumi preview, stack selection/creation, config setting, and deployment steps
- **T071**: Refactor `preview-deploy.yml` to call reusable `deploy.yml` workflow
  - Rename `preview-deploy.yml` → `deploy-preview.yml` (follows `{{ACTION}}-{{TARGET}}` convention)
  - Pass preview-specific parameters to reusable workflow
  - Keep preview environment protection and auto-approval logic in caller
- **T072**: Create `deploy-production.yml` workflow using reusable `deploy.yml` workflow (future production deployment)

### Documentation Updates

- **T069**: Fix CI badge in README.md to point to correct workflow(s) (currently points to old 'ci' workflow)

---

## Out of Scope

- Time-based preview expiration
- Performance or load testing
- Multi-region previews
- Long-lived staging environments
- Automated base infrastructure updates (Kubernetes/PostgreSQL version upgrades)
- Per-IP rate limiting or WAF integration
