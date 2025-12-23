# Implementation Tasks: Pull Request Ephemeral Environments

**Branch**: `001-ephemeral-environment`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) (v2025-12-22) | **Data Model**: [data-model.md](./data-model.md)
**Constitution**: v1.1.0 (includes CI/CD & Infrastructure Reuse principle)

---

## Overview

This document organizes implementation tasks by user story to enable independent, incremental delivery. Each phase represents a complete, testable increment.

**Total Tasks**: 82 tasks (Updated 2025-12-22 to align with plan.md and constitution v1.1.0)
**User Stories**: 3 (P1, P2, P3)
**Parallel Opportunities**: 28+ tasks can run in parallel within phases
**Constitution Alignment**: All tasks comply with Aphiria.com Constitution v1.1.0

---

## Implementation Strategy

### Architecture Decision (2025-12-20, Reaffirmed 2025-12-22)

**Full Pulumi Migration**: Consolidate ALL infrastructure (local, preview, production) from Helm/Kustomize to Pulumi for tool consolidation, type safety, and DRY principles (Constitution Principle VI).

**Migration Order**: local → preview → production

### MVP Scope (User Story 1 - P1)

Deploy and update ephemeral preview environments with maintainer approval. This provides core value and validates the infrastructure.

### Incremental Delivery

1. **Phase 0**: Full Pulumi Migration (shared components)
2. **Phase 1**: Setup preview-specific infrastructure
3. **Phase 2**: Deploy base infrastructure (persistent stack)
4. **Phase 3**: US1 - Core preview deployment (create, update)
5. **Phase 4**: US2 - Public access validation (already implemented by US1)
6. **Phase 5**: US3 - Automatic cleanup on PR close
7. **Phase 6**: Polish & documentation
8. **Phase 7**: Migrate local to Pulumi
9. **Phase 8**: Migrate production to Pulumi + create reusable workflows (Constitution Principle VI)

---

## Task Dependency Graph

```
Phase 0 (Pulumi Migration - Shared Components)
  ↓
Phase 1 (Setup - Preview Project)
  ↓
Phase 2 (Base Infrastructure Stack - migrated to Pulumi)
  ↓
Phase 3 (US1 - Preview Deployment using shared components)
  ↓
Phase 4 (US2 - Public Access validation)
  ↓
Phase 5 (US3 - Cleanup)
  ↓
Phase 6 (Polish)
  ↓
Phase 7 (Migrate local to Pulumi)
  ↓
Phase 8 (Migrate production to Pulumi + reusable workflows)
```

**Story Dependencies**:
- Phase 0 creates shared components used by all subsequent phases
- US1 (P1): No dependencies - can start immediately after Phase 2
- US2 (P2): Depends on US1 (uses same infrastructure)
- US3 (P3): Depends on US1 (destroys what US1 creates)
- Phase 8: Addresses Constitution Principle VI (CI/CD & Infrastructure Reuse)

---

## Phase 0: Pulumi Migration - Shared Components

**Goal**: Create reusable Pulumi components that will be used across local, preview, and production stacks

**Rationale**: Consolidate infrastructure tooling from Helm/Kustomize/Pulumi → Pulumi only. This enables "test what you deploy" validation and eliminates tool sprawl (Constitution Principle VI).

### Tasks

- [X] M001 Create shared Pulumi project structure at `infrastructure/pulumi/`
- [X] M002 Initialize Pulumi project with TypeScript in `infrastructure/pulumi/`
- [X] M003 [P] Install dependencies: @pulumi/kubernetes, @pulumi/pulumi, @pulumi/digitalocean in `infrastructure/pulumi/package.json`
- [X] M004 [P] Create shared types definition file: `infrastructure/pulumi/components/types.ts`
- [X] M005 Create shared Helm chart component: `infrastructure/pulumi/components/helm-charts.ts` (cert-manager, nginx-gateway)
- [X] M006 [P] Create shared Gateway component: `infrastructure/pulumi/components/gateway.ts` (Gateway API resources, TLS certificates)
- [X] M007 [P] Create shared PostgreSQL component: `infrastructure/pulumi/components/database.ts` (deployment, service, database creation)
- [X] M008 Create shared web deployment component: `infrastructure/pulumi/components/web-deployment.ts` (nginx, js-config ConfigMap)
- [X] M009 Create shared API deployment component: `infrastructure/pulumi/components/api-deployment.ts` (nginx + PHP-FPM, initContainer pattern)
- [X] M010 [P] Create shared db-migration job component: `infrastructure/pulumi/components/db-migration.ts` (Phinx + LexemeSeeder)
- [X] M011 [P] Create shared HTTPRoute component: `infrastructure/pulumi/components/http-route.ts` (Gateway API routing)
- [X] M012 [P] Create Kubernetes utilities component: `infrastructure/pulumi/components/kubernetes.ts` (namespace, ResourceQuota, NetworkPolicy)
- [X] M013 Create component index: `infrastructure/pulumi/components/index.ts` (barrel file for exports)
- [X] M014 Document shared component usage in `infrastructure/pulumi/README.md`

**Completion Criteria**:
- ✅ All shared components implemented with TypeScript type safety
- ✅ Components support environment-specific configuration (local, preview, production)
- ✅ Components match existing Kustomize/Helm behavior exactly
- ✅ README documents component parameters and usage examples
- ✅ Components exported via index.ts for clean imports

**Parallel Opportunities**: M003-M013 can be developed in parallel after M002

---

## Phase 1: Setup & Prerequisites

**Goal**: Initialize preview-specific project structure and configure base requirements

### Tasks

- [X] T001 Create Pulumi project directory structure at `infrastructure/pulumi/`
- [X] T002 Initialize Pulumi project with TypeScript in `infrastructure/pulumi/`
- [X] T003 [P] Create `.gitignore` entries for Pulumi state and node_modules in `infrastructure/pulumi/.gitignore`
- [X] T004 [P] Configure Pulumi backend (Pulumi Cloud) - already configured
- [X] T005 Install Pulumi Kubernetes provider in `infrastructure/pulumi/package.json`
- [X] T006 [P] Install Pulumi DigitalOcean provider in `infrastructure/pulumi/package.json`
- [X] T007 [P] Create GitHub Actions workflow directory structure at `.github/workflows/`
- [X] T008 Document Pulumi stack naming conventions in `infrastructure/pulumi/README.md`

**Completion Criteria**:
- ✅ Pulumi project initialized and can run `pulumi preview`
- ✅ Dependencies installed
- ✅ Project structure matches plan.md

---

## Phase 2: Foundational - Base Infrastructure Stack

**Goal**: Deploy persistent infrastructure (preview-base stack) that supports all preview environments

**Independent Test**: Verify base stack deploys successfully and outputs expected values (PostgreSQL service, Gateway reference, wildcard TLS secret, kubeconfig)

### Tasks

- [X] T009 Create base infrastructure Pulumi program in `infrastructure/pulumi/stacks/preview-base.ts`
- [X] T010 [P] Provision DigitalOcean Kubernetes cluster in base stack (`infrastructure/pulumi/stacks/preview-base.ts`)
- [X] T011 [P] Define PostgreSQL deployment in base stack (`infrastructure/pulumi/stacks/preview-base.ts`)
- [X] T012 [P] Deploy Helm charts (cert-manager, nginx-gateway-fabric) in base stack (`infrastructure/pulumi/stacks/preview-base.ts`)
- [X] T013 [P] Define Gateway API configuration in base stack (`infrastructure/pulumi/stacks/preview-base.ts`)
- [X] T014 Configure wildcard TLS certificate (`*.pr.aphiria.com`, `*.pr-api.aphiria.com`) via cert-manager in `infrastructure/pulumi/stacks/preview-base.ts`
- [X] T015 Create DNS wildcard records (`*.pr.aphiria.com`, `*.pr-api.aphiria.com`) in DigitalOcean DNS
  - **Why**: Preview environments require DNS records pointing to the Gateway LoadBalancer IP for browser access
  - **Action**: Add `digitalocean.DnsRecord` resources to `preview-base.ts` that create wildcard A records pointing to Gateway LoadBalancer external IP
  - **File**: `infrastructure/pulumi/stacks/preview-base.ts`
  - **DNS Records Needed**:
    - `*.pr.aphiria.com` → A record → Gateway LoadBalancer IP
    - `*.pr-api.aphiria.com` → A record → Gateway LoadBalancer IP
  - **Implementation**:
    1. Get the nginx-gateway LoadBalancer Service: `k8s.core.v1.Service.get("nginx-gateway-svc", pulumi.interpolate`${gateway.gatewayNamespace}/nginx-gateway-nginx-gateway-fabric`, { provider: k8sProvider })`
    2. Extract LoadBalancer IP: `gatewayService.status.loadBalancer.ingress[0].ip`
    3. Create DNS records:
       - `new digitalocean.DnsRecord("preview-web-dns", { domain: "aphiria.com", type: "A", name: "*.pr", value: loadBalancerIp })`
       - `new digitalocean.DnsRecord("preview-api-dns", { domain: "aphiria.com", type: "A", name: "*.pr-api", value: loadBalancerIp })`
  - **Note**: Domain `aphiria.com` is already managed by DigitalOcean DNS (verified via `doctl`)
- [X] T016 Export base stack outputs (kubeconfig, clusterId, postgresqlHost, gatewayName, tlsSecretName) in `infrastructure/pulumi/stacks/preview-base.ts`
- [X] T017 Create `preview-base` Pulumi stack: `pulumi stack init preview-base`
- [X] T018 Bind preview-base stack to Pulumi ESC environment (`aphiria.com/Preview`) via `Pulumi.preview-base.yml`
- [X] T019 Deploy base stack: `pulumi up --stack preview-base`
- [X] T020 Verify PostgreSQL is running and accessible within cluster
- [X] T021 Verify Gateway configured with wildcard TLS
- [X] T022 [P] Document base stack outputs and usage in `infrastructure/pulumi/README.md`
- [X] T023 Implement retry logic for base stack deployment in `.github/workflows/deploy-preview.yml` (3 attempts, progressive backoff)

**Completion Criteria**:
- ✅ `preview-base` Pulumi stack deployed successfully
- ✅ DigitalOcean cluster provisioned (`aphiria-com-preview-cluster`)
- ✅ PostgreSQL running and accessible via service `db` in `default` namespace
- ✅ Gateway API configured and ready with wildcard TLS
- ✅ Wildcard TLS cert issued and stored as K8s Secret
- ✅ DNS records resolve to cluster load balancer (manual verification)
- ✅ Stack outputs available for preview stacks (via StackReference)
- ✅ Idempotent deployment with retry logic

---

## Phase 3: User Story 1 (P1) - Preview Pull Request Changes

**Goal**: Deploy and update ephemeral preview environments with maintainer approval

**User Story**: As a maintainer, I want to preview pull request changes in a live, isolated environment so that I can validate functionality and behavior before merging.

**Independent Test**:
1. Open test PR → approve deployment → verify environment accessible at `{PR}.pr.aphiria.com` (web) and `{PR}.pr-api.aphiria.com` (API)
2. Push new commit → verify environment updates with new image digest
3. Verify production can reference same image digest used in preview (build-once-deploy-many)

### Infrastructure Tasks

- [X] T024 [US1] Create preview stack Pulumi program in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T025 [P] [US1] Implement Kubernetes namespace creation in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T026 [P] [US1] Implement per-PR database creation logic in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T027 [P] [US1] Create ConfigMap generator with PR-specific values in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T028 [P] [US1] Create Secret generator for DB credentials (from Pulumi ESC) in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T029 [P] [US1] Implement ResourceQuota (2 CPU, 4Gi memory, 5 pods) in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T030 [P] [US1] Implement NetworkPolicy for namespace isolation in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T031 [US1] Create web Deployment (1 replica) with image digest reference in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T032 [US1] Create API Deployment (1 replica) with image digest reference in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T033 [P] [US1] Create web and API Services in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T034 [US1] Create HTTPRoute for web (`{PR}.pr.aphiria.com`) and API (`{PR}.pr-api.aphiria.com`) in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T035 [P] [US1] Add connection-level rate limiting to HTTPRoute in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T036 [US1] Create db-migration Job (Phinx migrations + LexemeSeeder) in `infrastructure/pulumi/stacks/preview-pr.ts`
- [X] T037 [US1] Export stack outputs (webUrl, apiUrl, databaseName, namespace) in `infrastructure/pulumi/stacks/preview-pr.ts`

### CI/CD Tasks

- [X] T038 [P] [US1] Create Docker build workflow in `.github/workflows/build-preview-images.yml`
- [X] T039 [US1] Implement multi-stage Docker builds (build, web, api) with caching in `.github/workflows/build-preview-images.yml`
- [X] T040 [US1] Implement image digest capture and PR label tagging in `.github/workflows/build-preview-images.yml`
- [X] T041 [US1] Create build master cache workflow in `.github/workflows/build-master-cache.yml`
- [X] T042 [US1] Create preview deployment workflow in `.github/workflows/deploy-preview.yml`
- [X] T043 [US1] Configure GitHub environment protection ("preview") with required reviewers in GitHub repository settings
- [X] T044 [US1] Implement workflow_run trigger to run deploy on master branch code in `.github/workflows/deploy-preview.yml`
- [X] T045 [US1] Implement maintainer check (admin/maintain permissions) in `.github/workflows/deploy-preview.yml`
- [X] T046 [US1] Implement auto-approval for maintainer PRs via GitHub API in `.github/workflows/deploy-preview.yml`
- [X] T047 [US1] Implement Pulumi stack initialization/selection in deployment workflow (`.github/workflows/deploy-preview.yml`)
- [X] T048 [US1] Pass PR number and image digests to Pulumi program via stack config in `.github/workflows/deploy-preview.yml`
- [X] T049 [US1] Implement deployment status polling (wait for pods ready) in `.github/workflows/deploy-preview.yml`
- [X] T050 [US1] Implement health checks (HTTP status validation) in `.github/workflows/deploy-preview.yml`
- [X] T051 [US1] Create PR comment with deployment status and URLs in `.github/workflows/deploy-preview.yml`
- [X] T052 [P] [US1] Add PR labels with image digests for production promotion tracking in `.github/workflows/build-preview-images.yml`

### Image Digest Propagation Tasks (Added 2025-12-23)

- [X] T052a [US1] **CRITICAL BUG FIX**: Migrate from PR label digest storage to workflow_dispatch inputs
  - **Why**: PR labels limited to 100 chars, but full SHA256 digests are 71 chars (`sha256:` + 64 hex). Current implementation truncates to 12 chars causing invalid image references.
  - **Action**: Update `build-preview-images.yml` to remove label-based digest storage (lines 190-228)
  - **File**: `.github/workflows/build-preview-images.yml`
  - **Status**: ✅ COMPLETED (2025-12-23)

- [X] T052b [US1] **CRITICAL BUG FIX**: Update build workflow to trigger deploy via workflow_dispatch with digest inputs
  - **Why**: Replace PR label approach with type-safe workflow inputs (enterprise pattern)
  - **Action**: Add `trigger-deploy` job that calls `workflow_dispatch` on `deploy-preview.yml` with `pr_number`, `web_digest`, `api_digest` as typed string inputs
  - **File**: `.github/workflows/build-preview-images.yml`
  - **Depends**: T052a
  - **Status**: ✅ COMPLETED (2025-12-23)

- [X] T052c [US1] **CRITICAL BUG FIX**: Update deploy workflow to accept workflow_dispatch inputs instead of reading PR labels
  - **Why**: Eliminate fragile label parsing, use explicit type-safe inputs
  - **Action**: Change `deploy-preview.yml` trigger from `workflow_run` to `workflow_dispatch` with inputs: `pr_number` (number), `web_digest` (string), `api_digest` (string)
  - **File**: `.github/workflows/deploy-preview.yml`
  - **Depends**: T052a
  - **Status**: ✅ COMPLETED (2025-12-23)

- [X] T052d [US1] **CRITICAL BUG FIX**: Remove digest extraction from PR labels in deploy workflow
  - **Why**: Read digests directly from workflow inputs instead of parsing labels
  - **Action**: Replace "Get image digests from PR labels" step (lines 526-567) with direct input references `${{ inputs.web_digest }}` and `${{ inputs.api_digest }}`
  - **File**: `.github/workflows/deploy-preview.yml`
  - **Depends**: T052c
  - **Status**: ✅ COMPLETED (2025-12-23)

- [X] T052e [US1] Add resource limits to db-init Job container
  - **Why**: Namespace ResourceQuota requires all containers to specify CPU/memory limits. Missing limits cause pod creation failures.
  - **Action**: Add `resources.requests` (100m CPU, 128Mi memory) and `resources.limits` (200m CPU, 256Mi memory) to db-init container spec
  - **File**: `infrastructure/pulumi/stacks/preview-pr.ts` (lines 169-176)
  - **Status**: ✅ COMPLETED (2025-12-23)

### Image Pull Secrets Task (Added 2025-12-23)

- [X] T052p [US1] **CRITICAL BUG FIX**: Create imagePullSecret for GHCR authentication
  - **Why**: Kubernetes cannot pull images from private GitHub Container Registry without credentials (401 Unauthorized error)
  - **Error**: `failed to authorize: failed to fetch anonymous token... 401 Unauthorized`
  - **Action**: Create Kubernetes Secret with GHCR credentials in both preview-base and preview-pr stacks
  - **Files**:
    - `infrastructure/pulumi/stacks/preview-base.ts` (create secret in default namespace)
    - `infrastructure/pulumi/stacks/preview-pr.ts` (copy secret to preview namespace OR reference from default)
  - **Implementation**:
    1. Add `ghcr` config to Pulumi ESC `aphiria.com/Preview` environment with GHCR_TOKEN
    2. Create imagePullSecret in preview-base:
       ```typescript
       const ghcrToken = config.requireSecret("ghcrToken");
       const imagePullSecret = new k8s.core.v1.Secret("ghcr-pull-secret", {
           metadata: { namespace: "default" },
           type: "kubernetes.io/dockerconfigjson",
           stringData: {
               ".dockerconfigjson": pulumi.interpolate`{"auths":{"ghcr.io":{"username":"davidbyoung","password":"${ghcrToken}"}}}`,
           },
       }, { provider: k8sProvider });
       ```
    3. Copy secret to preview-pr namespace OR use service account with imagePullSecrets
    4. Add `imagePullSecrets: [{ name: "ghcr-pull-secret" }]` to web and API Deployments in preview-pr.ts
  - **GHCR Token**: Use existing `GHCR_TOKEN` from repository secrets (same token used for pushing images)
  - **SpecKit Gap**: Image pull authentication was not considered during planning phase

- [X] T052q [US1] Document GHCR token setup in SECRETS.md
  - **Why**: GHCR authentication requires GitHub Personal Access Token (PAT) configured in Pulumi ESC, but SECRETS.md doesn't document how to create this token or what scopes are required
  - **Action**: Update `SECRETS.md` to document GHCR_TOKEN requirements for Kubernetes image pulling
  - **File**: `SECRETS.md`
  - **Depends**: T052p
  - **Documentation to add**:
    - **Secret Name**: `GHCR_TOKEN` (GitHub Container Registry token)
    - **Purpose**: Kubernetes authentication for pulling private images from ghcr.io (used in imagePullSecret)
    - **How to Create**: https://github.com/settings/tokens
    - **Required Scopes**:
      - `read:packages` - Pull container images from GitHub Container Registry
      - `write:packages` - Push container images to GitHub Container Registry (already configured for CI/CD)
    - **Pulumi ESC Configuration**:
      ```bash
      # Add to aphiria.com/Preview environment
      pulumi config set ghcr:token --secret --stack preview-base
      pulumi config set ghcr:username <github-username> --stack preview-base
      ```
    - **Repository Secret**: Already exists as `GHCR_TOKEN` for CI/CD image pushes (same token can be added to Pulumi ESC)
    - **Rotation Schedule**: Annually
    - **Rotation Procedure**: Generate new PAT → Update Pulumi ESC → Test deployment → Delete old PAT
  - **Note**: This token is DIFFERENT from WORKFLOW_DISPATCH_TOKEN (different scopes, different purpose)

### Workflow Dispatch Tasks (Added 2025-12-23)

- [X] T052m [US1] **CRITICAL BUG FIX**: Add PAT authentication for workflow_dispatch trigger
  - **Why**: Default `GITHUB_TOKEN` cannot trigger other workflows (403 error: "Resource not accessible by integration"). GitHub prevents this to avoid recursive workflow loops.
  - **Action**: Update `trigger-deploy` job in `build-preview-images.yml` to use a PAT from secrets instead of default token
  - **File**: `.github/workflows/build-preview-images.yml`
  - **Code Change**: Add `github-token: ${{ secrets.WORKFLOW_DISPATCH_TOKEN }}` to the github-script action
  - **Required**: Create PAT with `workflow` scope and add to repository secrets as `WORKFLOW_DISPATCH_TOKEN`
  - **Documentation**: https://docs.github.com/rest/actions/workflows#create-a-workflow-dispatch-event
  - **Error**: `HttpError: Resource not accessible by integration (403)` when using default GITHUB_TOKEN

- [X] T052n [US1] Document WORKFLOW_DISPATCH_TOKEN in SECRETS.md
  - **Why**: All PATs and secrets must be documented with scopes, rotation procedures, and usage context for maintainers
  - **Action**: Add new entry to `SECRETS.md` in the "Required Secrets" table and add rotation procedure section
  - **File**: `SECRETS.md`
  - **Depends**: T052m
  - **Documentation to add**:
    - **Secret Name**: `WORKFLOW_DISPATCH_TOKEN`
    - **Purpose**: Trigger preview deployment workflow from build workflow (default GITHUB_TOKEN cannot trigger workflows)
    - **PAT Scopes**: `workflow` (or `public_repo` + `workflow`)
    - **Rotation Schedule**: Annually
    - **Used By**: `build-preview-images.yml`
    - **Rotation procedure**: Step-by-step guide to generate new PAT, update secret, test, and cleanup old token

- [X] T052o [US1] **CRITICAL BUG FIX**: Fix workflow_dispatch ref parameter to use branch name instead of PR merge ref
  - **Why**: The `ref` parameter in `createWorkflowDispatch()` must be a branch or tag name. PR merge refs like `refs/pull/123/merge` are virtual refs and cannot trigger workflows (HTTP 422: "No ref found").
  - **Action**: Change `ref: context.ref` to `ref: 'master'` in the workflow_dispatch call
  - **File**: `.github/workflows/build-preview-images.yml:212`
  - **Error**: `RequestError [HttpError]: No ref found for: refs/pull/105/merge` (status 422)
  - **Root Cause**: PR workflows run on merge refs (`refs/pull/N/merge`), which are ephemeral and not valid for triggering other workflows
  - **Fix**: Use `'master'` branch to trigger the deployment workflow (ensures security-reviewed workflow code runs)
  - **SpecKit Gap**: Added "GitHub Actions Gotchas > workflow_dispatch Ref Parameter" section to CLAUDE.md to prevent future occurrences

### Label Cleanup Tasks (Added 2025-12-23)

- [X] T052f [US1] Remove obsolete `preview:images-built` label from build workflow
  - **Why**: Label is no longer needed since workflow_dispatch triggers deployment immediately after build. No polling or status checking required.
  - **Action**: Remove "Label PR as images built" step from `build-preview-images.yml` (lines 190-213)
  - **File**: `.github/workflows/build-preview-images.yml`
  - **Rationale**: With workflow_dispatch, the build job directly triggers deployment. The label served as a signal for workflow_run triggers, which have been removed.
  - **Status**: ✅ COMPLETED (2025-12-23)

- [X] T052g [US1] Remove label cleanup from preview cleanup workflow
  - **Why**: No longer adding `preview:images-built` label, so cleanup is unnecessary
  - **Action**: Remove PR label removal logic from `cleanup-preview.yml` (find and remove step that removes `preview:*`, `web-digest:*`, `api-digest:*` labels)
  - **File**: `.github/workflows/cleanup-preview.yml`
  - **Depends**: T052f
  - **Status**: ✅ COMPLETED (2025-12-23)

### GitHub Deployment Integration Tasks (Added 2025-12-23)

- [X] T052h [US1] Create GitHub Deployment object at start of preview deployment
  - **Why**: GitHub shows "No deployments" despite successful deploys because we have `deployments: write` permission but don't use the Deployment API. The "This branch was successfully deployed" banner comes from workflow completion, not actual Deployment objects.
  - **Action**: Add step after "Set PR number" in `deploy-preview.yml` that calls `github.rest.repos.createDeployment()` with environment `preview-pr-{PR_NUMBER}`, ref from PR head SHA, and task `deploy`. Store deployment ID in outputs.
  - **File**: `.github/workflows/deploy-preview.yml`
  - **Technical Details**:
    - Environment name: `preview-pr-${PR_NUMBER}` (e.g., `preview-pr-104`)
    - Auto-merge: false (manual approval required)
    - Required contexts: [] (no status checks required)
    - Payload: `{ pr_number, web_digest, api_digest, web_url, api_url }`
  - **GitHub API**: `POST /repos/{owner}/{repo}/deployments`

- [X] T052i [US1] Update deployment status to "in_progress" after approval
  - **Why**: Shows deployment is actively running in GitHub UI
  - **Action**: Add step after environment approval that calls `github.rest.repos.createDeploymentStatus()` with deployment ID from T052h, state "in_progress", and log URL pointing to workflow run
  - **File**: `.github/workflows/deploy-preview.yml`
  - **Depends**: T052h
  - **GitHub API**: `POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses`

- [X] T052j [US1] Update deployment status to "success" on successful completion
  - **Why**: Marks deployment as active in GitHub UI, shows in "Deployments" tab
  - **Action**: Add step at end of deploy job that calls `github.rest.repos.createDeploymentStatus()` with state "success", environment_url pointing to preview web URL, and log_url pointing to workflow run
  - **File**: `.github/workflows/deploy-preview.yml`
  - **Depends**: T052h, T052i
  - **GitHub API**: `POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses`

- [X] T052k [US1] Update deployment status to "failure" on error
  - **Why**: Shows failed deployment in GitHub UI for debugging
  - **Action**: Add cleanup step with `if: failure()` that calls `github.rest.repos.createDeploymentStatus()` with state "failure" and log_url
  - **File**: `.github/workflows/deploy-preview.yml`
  - **Depends**: T052h
  - **GitHub API**: `POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses`

- [X] T052l [US1] Mark deployment as "inactive" during cleanup
  - **Why**: Shows deployment is destroyed in GitHub UI
  - **Action**: Add step in `cleanup-preview.yml` that calls `github.rest.repos.createDeploymentStatus()` with state "inactive" for the preview environment
  - **File**: `.github/workflows/cleanup-preview.yml`
  - **Technical Details**: Query deployments by environment name `preview-pr-${PR_NUMBER}`, find active deployment, mark as inactive
  - **GitHub API**: `GET /repos/{owner}/{repo}/deployments`, `POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses`

### Update Flow Tasks

- [X] T053 [US1] Implement preview update logic (detect existing stack, run `pulumi up` with new digests) in `.github/workflows/deploy-preview.yml`
- [X] T054 [US1] Update PR comment on successful update with new commit SHA in `.github/workflows/deploy-preview.yml`

**Acceptance Validation** (Manual):
1. Open test PR with code changes
2. Workflow waits for approval (non-maintainer) or auto-approves (maintainer)
3. Verify environment provisions within 5 minutes
4. Access `{PR}.pr.aphiria.com` - see PR changes
5. Access `{PR}.pr-api.aphiria.com` - API works, search functional
6. Push new commit to PR
7. Verify automatic update (new image digest deployed)
8. Verify PR comment shows deployment status, URLs, and image digests
9. Verify PR labels contain image digests for production promotion

---

## Phase 4: User Story 2 (P2) - Share Preview with Stakeholders

**Goal**: Enable public access to preview environments for stakeholder validation

**User Story**: As a maintainer, I want to share a working preview URL so that reviewers or stakeholders can validate behavior without local setup.

**Independent Test**:
1. Share preview URL with non-GitHub user → verify accessible without login
2. Multiple users access preview simultaneously → verify no conflicts

### Tasks

- [X] T055 [US2] Verify HTTPRoute has no authentication requirements (public access already configured in US1)
- [ ] T056 [US2] Test preview URL access from incognito browser (no GitHub session)
- [X] T057 [US2] Document preview URL sharing instructions in `infrastructure/pulumi/QUICKSTART.md`

**Acceptance Validation** (Manual):
1. Open preview environment URL in incognito/private browser
2. Verify no authentication prompt appears
3. Verify full documentation site accessible
4. Share URL with stakeholder → confirm they can access
5. Multiple team members access simultaneously → no errors

**Note**: Most US2 functionality already implemented by US1 (public HTTPRoute, no auth middleware). This phase primarily validates the behavior.

---

## Phase 5: User Story 3 (P3) - Automatic Environment Cleanup

**Goal**: Automatically destroy preview environments when PRs close or merge

**User Story**: As a maintainer, I want preview environments to be destroyed automatically when a PR is no longer active so that resources are not wasted.

**Independent Test**:
1. Close test PR → verify environment destroyed within 5 minutes
2. Merge test PR → verify environment destroyed
3. Verify no orphaned resources (namespace, database, Pulumi stack)

### Tasks

- [X] T058 [US3] Create cleanup workflow in `.github/workflows/cleanup-preview.yml`
- [X] T059 [US3] Implement Pulumi destroy logic in cleanup workflow (`.github/workflows/cleanup-preview.yml`)
- [X] T060 [US3] Verify database drop in cleanup (query pg_database) in `.github/workflows/cleanup-preview.yml`
- [X] T061 [US3] Update PR comment on cleanup completion in `.github/workflows/cleanup-preview.yml`
- [X] T062 [US3] Add cleanup verification (check namespace and stack no longer exist) in `.github/workflows/cleanup-preview.yml`
- [X] T063 [US3] Remove PR labels (preview:*, web-digest:*, api-digest:*) in `.github/workflows/cleanup-preview.yml`

**Acceptance Validation** (Manual):
1. Create and deploy test preview environment
2. Close the PR without merging
3. Verify cleanup workflow triggers automatically
4. Verify preview URL becomes inaccessible
5. Verify namespace deleted: `kubectl get namespace preview-pr-{PR}` returns not found
6. Verify database dropped: Query PostgreSQL for `aphiria_pr_{PR}` → not found
7. Verify Pulumi stack removed: `pulumi stack ls` shows no `preview-pr-{PR}`
8. Verify PR labels removed
9. Repeat test with merged PR instead of closed

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Production readiness, documentation, and operational improvements

### Documentation

- [X] T064 [P] Create maintainer quickstart guide in `infrastructure/pulumi/QUICKSTART.md`
- [X] T065 [P] Document approval workflow in `.github/CONTRIBUTING.md`
- [X] T066 [P] Update project README with preview environment section in `README.md`
- [ ] T067 Migrate DEV-LOCAL-SETUP.md content into main README.md
- [ ] T068 Add local database connection, hosts file, and minikube dashboard instructions to README.md
- [ ] T069 Consolidate SECRETS.md and SECRETS-STRATEGY.md into single comprehensive SECRETS.md file
- [ ] T070 Clean up migration/import documentation (CLUSTER-IMPORT.md, migration sections in README)
- [ ] T071 Fix CI badge in README.md to point to correct workflow(s) (currently points to deprecated 'ci' workflow)

### Operational Enhancements

- [X] T072 [P] Add concurrency limits to prevent duplicate deployments for same PR in `.github/workflows/deploy-preview.yml`
- [X] T073 [P] Implement deployment timeout (fail after 10 minutes) in `.github/workflows/deploy-preview.yml`
- [X] T074 [P] Add error handling and detailed failure messages in `.github/workflows/deploy-preview.yml`

### Monitoring & Observability

- [X] T075 [P] Add deployment metrics to PR comment (build time, deploy time) in `.github/workflows/deploy-preview.yml`
- [X] T076 [P] Implement health check URL validation after deployment in `.github/workflows/deploy-preview.yml`

### Secrets Management (Pulumi ESC Integration)

- [X] T077 Create Pulumi ESC environments (`aphiria.com/Preview`, `aphiria.com/Production`)
- [X] T078 Migrate PostgreSQL passwords to Pulumi ESC
- [X] T079 Migrate DigitalOcean tokens to Pulumi ESC
- [X] T080 Bind preview-base stack to ESC via `Pulumi.preview-base.yml`
- [X] T081 Bind preview-pr stacks to ESC via stack YAML files
- [X] T082 Document PAT (Personal Access Token) management strategy in SECRETS.md
- [ ] T083 Audit and clean up repository secrets (remove deprecated KUBECONFIG, DIGITALOCEAN_ACCESS_TOKEN from repo-level)
- [ ] T084 Audit and clean up environment secrets (verify preview environment has correct secrets only)
- [X] T085 Document secrets rotation procedures and access control in SECRETS.md

### Workflow Cleanup

- [ ] T086 Update `test.yml` to remove Pulumi preview steps (infrastructure preview is now in deploy-preview.yml)
- [ ] T087 Remove `build-docker-image.yml` (replaced by `build-preview-images.yml`)
- [ ] T088 Remove `build-deploy.yml` (replaced by reusable workflow in Phase 8)

### Infrastructure Preview for OSS Safety

- [X] T089 [FR-066] Add Pulumi preview step to `deploy-preview.yml` that runs BEFORE environment approval gate
- [X] T090 [FR-067] Post Pulumi preview output as collapsible PR comment showing all infrastructure changes
- [X] T091 [FR-068] Ensure `pulumi preview` runs before `pulumi up` in all workflows

### TypeScript Linting and Code Quality

- [X] T092 Add ESLint to Pulumi TypeScript projects (`infrastructure/pulumi/package.json`)
- [X] T093 Add Prettier for code formatting to Pulumi TypeScript projects
- [X] T094 Create `npm run lint` script that runs ESLint
- [X] T095 Create `npm run format` and `npm run format:check` scripts for Prettier
- [X] T096 Update `test.yml` to run `npm run lint` and `npm run format:check` alongside `npm run build`
- [ ] T097 Remove numbered list comments (e.g., `// 1.`, `// 2.`, `// 3.`) from all code files - use descriptive section comments instead

**Completion Criteria**:
- ✅ All documentation complete and accurate
- ✅ Workflows handle edge cases gracefully
- ✅ Error messages actionable
- ✅ Deployment observability improved
- ✅ Secrets managed via Pulumi ESC
- ✅ Code quality tools (ESLint, Prettier) integrated
- ⚠️ Some cleanup tasks pending (documentation consolidation, deprecated workflow removal)

---

## Phase 7: Migrate Local to Pulumi

**Goal**: Migrate Minikube local development from Kustomize to Pulumi using shared components

**Why First**: Test migration locally before touching production. Low risk, validates shared component patterns.

### Tasks

- [X] M015 Create local stack program: `infrastructure/pulumi/stacks/local.ts`
- [X] M016 Import shared Helm chart component (cert-manager, nginx-gateway) in local stack
- [X] M017 [P] Import shared PostgreSQL component with local config in local stack
- [X] M018 [P] Import shared Gateway component with self-signed TLS for Minikube in local stack
- [X] M019 Import shared web deployment component with local configuration in local stack
- [X] M020 Import shared API deployment component with local configuration in local stack
- [X] M021 [P] Import shared db-migration job component in local stack
- [X] M022 [P] Import shared HTTPRoute component for local domains (aphiria.com, api.aphiria.com) in local stack
- [X] M023 Configure Pulumi stack config for local: `pulumi config set`
- [X] M024 Create `local` Pulumi stack: `pulumi stack init local`
- [X] M025 Deploy local stack to Minikube: `pulumi up --stack local`
- [X] M026 Verify local site accessible at https://www.aphiria.com
- [X] M027 Verify local API accessible at https://api.aphiria.com
- [X] M028 Test local rebuild cycle: build images → pulumi up → verify changes
- [X] M029 Document local Pulumi workflow in `infrastructure/pulumi/DEV-LOCAL-SETUP.md`

**Completion Criteria**:
- ✅ Minikube deployment fully managed by Pulumi
- ✅ `pulumi up --stack local` deploys complete local environment
- ✅ Site and API accessible at local domains
- ✅ Local development workflow faster than Kustomize (no `helmfile` + `kubectl apply` steps)
- ✅ Shared components validated in real environment

**Testing**:
1. Fresh Minikube: `minikube delete && minikube start`
2. Deploy: `cd infrastructure/pulumi && pulumi up --stack local`
3. Verify: Access https://www.aphiria.com and https://api.aphiria.com
4. Update: Change code, rebuild images, `pulumi up`, verify changes
5. Teardown: `pulumi destroy --stack local`

---

## Phase 8: Migrate Production to Pulumi + Reusable Workflows

**Goal**: Migrate DigitalOcean production deployment from Kustomize to Pulumi using shared components + create reusable workflows (Constitution Principle VI)

**Why Last**: Highest risk. Migrated after validating shared components in local and preview environments.

### Tasks

#### Refactor Infrastructure for Reusability (Constitution Principle VI)

- [ ] M030 Refactor preview-base and production stacks to use shared parameterized base infrastructure component (eliminate code duplication)
- [ ] M031 Create shared base infrastructure component that accepts environment-specific parameters (cluster config, node pool size, etc.) in `infrastructure/pulumi/components/`

#### CI/CD Workflow Refactoring (Constitution Principle VI)

- [ ] M032 Create reusable deployment workflow `.github/workflows/deploy.yml` with `workflow_call` trigger (parameterized for preview/production)
- [ ] M033 Refactor `deploy-preview.yml` to call reusable `deploy.yml` workflow with preview-specific parameters
- [ ] M034 Create `deploy-production.yml` workflow using reusable `deploy.yml` workflow for production deployments
- [ ] M035 Create reusable build workflow `.github/workflows/build-images.yml` (parameterized for preview/production)
- [ ] M036 Refactor `build-preview-images.yml` to use reusable `build-images.yml` workflow

#### Production Stack Implementation

- [ ] M037 Create production stack program: `infrastructure/pulumi/stacks/production.ts`
- [ ] M038 Import shared Helm chart component (cert-manager, nginx-gateway) in production stack
- [ ] M039 [P] Import shared PostgreSQL component with production config (persistent storage) in production stack
- [ ] M040 [P] Import shared Gateway component with Let's Encrypt production TLS in production stack
- [ ] M041 Import shared web deployment component with production configuration (2 replicas) in production stack
- [ ] M042 Import shared API deployment component with production configuration (2 replicas) in production stack
- [ ] M043 [P] Import shared db-migration job component in production stack
- [ ] M044 [P] Import shared HTTPRoute component for production domains (aphiria.com, api.aphiria.com, www.aphiria.com) in production stack
- [ ] M045 Create `Pulumi.production.yml` stack config file with ESC environment binding (`aphiria.com/Production`)
- [ ] M046 Create `production` Pulumi stack: `pulumi stack init production`
- [ ] M047 **DRY RUN**: `pulumi preview --stack production` (verify changes before applying)
- [ ] M048 **IMPORT EXISTING RESOURCES**: Use `pulumi import` for existing PostgreSQL, Gateway, Deployments to avoid recreation
- [ ] M049 Deploy production stack: `pulumi up --stack production` (off-peak hours)
- [ ] M050 Verify production site accessible at https://www.aphiria.com
- [ ] M051 Verify production API accessible at https://api.aphiria.com
- [ ] M052 Monitor for 24 hours: check logs, metrics, uptime
- [ ] M053 Update production deployment workflow to use Pulumi instead of Kustomize
- [ ] M054 Move old Kustomize files to `infrastructure/kubernetes-deprecated/`
- [ ] M055 Add deprecation notice to `infrastructure/kubernetes-deprecated/README.md`
- [ ] M056 Update main README.md deployment instructions (replace Kustomize with Pulumi)

**Completion Criteria**:
- ✅ Production fully managed by Pulumi
- ✅ Zero downtime during migration
- ✅ All production resources imported (no recreation)
- ✅ CI/CD workflows use reusable patterns (Constitution Principle VI compliant)
- ✅ Old Kustomize files archived with deprecation notice
- ✅ Documentation updated
- ✅ No workflow duplication across environments

**Safety Measures**:
1. **Import, don't recreate**: Use `pulumi import` for existing resources
2. **Dry run first**: `pulumi preview` to validate changes
3. **Off-peak deployment**: Deploy during low-traffic hours
4. **Rollback plan**: Keep Kustomize files until 24h post-migration
5. **Monitoring**: Watch logs and metrics for 24 hours
6. **Gradual migration**: Import resources incrementally, not all at once

**Testing**:
1. `pulumi preview --stack production` - verify no unexpected changes
2. Deploy during off-peak hours
3. Smoke tests: access all public URLs, verify search works
4. Monitor for 24 hours
5. If issues: `pulumi destroy --stack production` + redeploy via Kustomize

---

## Parallel Execution Opportunities

### Within Phase 0 (Migration - Shared Components)

Can parallelize after M002 (Pulumi project initialized):
- **Group A**: M003-M004 (dependencies, types)
- **Group B**: M005-M012 (all component implementations)
- **Group C**: M013-M014 (index + documentation)

### Within Phase 2 (Base Infrastructure)

Can parallelize after T009 (base stack created):
- **Group A**: T010, T011, T012, T013 (cluster, PostgreSQL, Helm, Gateway)
- **Group B**: T014, T016, T022 (TLS, outputs, documentation)
- T023 (retry logic) can be developed independently

### Within Phase 3 (US1)

Can parallelize after T024 (preview stack program created):
- **Group A**: T025-T030 (namespace, database, ConfigMap, Secret, quotas, policies)
- **Group B**: T031-T033 (Deployments and Services)
- **Group C**: T034-T035 (HTTPRoute and rate limiting)
- **Group D**: T038-T041, T052 (Build workflow - independent of Pulumi tasks)
- **Group E**: T042-T046 (Deploy workflow setup)

### Within Phase 6 (Polish)

- **Group A**: T064-T066 (documentation tasks)
- **Group B**: T072-T074 (operational enhancements)
- **Group C**: T075-T076 (observability)
- **Group D**: T077-T082, T085 (ESC migration - already complete)
- **Group E**: T092-T096 (TypeScript quality tools - already complete)

### Within Phase 7 (local Migration)

Can parallelize after M015 (local stack created):
- **Group A**: M016-M022 (all component imports)
- **Group B**: M023-M024 (stack configuration)

### Within Phase 8 (Production Migration)

Can parallelize after M037 (production stack created):
- **Group A**: M032-M036 (reusable workflows - can develop independently)
- **Group B**: M038-M044 (all component imports)
- **Group C**: M030-M031 (shared base component refactor)
- Must be sequential: M045-M049 (config → preview → import → deploy)

---

## Success Metrics

Track these throughout implementation:

- **SC-001**: Preview environments accessible within 5 minutes of approval ✅
- **SC-002**: Both web and API URLs posted to PRs ✅
- **SC-003**: ≥95% deployment success rate (minimal manual intervention) ✅
- **SC-004**: Cleanup completes on PR close/merge ✅
- **SC-005**: Zero orphaned resources after cleanup ✅
- **SC-006**: Maintainer approval required for all privileged deployments ✅

---

## Testing Strategy

### Manual Validation Per Phase

**Phase 2 (Base Infrastructure)**:
- Deploy `preview-base` stack ✅
- Verify all stack outputs present ✅
- Verify PostgreSQL accessible ✅
- Verify Gateway configured ✅

**Phase 3 (US1 - Core Deployment)**:
- Open test PR ✅
- Approve deployment ✅
- Verify preview environment accessible ✅
- Push new commit ✅
- Verify automatic update ✅
- Check image digest tracking ✅

**Phase 4 (US2 - Public Access)**:
- Access preview URL without authentication ✅
- Share URL with team member ✅
- Verify simultaneous access works ✅

**Phase 5 (US3 - Cleanup)**:
- Close test PR ✅
- Verify automatic cleanup ✅
- Verify all resources removed ✅

### No Automated Infrastructure Tests

Per constitution check (Principle III), this is infrastructure-only work. Validation is manual via GitHub Actions workflow execution and manual testing of preview environments. Pulumi TypeScript compilation and linting provide build-time validation.

---

## Implementation Notes

### Order of Execution (Updated 2025-12-22)

**Recommended Execution Order**:

1. **Phase 0 (M001-M014)**: Create shared Pulumi components - foundation for all stacks ✅
2. **Phase 1-2 (T001-T023)**: Setup preview infrastructure using shared components ✅
3. **Phase 3-6 (T024-T097)**: Implement preview environments (MVP) ✅ (most tasks complete)
4. **Phase 7 (M015-M029)**: Migrate local to Pulumi (validate shared components locally) ✅
5. **Phase 8 (M030-M056)**: Migrate production to Pulumi + create reusable workflows (Constitution Principle VI) ⚠️ (pending)

### Critical Path

**For MVP (Preview Environments)** ✅:
- Migration: M001-M014 ✅
- Setup: T001-T008 ✅
- Base: T009-T023 ✅
- US1: T024-T054 ✅
- **Status**: MVP complete and operational

**For Full Migration (All Environments)**:
- All MVP tasks ✅ + Phase 7 (local) ✅ + Phase 8 (production) ⚠️
- **Estimated Remaining**: ~27 tasks in Phase 8

### Rollback Strategy

**Preview Environments**:
1. Pulumi stack can be destroyed: `pulumi destroy --stack preview-pr-{PR}` ✅
2. Database automatically dropped during stack destroy ✅
3. GitHub workflow can be manually cancelled ✅
4. No persistent state outside Pulumi + Kubernetes ✅

**Production Migration Rollback**:
1. Keep Kustomize files in `infrastructure/kubernetes-deprecated/` for 24 hours
2. If issues after migration: `pulumi destroy --stack production`
3. Redeploy via Kustomize: `kubectl apply -k infrastructure/kubernetes/environments/prod`
4. Investigate issues, fix Pulumi stack, retry migration
5. Remove deprecated files only after 24h successful production operation

**Local Rollback**:
- Low risk (local only) ✅
- Worst case: `pulumi destroy --stack local` ✅
- Currently using Pulumi successfully ✅

---

## File Reference

**Shared Pulumi Components** (Phase 0):
- `infrastructure/pulumi/components/types.ts` - TypeScript type definitions
- `infrastructure/pulumi/components/helm-charts.ts` - Helm chart deployments
- `infrastructure/pulumi/components/gateway.ts` - Gateway API resources, TLS
- `infrastructure/pulumi/components/database.ts` - PostgreSQL deployment
- `infrastructure/pulumi/components/web-deployment.ts` - Web (nginx) deployment
- `infrastructure/pulumi/components/api-deployment.ts` - API (nginx + PHP-FPM) deployment
- `infrastructure/pulumi/components/db-migration.ts` - Database migration job
- `infrastructure/pulumi/components/http-route.ts` - Gateway API HTTPRoute
- `infrastructure/pulumi/components/kubernetes.ts` - Kubernetes utilities
- `infrastructure/pulumi/components/index.ts` - Component exports

**Pulumi Stack Programs**:
- `infrastructure/pulumi/stacks/local.ts` - Minikube local development ✅
- `infrastructure/pulumi/stacks/preview-base.ts` - Persistent preview infrastructure ✅
- `infrastructure/pulumi/stacks/preview-pr.ts` - Per-PR preview resources ✅
- `infrastructure/pulumi/stacks/production.ts` - Production deployment ⚠️ (pending)

**GitHub Workflows**:
- `.github/workflows/test.yml` - PHP testing + Pulumi TypeScript build
- `.github/workflows/build-preview-images.yml` - Docker image builds
- `.github/workflows/build-master-cache.yml` - GHA cache population
- `.github/workflows/deploy-preview.yml` - Preview deployment and updates
- `.github/workflows/cleanup-preview.yml` - Cleanup on PR close
- `.github/workflows/deploy.yml` - Reusable deployment workflow ⚠️ (pending, Phase 8)
- `.github/workflows/build-images.yml` - Reusable build workflow ⚠️ (pending, Phase 8)
- `.github/workflows/deploy-production.yml` - Production deployment ⚠️ (pending, Phase 8)

**Documentation**:
- `infrastructure/pulumi/README.md` - Shared components and stack documentation
- `infrastructure/pulumi/QUICKSTART.md` - Maintainer preview deployment guide
- `infrastructure/pulumi/DEV-LOCAL-SETUP.md` - Local development setup
- `README.md` - Project README (includes preview environment info)
- `SECRETS.md` - Secrets management and PAT documentation
- `.github/CONTRIBUTING.md` - Contributor guide

**Deprecated Files** (after Phase 8 completion):
- `infrastructure/kubernetes-deprecated/` - Old Kustomize manifests (preserved for rollback)
- `infrastructure/kubernetes-deprecated/README.md` - Deprecation notice

---

## Constitution Compliance Summary (v1.1.0)

### Principle I: PHP Framework Standards
✅ **COMPLIANT** - Infrastructure-only work, minimal PHP changes

### Principle II: Documentation-First Development
✅ **COMPLIANT** - Preview environments serve full documentation, LexemeSeeder functional

### Principle III: Test Coverage
✅ **COMPLIANT** - End-to-end workflow testing, manual validation

### Principle IV: Static Analysis & Code Quality
✅ **COMPLIANT** - ESLint, Prettier, TypeScript compilation

### Principle V: Production Reliability
✅ **COMPLIANT** - Idempotent deployments, retry logic, Pulumi ESC for secrets

### Principle VI: CI/CD & Infrastructure Reuse
⚠️ **PARTIALLY COMPLIANT** - Shared Pulumi components ✅, reusable workflows pending (Phase 8 M032-M036)
- **Action**: Complete Phase 8 tasks M030-M036 to achieve full compliance
- **Justification**: Preview implementation completed before principle was added (v1.1.0, 2025-12-22)

---

**Next Steps**:

**Current Status (2025-12-22)**:
- ✅ Phase 0-7: Complete
- ⚠️ Phase 8: Pending production migration + reusable workflows

**To Complete**:
1. **Phase 8 (M030-M056)**: Production migration + reusable workflows
2. **Constitution Principle VI Compliance**: Create reusable workflows (M032-M036)
3. **Documentation Cleanup**: Tasks T067-T071, T083-T084, T086-T088, T097

**Execution Order**:
1. Complete Phase 8 reusable workflows (M032-M036) - achieves Constitution VI compliance
2. Complete production migration (M037-M056)
3. Clean up deprecated workflows and documentation
4. Final validation and documentation updates
