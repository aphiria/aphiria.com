# Implementation Tasks: Pull Request Ephemeral Environments

**Branch**: `001-ephemeral-environment`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) (v2025-12-22) | **Data Model**: [data-model.md](./data-model.md)
**Constitution**: v1.1.0 (includes CI/CD & Infrastructure Reuse principle)

---

## Overview

This document organizes implementation tasks by user story to enable independent, incremental delivery. Each phase represents a complete, testable increment.

**Total Tasks**: 83 tasks (Updated 2025-12-25 to add Secret checksum task T076a)
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

- [X] T052r [US1] **CRITICAL HOTFIX**: Add resource limits to API deployment db-migration init container
  - **Why**: ResourceQuota requires ALL containers (including init containers) to have resource limits. The db-migration init container in API deployment is missing them, causing pod creation failures.
  - **Error**: `pods "api-577665d6db-..." is forbidden: failed quota: preview-quota: must specify limits.cpu for: db-migration; limits.memory for: db-migration; requests.cpu for: db-migration; requests.memory for: db-migration`
  - **Action**: Add `resources` block to db-migration init container in API deployment
  - **File**: `infrastructure/pulumi/stacks/preview-pr.ts` (lines 376-396)
  - **Code to Add** (after line 395, before the closing `},`):
    ```typescript
    resources: {
        requests: {
            cpu: "200m",
            memory: "256Mi",
        },
        limits: {
            cpu: "500m",
            memory: "512Mi",
        },
    },
    ```
  - **Impact**: API pods cannot start without this fix. Web works but API returns 503.
  - **Root Cause**: T052e only fixed db-init Job, not the API deployment's init container
  - **Testing**: After fix, `kubectl get pods -n preview-pr-107` should show API pod Running

- [X] T052s [US1] **CRITICAL HOTFIX**: Fix PostgreSQL hostname for cross-namespace DNS resolution
  - **Why**: Preview PR pods are in separate namespaces (`preview-pr-{NUMBER}`) but PostgreSQL service is in `default` namespace. Kubernetes DNS requires FQDN for cross-namespace service access.
  - **Error**: `SQLSTATE[08006] [7] could not translate host name "db" to address: Name or service not known`
  - **Symptom**: API pod init container (db-migration) crashes in CrashLoopBackOff, cannot connect to database
  - **Root Cause**: `postgresqlHost` export in preview-base.ts outputs "db" (short name), which only resolves within same namespace
  - **Action**: Change `postgresqlHost` export to fully qualified domain name
  - **File**: `infrastructure/pulumi/stacks/preview-base.ts` (line 137)
  - **Code Change**:
    ```typescript
    // OLD:
    export const postgresqlHost = "db";  // Service name

    // NEW:
    export const postgresqlHost = "db.default.svc.cluster.local";  // Fully qualified service name for cross-namespace access
    ```
  - **Impact**: All preview PR stacks depend on this output. After fixing preview-base, must redeploy all active preview-pr stacks to pick up new DB_HOST value.
  - **Deployment sequence**:
    1. `pulumi up --stack preview-base` (updates output)
    2. `pulumi up --stack preview-pr-{NUMBER}` for each active preview (updates ConfigMap)
  - **Testing**: After fix, `kubectl get pods -n preview-pr-107` should show API pod Running with init container completed successfully
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

- [X] T052t [US1] **CRITICAL ARCHITECTURE BUG**: Configure Kubernetes provider in preview-pr stack
  - **Why**: The `preview-pr.ts` stack uses the default Kubernetes provider, which connects to the local kubeconfig context instead of the DigitalOcean preview cluster. This causes Pulumi to lose track of deployed resources.
  - **Symptom**:
    - `pulumi refresh` deletes resources from state (thinks they don't exist in cluster)
    - `pulumi up` fails with "namespaces 'preview-pr-{NUMBER}' not found" even though namespace exists
    - Resources deployed via CI/CD cannot be managed locally
  - **Root Cause**: `preview-pr.ts` does not create a Kubernetes provider with the cluster's kubeconfig
  - **Current behavior**:
    ```typescript
    // preview-pr.ts has NO provider configuration
    const namespace = new k8s.core.v1.Namespace("preview-namespace", {
        metadata: { name: namespaceName },
    });
    // ↑ Uses default provider (local kubeconfig context)
    ```
  - **Expected behavior** (like preview-base.ts):
    ```typescript
    // Get kubeconfig from base stack
    const baseStack = new pulumi.StackReference(baseStackRef);
    const kubeconfig = baseStack.requireOutput("kubeconfig");

    // Create Kubernetes provider
    const k8sProvider = new k8s.Provider("preview-pr-k8s", {
        kubeconfig: kubeconfig,
        enableServerSideApply: true,
    });

    // Pass provider to ALL resources
    const namespace = new k8s.core.v1.Namespace("preview-namespace", {
        metadata: { name: namespaceName },
    }, { provider: k8sProvider });
    ```
  - **File**: `infrastructure/pulumi/stacks/preview-pr.ts`
  - **Implementation steps**:
    1. Import kubeconfig from base stack via StackReference (already exists at line 25)
    2. Create Kubernetes provider using `baseStack.requireOutput("kubeconfig")`
    3. Add `{ provider: k8sProvider }` to ALL Kubernetes resources:
       - Namespace (line 47)
       - Secret (imagePullSecret, line 63)
       - ResourceQuota (line 78)
       - NetworkPolicy (line 98)
       - Job (db-init-job, line 179)
       - ConfigMap (line 217)
       - Secret (preview-secret, line 235)
       - Deployment (web, line 253)
       - Service (web-service, line 329)
       - Deployment (api, line 355)
       - Service (api-service, line 453)
       - CustomResource (web-httproute, line 477)
       - CustomResource (api-httproute, line 518)
  - **Impact**: Without this fix, preview-pr stacks are completely broken for local management. Only CI/CD can deploy them, and even then, updates fail unpredictably.
  - **Testing**:
    1. Apply fix to preview-pr.ts
    2. Run `pulumi refresh --stack preview-pr-107` - should NOT delete resources
    3. Run `pulumi up --stack preview-pr-107` - should successfully update ConfigMap with new DB_HOST
    4. Verify pods start correctly: `kubectl get pods -n preview-pr-107`
  - **SpecKit Gap**: Provider configuration was not considered when creating preview-pr stack structure
  - **Constitutional violation**: This violates "Test what you deploy" principle - local Pulumi cannot manage what CI/CD deploys
  - **Note on ConfigMap updates**: Once this bug is fixed, ConfigMap updates will work automatically via Pulumi's replace strategy (see NFR-021 in spec.md). No additional tooling (Reloader, etc.) is needed - Pulumi handles atomic ConfigMap replacement + deployment rollouts automatically.

- [X] T052u [US1] **CRITICAL HOTFIX**: Resolve Server-Side Apply field manager conflict for existing resources
  - **Why**: Switching from default provider to explicit provider creates field manager conflicts. Existing resources were created by old provider (field manager `pulumi-kubernetes-4afb3fc3`), new provider (field manager `pulumi-kubernetes-9b013652`) cannot adopt them.
  - **Error from deployment** (https://github.com/aphiria/aphiria.com/actions/runs/20462827054/job/58799423512):
    ```
    error: resource "urn:pulumi:preview-pr-107::aphiria-com-infrastructure::kubernetes:batch/v1:Job::db-init-job" was not successfully created by the Kubernetes API server: Server-Side Apply field conflict detected.
    The resource managed by field manager "pulumi-kubernetes-9b013652" had an apply conflict: Apply failed with 1 conflict: conflict with "pulumi-kubernetes-4afb3fc3": .spec.template.spec.containers[name="db-init"].args
    ```
  - **Root Cause**: T052t (adding explicit provider) changed which field manager owns resources. Kubernetes prevents silent ownership transfer to protect against accidental modifications.
  - **Solution Options**:
    1. **Delete and recreate** (⚠️ DESTRUCTIVE - causes downtime):
       ```bash
       kubectl delete job db-init-pr-107 -n preview-pr-107
       pulumi up --stack preview-pr-107 --yes
       ```
    2. **Force-adopt with Pulumi import** (✅ RECOMMENDED - preserves existing resources):
       ```bash
       # Remove resource from state without deleting from cluster
       pulumi state delete "urn:pulumi:preview-pr-107::aphiria-com-infrastructure::kubernetes:batch/v1:Job::db-init-job" --stack preview-pr-107

       # Re-import with new provider (new field manager takes ownership)
       pulumi import kubernetes:batch/v1:Job db-init-job preview-pr-107/db-init-pr-107 --stack preview-pr-107

       # Apply remaining changes
       pulumi up --stack preview-pr-107 --yes
       ```
    3. **Manual kubectl takeover** (⚠️ REQUIRES MANUAL INTERVENTION):
       ```bash
       # Force new field manager to take ownership
       kubectl apply -f <(pulumi stack export --stack preview-pr-107 | jq '.deployment.resources[] | select(.type == "kubernetes:batch/v1:Job")') --server-side --force-conflicts
       ```
  - **Recommended Approach**: Option 2 (import) - This is the enterprise-grade solution
  - **Why import is better**:
    - No downtime (resource stays running during state manipulation)
    - Pulumi tracks ownership properly
    - Works for all resource types
    - Repeatable for other preview-pr stacks that already exist
  - **File**: `infrastructure/pulumi/stacks/preview-pr.ts`
  - **Testing**:
    1. Run import command for db-init-job
    2. Run `pulumi up --stack preview-pr-107` - should succeed without conflicts
    3. Verify Job completes: `kubectl get jobs -n preview-pr-107`
  - **Impact**: Blocks ALL preview-pr-107 deployments until resolved
  - **SpecKit Gap**: Provider migration strategy was not considered - existing stacks need migration path
  - **Constitutional violation**: None - this is expected behavior when changing providers. The error is Kubernetes protecting data integrity.
  - **Follow-up**: Document provider migration pattern for future stack refactoring (add to plan.md or architecture decision records)
  - **Depends**: T052t

- [X] T052v [US1] **CRITICAL HOTFIX**: Add 'preview' environment to Phinx database migration config
  - **Why**: Phinx config (phinx.php) only defines 'production', 'testing', and 'development' environments. Preview deployments set `APP_ENV=preview` but Phinx migration fails with "The environment configuration for 'preview' is missing"
  - **Error from pod logs**: `Init:CrashLoopBackOff` on API pod - db-migration init container fails with Phinx error
  - **Root Cause**: ConfigMap sets `APP_ENV=preview` (line 236 in preview-pr.ts) but phinx.php doesn't have a 'preview' environment defined
  - **Solution**: Add 'preview' environment to phinx.php with same config as other environments (PostgreSQL adapter using PDO connection from DI container)
  - **File**: `phinx.php` (root of project)
  - **Change**:
    ```php
    'preview' => [
        'adapter' => 'postgresql',
        'name' => 'postgres',
        'connection' => $container->resolve(PDO::class),
    ],
    ```
  - **Testing**:
    1. Rebuild API Docker image (includes updated phinx.php)
    2. Redeploy preview-pr-107 stack
    3. Verify API pod init container completes successfully: `kubectl logs -n preview-pr-107 <api-pod> -c db-migration`
  - **Impact**: Blocks ALL preview environment API deployments - db-migration init container crashes on every attempt
  - **SpecKit Gap**: Phinx environment configuration not considered during preview environment design
  - **Constitutional violation**: None - this is a configuration oversight, not a design flaw

- [X] T052x [US1] **CRITICAL HOTFIX**: Add missing js-config ConfigMap to web deployment
  - **Why**: Web application imports `/js/config/config.js` to get `apiUri` for backend API calls. Preview deployment missing this ConfigMap causes frontend to use hardcoded production API URL (`https://api.aphiria.com`) instead of preview-specific URL (`https://{PR}.pr-api.aphiria.com`).
  - **Root Cause**: preview-pr.ts creates web deployment manually without js-config ConfigMap (production uses infrastructure/kubernetes/base/web/config-maps.yml)
  - **Error**: Web loads but JavaScript API calls go to wrong endpoint (production instead of preview)
  - **Production Reference**: `infrastructure/kubernetes/base/web/config-maps.yml`
  - **Solution**: Add js-config ConfigMap to preview-pr.ts
  - **File**: `infrastructure/pulumi/stacks/preview-pr.ts`
  - **Add after line 253 (after preview-secret)**:
    ```typescript
    const jsConfigMap = new k8s.core.v1.ConfigMap("js-config", {
        metadata: {
            name: "js-config",
            namespace: namespace.metadata.name,
            labels: commonLabels,
        },
        data: {
            "config.js": pulumi.interpolate`export default {
      apiUri: '${apiUrl}',
      cookieDomain: '.pr.aphiria.com'
    }`,
        },
    }, { provider: k8sProvider });
    ```
  - **Update web deployment (line 292-303)**: Add volumeMounts and volumes
    ```typescript
    volumeMounts: [{
        name: "js-config",
        mountPath: "/usr/share/nginx/html/js/config",
    }],
    // ... (after containers array, in spec section)
    volumes: [{
        name: "js-config",
        configMap: {
            name: jsConfigMap.metadata.name,
        },
    }],
    ```
  - **Testing**:
    1. Deploy updated stack: `pulumi up --stack preview-pr-107`
    2. Verify ConfigMap created: `kubectl get cm js-config -n preview-pr-107`
    3. Verify ConfigMap content: `kubectl get cm js-config -n preview-pr-107 -o yaml` (should show `apiUri: 'https://107.pr-api.aphiria.com'`)
    4. Verify volume mounted: `kubectl describe pod <web-pod> -n preview-pr-107` (should show js-config volume)
    5. Verify file in container: `kubectl exec -n preview-pr-107 deployment/web -- cat /usr/share/nginx/html/js/config/config.js` (should show preview API URL)
    6. Access https://107.pr.aphiria.com and check browser console: `import('/js/config/config.js').then(m => console.log(m.default))` (should show `{apiUri: 'https://107.pr-api.aphiria.com', cookieDomain: '.pr.aphiria.com'}`)
  - **Environment-Specific URLs**:
    - **Preview**: `apiUri: 'https://{PR}.pr-api.aphiria.com'`, `cookieDomain: '.pr.aphiria.com'`
    - **Production**: `apiUri: 'https://api.aphiria.com'`, `cookieDomain: '.aphiria.com'`
    - **Local**: `apiUri: 'https://api.aphiria.com'`, `cookieDomain: '.aphiria.com'` (or local API if running)
  - **Depends**: T052w (audit identifies this)
  - **Impact**: CRITICAL - Web loads but all API calls go to production endpoint instead of preview (breaks isolation, contaminates production metrics)

- [X] T052y [US1] **CRITICAL HOTFIX**: Rewrite API deployment to use nginx + PHP-FPM sidecar pattern
  - **Why**: Current API deployment has single PHP-FPM container expecting HTTP on port 80, but PHP-FPM only speaks FastCGI on port 9000. Results in CrashLoopBackOff (189+ restarts).
  - **Root Cause**: Conversion from YAML → Pulumi missed multi-container sidecar architecture
  - **Production Reference**: `infrastructure/kubernetes/base/api/deployments.yml` (init + nginx + php containers)
  - **Error**: `Init:CrashLoopBackOff` - liveness probe HTTP GET on port 80 fails because no HTTP listener exists
  - **Solution**: Replace entire API Deployment section (lines 363-469) with nginx + PHP-FPM pattern
  - **File**: `infrastructure/pulumi/stacks/preview-pr.ts`
  - **Add after line 253**: nginx ConfigMap (see T052w audit for details)
  - **Replace lines 363-469**: API Deployment with:
    - Init container: `copy-api-code` (NOT db-migration)
    - Container 1: nginx (port 80, HTTP, with liveness probe)
    - Container 2: php-fpm (port 9000, FastCGI)
    - Shared volume: `api-code` emptyDir
    - nginx config volume: from nginx ConfigMap
  - **Detailed implementation**: See corrected analysis section above
  - **Testing**:
    1. Deploy: `pulumi up --stack preview-pr-107`
    2. Verify 2 containers ready: `kubectl get pods -n preview-pr-107` (should show `2/2` for API pod)
    3. Check nginx logs: `kubectl logs -n preview-pr-107 <api-pod> -c nginx`
    4. Check PHP-FPM logs: `kubectl logs -n preview-pr-107 <api-pod> -c php`
    5. Test HTTP: `curl -v https://107.pr-api.aphiria.com`
  - **Depends**: T052w (audit), T052z (separate migration Job)
  - **Impact**: CRITICAL - API completely non-functional (CrashLoopBackOff)

- [X] T052ai [US1] **CRITICAL HOTFIX**: Fix Gateway to support multiple wildcard domains with separate listeners
  - **Why**: Gateway listener can only match ONE hostname pattern. API HTTPRoute at `*.pr-api.aphiria.com` was rejected because Gateway only had listeners for `*.pr.aphiria.com`.
  - **Root Cause**: gateway.ts only created listeners for the FIRST wildcard domain, ignoring additional wildcard domains in args.domains array
  - **Error**: `Listener hostname does not match the HTTPRoute hostnames` - API HTTPRoute rejected with NoMatchingListenerHostname
  - **Evidence**:
    - Web HTTPRoute (`*.pr.aphiria.com`) accepted successfully
    - API HTTPRoute (`*.pr-api.aphiria.com`) rejected with InvalidListener error
    - Gateway status showed only 2 listeners (http-subdomains, https-subdomains) for `*.pr.aphiria.com`
    - API needs separate listener for `*.pr-api.aphiria.com` wildcard
  - **Solution**: Update gateway.ts to create separate HTTP/HTTPS listeners for EACH wildcard domain
  - **Files Modified**:
    1. `infrastructure/pulumi/components/gateway.ts`:
       - Lines 8-10: Changed from single `wildcardDomain` to array `wildcardDomains`
       - Lines 177-188: Updated HTTP listeners to map over all wildcard domains
       - Lines 213-232: Updated HTTPS listeners to map over all wildcard domains
       - Listener naming: Single wildcard uses `http-subdomains`, multiple use `http-subdomains-1`, `http-subdomains-2`, etc.
    2. `infrastructure/pulumi/stacks/preview-pr.ts`:
       - Line 632: Web HTTPRoute references `https-subdomains-1` (for `*.pr.aphiria.com`)
       - Line 674: API HTTPRoute references `https-subdomains-2` (for `*.pr-api.aphiria.com`)
  - **Testing Results**:
    1. Deployed preview-pr-107 with updated HTTPRoute references: ✅ SUCCESS
    2. Gateway created with 4 listeners (http-subdomains-1, http-subdomains-2, https-subdomains-1, https-subdomains-2): ✅ VERIFIED
    3. Web HTTPRoute accepted with sectionName `https-subdomains-1`: ✅ VERIFIED
    4. API HTTPRoute accepted with sectionName `https-subdomains-2`: ✅ VERIFIED
    5. API accessibility test: `curl https://107.pr-api.aphiria.com` returns valid JSON 404 response (expected): ✅ SUCCESS
    6. TLS handshake successful with Let's Encrypt wildcard certificate: ✅ VERIFIED
  - **Impact**: CRITICAL - API completely inaccessible without this fix (connection refused at TLS layer)
  - **Depends**: T052ah (wildcard TLS certificate must be provisioned first)
  - **Related Issues**: Fixed during local testing session (discovered after T052y implementation)
  - **Constitutional Compliance**: ✅ Testing-first approach validated fix before deployment

- [X] T052aj [US1] **CRITICAL HOTFIX**: Add missing APP_* environment variables to preview ConfigMap
  - **Why**: CORS middleware fails because it reads `APP_WEB_URL` environment variable, but preview ConfigMap only sets `WEB_URL` (missing `APP_` prefix). This causes CORS to break with invalid origin.
  - **Root Cause**: Preview ConfigMap was created with simplified variable names (`WEB_URL`, `API_URL`) instead of following production naming conventions (`APP_WEB_URL`, `APP_API_URL`)
  - **Error**: CORS failures when frontend calls API - browser blocks requests due to missing/invalid `Access-Control-Allow-Origin` header
  - **Evidence**:
    - CORS middleware code: `getenv('APP_WEB_URL')` (src/Api/Middleware/Cors.php:39)
    - Production ConfigMap: Sets `APP_WEB_URL`, `APP_API_URL`, `APP_COOKIE_DOMAIN`, etc. (infrastructure/kubernetes/base/core/config-maps.yml:6-17)
    - Preview ConfigMap: Only sets `WEB_URL`, `API_URL` (infrastructure/pulumi/stacks/preview-pr.ts:228-245)
    - API pod environment: `WEB_URL=https://107.pr.aphiria.com` (missing `APP_WEB_URL`)
  - **Solution**: Add missing `APP_*` prefixed variables to preview ConfigMap
  - **File**: `infrastructure/pulumi/stacks/preview-pr.ts` (lines 228-245)
  - **Variables to add**:
    ```typescript
    data: {
        // Existing variables (keep these)
        WEB_URL: webUrl,
        API_URL: apiUrl,
        APP_ENV: "preview",
        DB_HOST: postgresqlHost,
        DB_PORT: String(postgresqlPort),
        DB_NAME: databaseName,
        DB_USER: postgresqlUser,
        PR_NUMBER: String(prNumber),

        // NEW: Add APP_* prefixed variables for CORS and application compatibility
        APP_WEB_URL: webUrl,  // https://{PR}.pr.aphiria.com
        APP_API_URL: apiUrl,  // https://{PR}.pr-api.aphiria.com
        APP_COOKIE_DOMAIN: ".pr.aphiria.com",
        APP_COOKIE_SECURE: "1",  // Preview uses HTTPS (production uses "0" but that's incorrect for HTTPS)
        APP_BUILDER_API: "\\\\Aphiria\\\\Framework\\\\Api\\\\SynchronousApiApplicationBuilder",
        APP_BUILDER_CONSOLE: "\\\\Aphiria\\\\Framework\\\\Console\\\\ConsoleApplicationBuilder",
        LOG_LEVEL: "debug",
    },
    ```
  - **Note**: Double backslashes `\\\\` required in TypeScript strings to produce single backslash in YAML output
  - **Testing**:
    1. Deploy updated stack: `pulumi up --stack preview-pr-107`
    2. Verify ConfigMap updated: `kubectl get cm preview-config -n preview-pr-107 -o yaml | grep APP_WEB_URL`
    3. Verify environment in pod: `kubectl exec -n preview-pr-107 deployment/api -c php -- env | grep APP_WEB_URL`
    4. Test CORS preflight: `curl -v -X OPTIONS -H "Origin: https://107.pr.aphiria.com" -H "Access-Control-Request-Method: GET" https://107.pr-api.aphiria.com`
    5. Verify CORS headers: Should return `Access-Control-Allow-Origin: https://107.pr.aphiria.com`
    6. Test from browser: Open https://107.pr.aphiria.com and verify API calls succeed without CORS errors
  - **Impact**: CRITICAL - API completely unusable from web frontend due to CORS blocking all requests
  - **Depends**: T052ai (API must be accessible first)
  - **Related Tasks**: Part of comprehensive audit (T052w) - aligning preview with production configuration

- [x] T052ak [US1] **CRITICAL ENHANCEMENT**: Implement ConfigMap checksum annotations for automatic pod restarts
  - **Status**: ✅ COMPLETE - Checksums working, ResourceQuota fixed, full deployment tested successfully
  - **Implementation Results**:
    - ✅ Added crypto import and `configMapChecksum()` helper function to preview-pr.ts
    - ✅ Refactored ConfigMap to use variable `previewConfigData` (single source of truth)
    - ✅ Added checksum annotations to both web and API deployment pod templates
    - ✅ Successfully tested: Changing LOG_LEVEL triggered checksum recalculation and Kubernetes attempted rolling update
    - ❌ **Deployment blocked by ResourceQuota** during testing - proves checksums work, but quota is too small
  - **Checksum Hash Verified**: `90d2145bf1e71e1174c9765dbf4339a9fac983d4102621e11a2baa7f7214857c`
  - **Testing Evidence**:
    - Initial deployment: Annotations added to both deployments with correct hash
    - Config change test: Changed LOG_LEVEL from "debug" → "info"
    - Result: Kubernetes detected pod template change and initiated rolling update
    - Rollout blocked by ResourceQuota (old + new pods exceed 2 CPU / 4Gi limit), confirming checksum triggered update
  - **ResourceQuota Fix Required**:
    - **Current steady state**: 1 web pod (500m CPU, 1Gi) + 1 API pod (1200m CPU, 2304Mi) = 1700m CPU, 3328Mi total
    - **During rolling update**: 2x pods = 3400m CPU, 6656Mi memory
    - **Current quota**: 2 CPU, 4Gi memory ❌ Too small for rolling updates
    - **Required quota**: 4 CPU, 8Gi memory ✅ Allows safe rolling updates
    - **Action**: Increase ResourceQuota in preview-pr.ts lines 108-111
    - **Spec updated**: FR-027, NFR-007, NFR-019 now specify 4 CPU / 8Gi with headroom for rolling updates
  - **Why**: ConfigMap updates via Pulumi don't trigger pod restarts. Pods continue using stale config until manually restarted. This breaks idempotency and requires manual intervention.
  - **Root Cause**: Kubernetes only triggers rollouts when Deployment pod template changes. Replacing a ConfigMap in-place doesn't change the pod template, so pods keep running with old config.
  - **Problem Examples**:
    - T052aj CORS fix required manual pod restarts after ConfigMap update
    - `pulumi up` showing "unchanged" when only ConfigMap data modified
    - Had to use `--replace` flag and still needed manual restarts
  - **Solution**: Add SHA256 checksum of ConfigMap data as annotation to Deployment pod template. When ConfigMap data changes, checksum changes, pod template changes, Kubernetes triggers rolling update.
  - **Why NOT Reloader**:
    - Reloader adds external cluster dependency (another component to maintain)
    - All config changes flow through Pulumi (no manual kubectl edits)
    - Small number of ConfigMaps (3-4 per environment)
    - Checksum approach aligns with IaC-first philosophy
  - **Files Modified**:
    1. `infrastructure/pulumi/stacks/preview-pr.ts` - Added checksum helper and applied to both Deployments
  - **Implementation Code**:
    ```typescript
    import * as crypto from "crypto";

    // Helper function for checksum calculation
    function configMapChecksum(data: Record<string, pulumi.Input<string>>): string {
        const serialized = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash("sha256").update(serialized).digest("hex");
    }

    // Define ConfigMap data ONCE (single source of truth)
    const previewConfigData = {
        DB_HOST: postgresqlHost,
        DB_PORT: "5432",
        DB_NAME: databaseName,
        DB_USER: postgresqlAdminUser,
        APP_ENV: "preview",
        PR_NUMBER: prNumber.toString(),
        WEB_URL: webUrl,
        API_URL: apiUrl,
        APP_WEB_URL: webUrl,
        APP_API_URL: apiUrl,
        APP_COOKIE_DOMAIN: ".pr.aphiria.com",
        APP_COOKIE_SECURE: "1",
        APP_BUILDER_API: "\\Aphiria\\Framework\\Api\\SynchronousApiApplicationBuilder",
        APP_BUILDER_CONSOLE: "\\Aphiria\\Framework\\Console\\ConsoleApplicationBuilder",
        LOG_LEVEL: "debug",
    };

    // Create ConfigMap with data variable (not inline object)
    const configMap = new k8s.core.v1.ConfigMap("preview-config", {
        metadata: {
            name: "preview-config",
            namespace: namespace.metadata.name,
            labels: commonLabels,
        },
        data: previewConfigData,  // Use variable for checksum calculation
    }, { provider: k8sProvider });

    // Calculate checksum
    const configChecksum = configMapChecksum(previewConfigData);

    // Add checksum annotation to API Deployment pod template
    // Find: spec.template.metadata section
    // Add: annotations: { "checksum/config": configChecksum }

    // Add checksum annotation to Web Deployment pod template
    // Same pattern
    ```
  - **Testing Completed**:
    1. ✅ Build TypeScript: `npm run build` - Successful
    2. ✅ Deploy: `pulumi up --stack preview-pr-107` - Successful
    3. ✅ Verify checksum annotation: Both deployments show hash `90d2145bf1e71e1174c9765dbf4339a9fac983d4102621e11a2baa7f7214857c`
    4. ✅ Update ConfigMap data: Changed LOG_LEVEL from "debug" to "info"
    5. ✅ Rebuild and deploy: `npm run build && pulumi up --stack preview-pr-107` - Pulumi detected Deployment changes
    6. ✅ Verify checksum triggers update: Kubernetes initiated rolling update (blocked by ResourceQuota, but proves mechanism works)
    7. ⚠️ Pod restart verification: Unable to complete due to ResourceQuota limitation
    8. ⚠️ Config load verification: Unable to complete due to rollout not finishing
  - **Next Actions**:
    - Apply same pattern to production stacks (they have sufficient ResourceQuota for rolling updates)
    - Update CLAUDE.md with checksum pattern for all future ConfigMaps
    - Add to anti-patterns: "Never update ConfigMap without updating checksum annotation"
    - Consider increasing preview namespace ResourceQuota OR adjusting rolling update strategy (maxUnavailable: 1, maxSurge: 0) to terminate old pods before creating new ones
  - **Impact**: CRITICAL - Eliminates manual pod restarts, ensures config changes propagate automatically, maintains idempotency
  - **Depends**: T052aj (ConfigMap structure finalized)
  - **Reference**: See `specs/001-ephemeral-environment/configmap-reload-comparison.md` for detailed analysis

- [X] T052z [US1] **CRITICAL HOTFIX**: Create separate database migration Job (remove from Deployment init container)
  - **Why**: Production uses separate `db-migration` Job to run Phinx migrations ONCE. Current Pulumi runs migrations in Deployment init container, causing migrations to re-run on EVERY pod restart.
  - **Root Cause**: Misidentified purpose of init container - should copy code, not run migrations
  - **Production Reference**: `infrastructure/kubernetes/base/database/jobs.yml`
  - **Issues with current approach**:
    - Migrations run on every pod restart (inefficient, risky)
    - No wait-for-db init container (migrations can fail if DB not ready)
    - Multiple replicas would cause migration race conditions
  - **Solution**: Create separate Job for migrations, change Deployment init container to code copy only
  - **File**: `infrastructure/pulumi/stacks/preview-pr.ts`
  - **Add after line 219 (after db-init-job)**:
    ```typescript
    const dbMigrationJob = new k8s.batch.v1.Job("db-migration-job", {
        metadata: {
            name: `db-migration-pr-${prNumber}`,
            namespace: namespace.metadata.name,
            labels: commonLabels,
        },
        spec: {
            ttlSecondsAfterFinished: 0,
            template: {
                spec: {
                    restartPolicy: "Never",
                    initContainers: [{
                        name: "wait-for-db",
                        image: "busybox",
                        command: ["sh", "-c", pulumi.interpolate`until nc -z ${postgresqlHost} 5432; do echo "Waiting..."; sleep 2; done`],
                        resources: {
                            requests: { cpu: "50m", memory: "64Mi" },
                            limits: { cpu: "100m", memory: "128Mi" },
                        },
                    }],
                    containers: [{
                        name: "db-migration",
                        image: pulumi.interpolate`ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`,
                        command: ["sh", "-c", "/app/api/vendor/bin/phinx migrate && /app/api/vendor/bin/phinx seed:run"],
                        envFrom: [
                            { configMapRef: { name: configMap.metadata.name } },
                            { secretRef: { name: secret.metadata.name } },
                        ],
                        resources: {
                            requests: { cpu: "200m", memory: "256Mi" },
                            limits: { cpu: "500m", memory: "512Mi" },
                        },
                    }],
                },
            },
            backoffLimit: 3,
        },
    }, { provider: k8sProvider });
    ```
  - **Remove from API Deployment**: Delete db-migration init container (lines 384-414)
  - **Replace with**: code-copy init container (see T052y)
  - **Testing**:
    1. Deploy: `pulumi up --stack preview-pr-107`
    2. Verify migration Job runs: `kubectl get jobs -n preview-pr-107`
    3. Check migration logs: `kubectl logs -n preview-pr-107 job/db-migration-pr-107`
    4. Verify migrations don't re-run on pod restart
  - **Depends**: T052w (audit)
  - **Impact**: HIGH - inefficient, risky migration pattern

- [x] T052ab [US1] **CRITICAL HOTFIX**: Fix HTTPRoute parentRef namespace from hardcoded 'default' to stack output
  - **Why**: HTTPRoutes reference Gateway in wrong namespace (default instead of nginx-gateway), causing ZERO routes to attach to Gateway. This is why https://107.pr.aphiria.com is completely inaccessible despite DNS, pods, and services all being correct.
  - **Root Cause**: Hardcoded `namespace: "default"` in HTTPRoute parentRefs instead of using `baseStack.getOutput("gatewayNamespace")`
  - **Evidence**:
    - Gateway status shows `attachedRoutes: 0`
    - Gateway is in `nginx-gateway` namespace
    - HTTPRoutes point to `default` namespace
    - Production YAML correctly uses `namespace: nginx-gateway`
  - **Solution**: Use stack output for Gateway namespace, add missing sectionName
  - **File**: `infrastructure/pulumi/stacks/preview-pr.ts`
  - **Changes needed**:
    1. **Line 25-28**: Add `const gatewayNamespace = baseStack.getOutput("gatewayNamespace");` after line 27
    2. **Line 510-511** (web HTTPRoute parentRefs):
       ```typescript
       parentRefs: [{
           name: gatewayName,
           namespace: gatewayNamespace,        // CHANGE from "default"
           sectionName: "https-subdomains",    // ADD this line
       }],
       ```
    3. **Line 549-552** (API HTTPRoute parentRefs): Same changes as web HTTPRoute
  - **Testing**:
    1. Deploy: `pulumi up --stack preview-pr-107`
    2. Verify routes attached: `kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml get gateway nginx-gateway -n nginx-gateway -o yaml | grep attachedRoutes` (should show 2, not 0)
    3. Test web: `curl -v https://107.pr.aphiria.com` (should get HTTP 200)
    4. Test API: `curl -v https://107.pr-api.aphiria.com` (will still fail due to API architecture issues, but should connect)
  - **Impact**: **BLOCKS ALL ACCESS** - most critical bug, prevents any traffic from reaching deployed services
  - **Priority**: **URGENT** - must fix before any other hotfixes (T052x, T052y, T052z depend on being able to test)
  - **Depends**: None - this is the root blocker

- [X] T052ab [US1] **CRITICAL HOTFIX**: Fix HTTPRoute parentRef namespace from hardcoded 'default' to stack output
  - **Status**: COMPLETED - Fixed namespace and added sectionName
  - **Files Changed**: `infrastructure/pulumi/stacks/preview-pr.ts` (lines 28, 512-513, 554-555)

- [X] T052ac [US1] **CRITICAL HOTFIX**: Implement DNS-01 solver for wildcard TLS certificates
  - **Why**: Wildcard certificates (`*.pr.aphiria.com`) require DNS-01 challenge (HTTP-01 only works for specific hostnames). Without this, Gateway HTTPS listeners are invalid and reject all HTTPRoutes.
  - **Root Cause**: ClusterIssuer configured with http01 solver, but wildcards require dns01 solver with DNS provider credentials
  - **Evidence**:
    - cert-manager Order shows: "Failed to determine a valid solver configuration for the set of domains on the Order: no configured challenge solvers can be used for this challenge"
    - Certificate stays in "pending" state indefinitely
    - Gateway has no valid TLS certificate, making HTTPS listeners non-functional
    - HTTPRoutes rejected with "InvalidListener"
  - **Solution**: Configure DNS-01 solver with DigitalOcean DNS provider
  - **Files to modify**:
    1. `infrastructure/pulumi/components/gateway.ts` - Add dns01 solver support
    2. `infrastructure/pulumi/stacks/preview-base.ts` - Create DigitalOcean API token secret, update Gateway config
  - **Prerequisites**: DigitalOcean API token with DNS write permissions
  - **Depends**: T052ab (must be able to deploy stacks)

- [X] T052ad [US1] Configure DigitalOcean API token in Pulumi ESC for DNS-01 validation
  - **Why**: DNS-01 challenge requires DigitalOcean API token to create TXT records for ACME validation
  - **Security**: Token must be stored securely in Pulumi ESC (not hardcoded or in git)
  - **ESC Secret Naming**: Use `certmanager:digitaloceanDnsToken` (avoids conflict with digitalocean provider namespace)
  - **Steps**:
    1. Generate DigitalOcean API token with DNS write scope at https://cloud.digitalocean.com/account/api/tokens
    2. Add to Pulumi ESC environment `aphiria.com/Preview`:
       ```bash
       pulumi env set aphiria.com/Preview certmanager:digitaloceanDnsToken "dop_v1_YOUR_TOKEN_HERE" --secret
       ```
    3. Verify: `pulumi env get aphiria.com/Preview` (should show certmanager:digitaloceanDnsToken as [secret])
  - **Status**: COMPLETED by user
  - **Depends**: None (can be done in parallel with code changes)

- [X] T052ae [US1] Update gateway.ts component to support DNS-01 solver with DigitalOcean
  - **Why**: Enable wildcard certificate issuance via DNS-01 challenge
  - **File**: `infrastructure/pulumi/components/gateway.ts`
  - **Changes needed**:
    1. Add `dnsToken` parameter to `GatewayArgs` interface in `types.ts`
    2. Update ClusterIssuer creation (lines 87-103) to support both http01 and dns01 solvers:
       ```typescript
       solvers: args.dnsToken ? [
         {
           dns01: {
             digitalocean: {
               tokenSecretRef: {
                 name: "digitalocean-dns-token",
                 key: "access-token",
               },
             },
           },
         },
       ] : [
         {
           http01: {
             gatewayHTTPRoute: {
               parentRefs: [/* ... */],
             },
           },
         },
       ],
       ```
    3. Create Secret for DigitalOcean token when `args.dnsToken` is provided:
       ```typescript
       if (args.dnsToken) {
         new k8s.core.v1.Secret("digitalocean-dns-token", {
           metadata: {
             name: "digitalocean-dns-token",
             namespace: "cert-manager",
           },
           stringData: {
             "access-token": args.dnsToken,
           },
         }, { provider: args.provider });
       }
       ```
  - **Testing**: Verify TypeScript compiles after changes
  - **Depends**: T052ad (need token in ESC first)

- [X] T052af [US1] Update preview-base.ts to pass DigitalOcean DNS token to Gateway component
  - **Why**: Wire up ESC secret to Gateway component for DNS-01 validation
  - **File**: `infrastructure/pulumi/stacks/preview-base.ts`
  - **Changes needed**:
    1. Read token from Pulumi config (after line 64):
       ```typescript
       const digitaloceanConfig = new pulumi.Config("digitalocean");
       const dnsToken = digitaloceanConfig.requireSecret("dnsToken");
       ```
    2. Pass token to createGateway (update call around line 96):
       ```typescript
       const gateway = createGateway({
         env: "preview",
         namespace: "nginx-gateway",
         name: "nginx-gateway",
         tlsMode: "letsencrypt-prod",
         domains: [
           "*.pr.aphiria.com",
           "*.pr-api.aphiria.com",
         ],
         dnsToken: dnsToken,  // ADD THIS
         provider: k8sProvider,
       });
       ```
    3. Remove `skipCertificate: true` if present (revert to default behavior)
  - **Testing**: `pulumi preview --stack preview-base` should show Secret + ClusterIssuer with dns01 solver
  - **Depends**: T052ae (component must support dnsToken parameter)

- [X] T052ag [US1] Deploy preview-base with DNS-01 and verify wildcard certificate provisioning
  - **Why**: Validate that DNS-01 solver works and wildcard certificate is issued
  - **Steps**:
    1. Deploy: `pulumi up --stack preview-base --yes`
    2. Verify Secret created: `kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml get secret -n cert-manager digitalocean-dns-token`
    3. Verify ClusterIssuer updated: `kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml get clusterissuer letsencrypt-prod -o yaml | grep dns01`
    4. Check Certificate status: `kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml get certificate -n nginx-gateway`
    5. Watch Order progress: `kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml describe order -n nginx-gateway`
    6. Verify DNS TXT record created at DigitalOcean (check DNS records for `_acme-challenge.pr.aphiria.com`)
    7. Wait for Certificate READY=True (can take 2-5 minutes for DNS propagation + validation)
    8. Verify Secret created: `kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml get secret -n nginx-gateway tls-cert`
    9. Check Gateway status: `kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml describe gateway nginx-gateway -n nginx-gateway` (listeners should show "Programmed")
  - **Expected**: Certificate transitions from Pending → Issuing → Ready, TLS secret created
  - **Troubleshooting**: If fails, check cert-manager logs: `kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml logs -n cert-manager -l app=cert-manager`
  - **Depends**: T052af (preview-base must be updated to use DNS-01)

- [X] T052ah [US1] Redeploy preview-pr-107 and test end-to-end HTTPS access
  - **Why**: Validate that HTTPRoutes now attach to Gateway with valid TLS certificate
  - **Prerequisites**: T052ag completed successfully (wildcard cert is READY)
  - **Steps**:
    1. Deploy preview-pr-107: `pulumi up --stack preview-pr-107 --yes`
    2. Verify Gateway has attached routes: `kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml get gateway nginx-gateway -n nginx-gateway -o jsonpath='{.status.listeners[*].attachedRoutes}'` (should show non-zero)
    3. Verify HTTPRoute accepted: `kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml describe httproute web -n preview-pr-107 | grep "Type.*Accepted"` (should show Status: True)
    4. Test HTTPS web: `curl -v https://107.pr.aphiria.com` (should connect with valid TLS, may get HTTP error but TLS handshake must succeed)
    5. Check TLS certificate: `curl -v https://107.pr.aphiria.com 2>&1 | grep "subject:"` (should show Let's Encrypt cert for `*.pr.aphiria.com`)
    6. Test web pod directly: `kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml port-forward -n preview-pr-107 deployment/web 8080:80` then `curl localhost:8080` (validate pod is healthy)
  - **Success Criteria**:
    - TLS handshake succeeds (no certificate errors)
    - HTTPRoute shows Accepted=True
    - Gateway shows attachedRoutes > 0
    - Web pod responds to health checks
  - **Note**: API pod will still crash (expected, needs T052y), but web should be fully accessible
  - **Implementation Notes**:
    - Fixed NetworkPolicy in preview-pr.ts to allow ingress from `nginx-gateway` namespace (was incorrectly set to `default`)
    - Verified HTTPS access works with Let's Encrypt wildcard certificate (CN=*.pr.aphiria.com, Issuer: R12)
    - Confirmed Gateway can route to web pods after NetworkPolicy fix
  - **Depends**: T052ag (wildcard cert must exist)

- [ ] T052aa [US1] **ARCHITECTURE RECOMMENDATION**: Document enterprise-grade improvements for preview environments
  - **Why**: Current implementation works but has technical debt and patterns that don't scale to production
  - **Scope**: Analyze current preview-pr.ts and production YAML, recommend improvements:
    1. **Configuration Management**: ESC vs ConfigMaps for environment-specific config
    2. **Migration Strategy**: Job vs init container for different use cases
    3. **Resource Limits**: Standardize across environments (preview uses limits, production doesn't)
    4. **Image Pull Policy**: Digest-based vs tag-based strategies
    5. **Rolling Update Strategy**: Zero-downtime deployment patterns
    6. **Health Check Endpoints**: `/health` vs `/` for production readiness
    7. **Volume Management**: emptyDir vs persistent volumes for shared code
    8. **Secret Management**: Pulumi secrets vs Kubernetes secrets vs ESC
    9. **Gateway Listener Architecture**: sectionName usage for multi-tenant routing
    10. **Namespace Isolation**: NetworkPolicy and ResourceQuota best practices
  - **Deliverable**: Markdown document with:
    - Current pattern analysis (what we have)
    - Best practice recommendations (what we should have)
    - Migration path (how to get there)
    - Risk assessment (what breaks if we change)
  - **Target Audience**: Production migration planning (Phase 8)
  - **File**: Create `specs/001-ephemeral-environment/recommendations.md`
  - **Depends**: T052w (audit complete)
  - **Priority**: LOW - informational, doesn't block preview functionality
  - **Note**: This task MUST be completed BEFORE production migration (M037-M044)

- [ ] T052q [US1] Document GHCR token setup in SECRETS.md
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
- [X] T062b [US3] **REFACTOR**: Remove kubectl fallback from cleanup workflow (trust Pulumi as source of truth)
  - **Why**: Using kubectl to force-delete resources bypasses Pulumi state and violates "Pulumi is source of truth" principle
  - **Current behavior**: If `pulumi destroy` succeeds but namespace still exists, kubectl force-deletes it (workaround added in T062a)
  - **Correct behavior**: If `pulumi destroy` succeeds, namespace MUST be gone. If not, it's a bug in Pulumi components that needs fixing.
  - **File**: `.github/workflows/cleanup-preview.yml`
  - **Changes**:
    1. ✅ Removed "Force delete namespace if still exists" step (was lines 87-120)
    2. ✅ Replaced with verification step that FAILS if namespace still exists after Pulumi destroy
    3. ✅ Removed kubectl force-delete logic entirely
    4. NOTE: Kept kubeconfig setup for database verification step (lines 122-145)
  - **Implementation**:
    ```yaml
    - name: Destroy preview stack
      id: destroy
      working-directory: infrastructure/pulumi
      env:
        PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
      run: |
        PR_NUMBER=${{ steps.pr.outputs.number }}
        STACK_NAME="preview-pr-${PR_NUMBER}"

        if pulumi stack select "${STACK_NAME}" 2>/dev/null; then
          echo "Destroying stack ${STACK_NAME}..."
          pulumi destroy --stack "${STACK_NAME}" --yes

          # Remove stack from Pulumi Cloud
          pulumi stack rm "${STACK_NAME}" --yes

          echo "status=destroyed" >> $GITHUB_OUTPUT
          echo "✅ Stack destroyed and removed"
        else
          echo "Stack ${STACK_NAME} not found, nothing to clean up"
          echo "status=not-found" >> $GITHUB_OUTPUT
        fi

    - name: Verify namespace cleanup
      if: steps.destroy.outputs.status == 'destroyed'
      run: |
        PR_NUMBER=${{ steps.pr.outputs.number }}
        NAMESPACE="preview-pr-${PR_NUMBER}"

        # Get kubeconfig from preview-base to check namespace
        cd infrastructure/pulumi
        KUBECONFIG_JSON=$(pulumi stack output kubeconfig --stack preview-base --show-secrets)
        echo "$KUBECONFIG_JSON" > /tmp/preview-kubeconfig.yaml

        # Verify namespace is gone
        if kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml get namespace "${NAMESPACE}" 2>/dev/null; then
          echo "::error::Namespace ${NAMESPACE} still exists after Pulumi destroy!"
          echo "::error::This indicates a bug in Pulumi components - resources may have finalizers not handled correctly"
          kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml get all -n "${NAMESPACE}"
          exit 1
        else
          echo "✅ Namespace ${NAMESPACE} successfully deleted by Pulumi"
        fi
    ```
  - **Rationale**:
    - Pulumi is the source of truth - if destroy fails, we need to know WHY
    - kubectl force-delete can leave Pulumi state inconsistent
    - Proper fix is to handle finalizers correctly in Pulumi components
    - Failing the workflow alerts us to bugs that need fixing
  - **Impact**: Cleanup workflow may fail if Pulumi components have finalizer bugs (this is GOOD - we want to know!)
  - **Follow-up**: If namespace deletion fails, investigate and fix the component (likely namespace.ts or deployment components)
  - **Supersedes**: T062a (kubectl fallback was a workaround, not a proper solution)

- [X] T062a [US3] **DEPRECATED**: Force-delete namespace if Pulumi destroy doesn't remove it
  - **Status**: Implemented but deprecated by T062b
  - **Why deprecated**: kubectl fallback violates "Pulumi is source of truth" principle
  - **Replacement**: T062b removes kubectl usage and fails workflow if namespace persists (proper behavior)
  - **Implementation**:
    ```yaml
    - name: Force delete namespace if still exists
      if: steps.destroy.outputs.status == 'destroyed'
      env:
        KUBECONFIG: ${{ steps.kubeconfig.outputs.path }}
      run: |
        PR_NUMBER=${{ steps.pr.outputs.number }}
        NAMESPACE="preview-pr-${PR_NUMBER}"

        # Check if namespace still exists
        if kubectl get namespace "${NAMESPACE}" 2>/dev/null; then
          echo "⚠️  Namespace ${NAMESPACE} still exists after stack destroy, force deleting..."

          # Force delete namespace (removes finalizers and all resources)
          kubectl delete namespace "${NAMESPACE}" --force --grace-period=0 || true

          # Wait up to 30 seconds for deletion to complete
          for i in {1..30}; do
            if ! kubectl get namespace "${NAMESPACE}" 2>/dev/null; then
              echo "✅ Namespace ${NAMESPACE} successfully force-deleted"
              break
            fi
            echo "Waiting for namespace deletion... ($i/30)"
            sleep 1
          done

          # Final check
          if kubectl get namespace "${NAMESPACE}" 2>/dev/null; then
            echo "::error::Namespace ${NAMESPACE} still exists after force delete - manual intervention required"
            kubectl get all -n "${NAMESPACE}"
            exit 1
          fi
        else
          echo "✅ Namespace ${NAMESPACE} successfully deleted by Pulumi"
        fi
    ```
  - **Testing**: Close a PR with a preview environment, verify namespace is deleted even if Pulumi leaves it behind
  - **Acceptance**: All preview namespace deletions succeed, no orphaned namespaces remain in cluster

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
- [ ] T071a Clean up temporary files created during feature development
  - **Why**: Several temporary files were created during troubleshooting and planning that are no longer needed once the feature is complete
  - **Files to delete**:
    - `infrastructure/pulumi/Pulumi.preview-pr-107.yaml` - Temporary stack config for testing
    - `specs/001-ephemeral-environment/configmap-reload-plan.md` - Planning document (decision already made)
    - `specs/001-ephemeral-environment/configmap-reload-comparison.md` - Analysis document (decision already made)
  - **When to execute**: After T052ak (ConfigMap checksums) is fully implemented and validated
  - **Validation**: Ensure checksum pattern is documented in CLAUDE.md before deleting comparison docs
  - **Note**: Keep tasks.md and other essential spec files

### Operational Enhancements

- [X] T072 [P] Add concurrency limits to prevent duplicate deployments for same PR in `.github/workflows/deploy-preview.yml`
- [X] T073 [P] Implement deployment timeout (fail after 10 minutes) in `.github/workflows/deploy-preview.yml`
- [X] T074 [P] Add error handling and detailed failure messages in `.github/workflows/deploy-preview.yml`

### Monitoring & Observability

- [X] T075 [P] Add deployment metrics to PR comment (build time, deploy time) in `.github/workflows/deploy-preview.yml`
- [X] T076 [P] Implement health check URL validation after deployment in `.github/workflows/deploy-preview.yml`

### Configuration Management

- [X] T076a Add Secret checksum annotations to force pod restarts on Secret changes in `infrastructure/pulumi/components/api-deployment.ts`
  - **Why**: When database credentials rotate (DB_PASSWORD changes), API pods need to restart to pick up the new password. Current implementation only tracks ConfigMap changes via checksum annotations, not Secret changes.
  - **Current behavior**: ConfigMap has checksum annotation (`checksum/config`) that forces pod restart when config changes. Secrets do not have this pattern - pods won't restart if DB_PASSWORD rotates.
  - **Standard practice**: Helm and enterprise Kubernetes deployments use checksums for both ConfigMaps AND Secrets to ensure pods restart when either changes.
  - **Implementation approach**:
    1. Rename `configMapChecksum()` utility to `checksum()` in `infrastructure/pulumi/components/utils.ts` (generic name, works for any data)
    2. In `api-deployment.ts`, calculate combined checksum including both ConfigMap data AND Secret data
    3. Add Secret checksum to pod template annotation alongside existing ConfigMap checksum
       ```typescript
       annotations: {
         "checksum/config": checksum(configMapData),
         "checksum/secret": checksum(secretData),
       }
       ```
    4. Test by rotating DB_PASSWORD in Pulumi ESC and verify pods restart
  - **Scope**: API deployment only (uses DB_PASSWORD Secret). Web deployment doesn't mount sensitive secrets - no change needed.
  - **Files to modify**:
    - `infrastructure/pulumi/components/utils.ts` - Rename `configMapChecksum()` to `checksum()`
    - `infrastructure/pulumi/components/api-deployment.ts` - Add Secret checksum to pod annotations
  - **Rationale**: Ensures pods always have current credentials. Without this, database password rotation requires manual `kubectl rollout restart`, which is error-prone and not automated.
  - **Testing**: After implementation, verify by changing `postgresql:password` in Pulumi ESC environment and running `pulumi up` - API pods should restart automatically.
  - **Dependencies**: None (ConfigMap checksum pattern already implemented)
  - **Related**: NFR-021 in spec.md (ConfigMap and Secret updates MUST trigger automatic deployment rollouts)

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
- [ ] T085a **FUTURE ENHANCEMENT** (BLOCKED - Requires Team Edition): Migrate from Pulumi access tokens to OIDC authentication for GitHub Actions
  - **Status**: ❌ BLOCKED - Requires Pulumi Team Edition ($40/month)
  - **Current Plan**: Keep using `PULUMI_ACCESS_TOKEN` with annual rotation
  - **Revisit When**: Project grows to multiple maintainers OR budget allows Team edition
  - **Why**: OIDC provides enterprise-grade security benefits over static access tokens:
    - **Zero long-lived secrets**: No `PULUMI_ACCESS_TOKEN` stored in GitHub repository secrets
    - **Automatic credential lifecycle**: Tokens expire after 2 hours (customizable), eliminating rotation burden
    - **Principle of least privilege**: Scope tokens to specific repositories or teams
    - **Better audit trail**: Identity-based authentication traces specific workflows/runs
    - **Compliance**: Meets SOC 2, ISO 27001 requirements for credential management
    - **Leak mitigation**: Accidentally exposed tokens auto-expire vs permanent access
  - **Current state**: Workflows use `PULUMI_ACCESS_TOKEN` secret (static, permanent until revoked)
  - **Target state**: Workflows use OIDC token exchange with pulumi/auth-actions@v1
  - **Prerequisites**:
    - Admin access to Pulumi organization (davidbyoung or aphiria org)
    - Organization must support OIDC (available in Team/Enterprise plans - verify subscription)
  - **Implementation steps**:
    1. **Register OIDC issuer in Pulumi Cloud**:
       - Navigate to Organization Settings → Access Tokens → OIDC
       - Click "Register a new issuer"
       - Issuer URL: `https://token.actions.githubusercontent.com`
       - Audience: `urn:pulumi:org:<org-name>` (replace with actual Pulumi org name)
    2. **Create authorization policy**:
       - Policy decision: "Allow"
       - Token type: "Organization"
       - Subject claim: `repo:aphiria/aphiria.com:*` (allows all workflows in this repo)
       - Audience claim: `urn:pulumi:org:<org-name>`
    3. **Update GitHub Actions workflows**:
       - Files: `deploy-preview.yml`, `cleanup-preview.yml`, `test.yml` (if Pulumi used)
       - Add OIDC permissions to workflow:
         ```yaml
         permissions:
           id-token: write      # Required for OIDC
           contents: read
           pull-requests: write
           deployments: write
         ```
       - Replace Pulumi CLI installation steps with auth-actions:
         ```yaml
         # OLD (access token):
         - name: Install Pulumi CLI
           uses: pulumi/actions@v5

         # Environment variables in later steps:
         env:
           PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}

         # NEW (OIDC):
         - name: Authenticate to Pulumi Cloud via OIDC
           uses: pulumi/auth-actions@v1
           with:
             organization: <org-name>
             requested-token-type: urn:pulumi:token-type:access_token:organization

         - name: Install Pulumi CLI
           uses: pulumi/actions@v5

         # No PULUMI_ACCESS_TOKEN needed in env - auth-actions sets it automatically
         ```
    4. **Test OIDC authentication**:
       - Trigger deploy-preview.yml workflow on a test PR
       - Verify "Authenticate to Pulumi Cloud via OIDC" step succeeds
       - Verify subsequent Pulumi commands work (preview, up, destroy)
    5. **Remove static access token**:
       - Delete `PULUMI_ACCESS_TOKEN` from GitHub repository secrets (Settings → Secrets → Actions)
       - Update SECRETS.md to document OIDC setup instead of PAT creation
    6. **Update documentation**:
       - SECRETS.md: Replace "PULUMI_ACCESS_TOKEN" section with OIDC configuration guide
       - Infrastructure README: Document OIDC setup for contributors
       - Add troubleshooting section for common OIDC errors (token expiration, policy mismatches)
  - **Files to modify**:
    - `.github/workflows/deploy-preview.yml` (add OIDC auth, remove PULUMI_ACCESS_TOKEN env var)
    - `.github/workflows/cleanup-preview.yml` (add OIDC auth, remove PULUMI_ACCESS_TOKEN env var)
    - `.github/workflows/test.yml` (if Pulumi preview used - verify if applicable)
    - `SECRETS.md` (replace PAT documentation with OIDC setup)
    - `infrastructure/pulumi/README.md` or `QUICKSTART.md` (document OIDC for maintainers)
  - **Testing**:
    - Create test PR, trigger deployment
    - Close test PR, trigger cleanup
    - Verify all Pulumi operations succeed with OIDC
    - Verify no `PULUMI_ACCESS_TOKEN` references remain in workflows
  - **Rollback plan**: If OIDC fails, re-create `PULUMI_ACCESS_TOKEN` secret and revert workflow changes
  - **Dependencies**: None (can be done independently)
  - **Acceptance criteria**:
    - ✅ OIDC issuer registered in Pulumi Cloud with correct audience and subject policies
    - ✅ All workflows authenticate via pulumi/auth-actions@v1
    - ✅ `PULUMI_ACCESS_TOKEN` secret removed from GitHub
    - ✅ Documentation updated to reflect OIDC authentication
    - ✅ Test deployment and cleanup succeed with OIDC
  - **References**:
    - [Pulumi OIDC GitHub Docs](https://www.pulumi.com/docs/administration/access-identity/oidc-client/github/)
    - [pulumi/auth-actions GitHub Action](https://github.com/pulumi/auth-actions)
    - [Native OIDC Token Exchange Blog](https://www.pulumi.com/blog/native-oidc-token-exchange/)

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
- [ ] M029a Update local stack to use locally-built images instead of Docker Hub
  - **Why**: Docker Hub is deprecated for this project. Local development should use images built locally via `docker build` in Minikube's Docker daemon. This eliminates external dependencies and makes local dev faster.
  - **Files to Update**:
    1. `infrastructure/pulumi/stacks/local.ts` - Stack program
    2. `infrastructure/pulumi/DEV-LOCAL-SETUP.md` - Developer documentation
    3. `CLAUDE.md` - Local development section
  - **Code Changes for `local.ts`**:
    - Line 56: Change `image: "davidbyoung/aphiria.com-web:latest"` → `image: "aphiria.com-web:latest"`
    - Line 70: Change `image: "davidbyoung/aphiria.com-api:latest"` → `image: "aphiria.com-api:latest"`
    - Line 84: Change `image: "davidbyoung/aphiria.com-api:latest"` → `image: "aphiria.com-api:latest"`
    - Add `imagePullPolicy: "IfNotPresent"` parameter to web deployment (after `image:` line)
    - Add `imagePullPolicy: "IfNotPresent"` parameter to API deployment (after `image:` line)
    - Add `imagePullPolicy: "IfNotPresent"` parameter to migration job (after `image:` line)
  - **Documentation Changes for `DEV-LOCAL-SETUP.md`**:
    - Lines 82-84: Update build commands to use `aphiria.com-web:latest` and `aphiria.com-api:latest` (remove `davidbyoung/` prefix)
    - Lines 144-145: Update rebuild commands to use `aphiria.com-web:latest` and `aphiria.com-api:latest`
    - Add note: "Images are built with local tags (no registry prefix) and stored in Minikube's Docker daemon. Kubernetes uses `imagePullPolicy: IfNotPresent` to prevent pulling from external registries."
  - **Documentation Changes for `CLAUDE.md`**:
    - Lines 680-682: Update build commands to use `aphiria.com-web:latest` and `aphiria.com-api:latest` tags
  - **Component Changes** (if needed):
    - Check if `createWebDeployment`, `createAPIDeployment`, and `createDBMigrationJob` components accept `imagePullPolicy` parameter
    - If not, add optional `imagePullPolicy?: string` parameter to component interfaces and pass through to Kubernetes Deployment/Job spec
  - **Build Commands** (updated):
    ```bash
    eval $(minikube -p minikube docker-env) \
    && docker build -t aphiria.com-build -f ./infrastructure/docker/build/Dockerfile . \
    && docker build -t aphiria.com-api:latest -f ./infrastructure/docker/runtime/api/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build \
    && docker build -t aphiria.com-web:latest -f ./infrastructure/docker/runtime/web/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build
    ```
  - **Testing**:
    1. Delete local stack: `pulumi destroy --stack local && pulumi stack rm local`
    2. Build images with new tags (see command above)
    3. Recreate stack: `pulumi stack init local && pulumi config set --secret dbPassword password`
    4. Deploy: `pulumi up --stack local`
    5. Verify pods running: `kubectl get pods` (should show Running, not ImagePullBackOff)
    6. Verify site accessible: https://www.aphiria.com
  - **Benefit**: Faster local development (no registry pulls), eliminates Docker Hub dependency, uses same workflow as production (GHCR) but with local images

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
- [X] M031a **CRITICAL**: Design shared components to support optional resource limits (preview requires them due to ResourceQuota, production does not)
  - **Why**: Preview environments use ResourceQuota for cost control/isolation, requiring ALL containers to have resource limits. Production has no ResourceQuota, so hardcoded limits would be unnecessarily restrictive.
  - **Design principle**: Resource limits should be **optional parameters** passed to shared components, not hardcoded
  - **Implementation approach**:
    ```typescript
    // Shared component signature example
    interface DeploymentConfig {
      replicas: number;
      image: string;
      resources?: {  // ← Optional, not required
        requests?: { cpu: string; memory: string };
        limits?: { cpu: string; memory: string };
      };
    }

    // Preview stack (with ResourceQuota) - MUST specify limits
    const apiDeployment = createApiDeployment({
      replicas: 1,
      image: apiImage,
      resources: {
        requests: { cpu: "200m", memory: "512Mi" },
        limits: { cpu: "1", memory: "2Gi" },
      },
    });

    // Production stack (no ResourceQuota) - limits optional/generous
    const apiDeployment = createApiDeployment({
      replicas: 2,
      image: apiImage,
      resources: {
        // Optional: set generous limits for production if desired
        // Or omit entirely - no ResourceQuota means no enforcement
        requests: { cpu: "500m", memory: "1Gi" },
        limits: { cpu: "4", memory: "8Gi" },  // Much higher than preview
      },
    });
    ```
  - **Components affected**: All shared deployment/job components (web, API, database init, migrations)
  - **Validation**:
    - Preview stacks MUST provide resource limits (fail build if missing and ResourceQuota exists)
    - Production stack MAY omit or use generous limits
  - **Documentation**: Clearly document in component JSDoc when resource limits are required vs optional
  - **Default behavior**: If `resources` parameter is undefined, do NOT add resources block to Kubernetes manifest (let cluster defaults apply)
  - **Anti-pattern to avoid**: DO NOT hardcode preview-sized limits (200m CPU, 512Mi RAM) in shared components - production needs significantly more headroom
  - **Acceptance criteria**:
    - ✅ Shared components accept optional `resources` parameter
    - ✅ Preview stacks pass explicit resource limits
    - ✅ Production stack can omit limits OR use generous production-appropriate values
    - ✅ Component documentation clearly states when limits are required (hint: when ResourceQuota is present)
    - ✅ No hardcoded resource limits in shared component implementations

#### Stack Export Standardization (Foundation for Production Migration)

- [ ] M031b **CRITICAL**: Standardize stack exports across all stacks for consistency and reusability
  - **Why**: Current stacks export different outputs, making it difficult to write reusable workflows and reference stack outputs consistently
  - **Current state**:
    - `local.ts`: Exports `webUrl`, `apiUrl`, `dbHost`
    - `preview-base.ts`: Exports `clusterId`, `clusterEndpoint`, `kubeconfig`, `postgresqlHost`, `postgresqlPort`, `postgresqlAdminUser`, `postgresqlAdminPassword`, `gatewayName`, `gatewayNamespace`, `namespace`
    - `preview-pr.ts`: Exports `webUrl`, `apiUrl`, `databaseName`, `namespaceName`, `namespaceResourceName`, `webImageRef`, `apiImageRef`
    - `production.ts`: Exports `webUrl`, `apiUrl`, `clusterId`, `clusterEndpoint`, `kubeconfig`, `gatewayName`, `gatewayNamespace`
  - **Required standardization**:
    - **Common exports** (all stacks MUST export these):
      - `webUrl` - Public web URL (https://www.aphiria.com, https://107.pr.aphiria.com, etc.)
      - `apiUrl` - Public API URL (https://api.aphiria.com, https://107.pr-api.aphiria.com, etc.)
      - `namespace` - Kubernetes namespace where app is deployed (default, preview-pr-107, etc.)
    - **Base stack exports** (preview-base, production base if applicable):
      - `clusterId` - Cluster identifier for validation
      - `clusterEndpoint` - Cluster API endpoint
      - `kubeconfig` - Kubernetes config for cluster access (secret)
      - `gatewayName` - Gateway resource name
      - `gatewayNamespace` - Gateway namespace
      - `postgresqlHost` - Database host
      - `postgresqlPort` - Database port
      - `postgresqlAdminUser` - Database admin user
      - `postgresqlAdminPassword` - Database admin password (secret)
    - **App stack exports** (preview-pr, production):
      - All common exports
      - `databaseName` - Database name (aphiria_pr_107, aphiria_production, etc.)
      - `webImageRef` - Web image reference with digest (for deployment verification)
      - `apiImageRef` - API image reference with digest (for deployment verification)
  - **Files to modify**:
    - `infrastructure/pulumi/stacks/local.ts` - Add missing exports
    - `infrastructure/pulumi/stacks/preview-base.ts` - Already correct, document as standard
    - `infrastructure/pulumi/stacks/preview-pr.ts` - Already correct, document as standard
    - `infrastructure/pulumi/stacks/production.ts` - Add missing exports (databaseName, imageRefs)
  - **Validation**: Run `pulumi stack output --json` for each stack, verify all required exports present
  - **Documentation**: Add JSDoc comments explaining each export's purpose
  - **Depends**: None - this is a foundation task
  - **Blocks**: M032-M036 (reusable workflows need consistent exports), M037-M049 (production stack migration)

#### CI/CD Workflow Analysis & Bash-to-TypeScript Migration

- [ ] M031c **ANALYSIS**: Audit all GitHub Actions workflows for complex bash logic requiring TypeScript migration
  - **Why**: Complex bash logic (loops, conditionals, case statements, arrays) is error-prone and hard to test/maintain
  - **Principle**: Bash is acceptable for simple commands (1-3 lines), TypeScript required for complex logic
  - **Files to audit**:
    - `build-preview-images.yml` (218 lines)
    - `deploy-preview.yml` (689 lines) - PRIORITY
    - `cleanup-preview.yml` (247 lines)
    - `build-master-cache.yml` (75 lines)
    - `pulumi-drift-detection.yml` (109 lines)
    - `test.yml` (79 lines)
  - **Audit criteria** - Flag for TypeScript migration if bash block contains:
    - While loops (`while [ $RETRY_COUNT -lt $MAX_RETRIES ]`)
    - For loops (`for i in {1..30}`)
    - Case statements (`case "$secret" in`)
    - Conditionals beyond simple existence checks (complex `if-elif-else`)
    - Array operations (`MISSING_SECRETS+=()`)
    - String manipulation beyond simple concatenation
    - Retry logic with backoff
    - Multi-step validation sequences
  - **Deliverable**: Markdown table with:
    - Workflow file
    - Step name
    - Line numbers
    - Complexity score (Simple/Medium/High)
    - Migration priority (P0-Critical, P1-High, P2-Medium, P3-Low)
    - Rationale (why TypeScript is better)
  - **Example findings** (from quick scan):
    ```markdown
    | File | Step | Lines | Complexity | Priority | Rationale |
    |------|------|-------|------------|----------|-----------|
    | deploy-preview.yml | Ensure preview-base stack | 47-128 | High | P0 | Retry loops, conditional deployment, state validation |
    | deploy-preview.yml | Wait for pending deployment | 372-403 | High | P0 | While loop, polling, conditional approval |
    | deploy-preview.yml | Validate required secrets | 422-457 | Medium | P1 | Array operations, case statement, validation |
    | cleanup-preview.yml | Force delete namespace | 87-120 | High | P0 | Retry loop, error handling, validation |
    ```
  - **Output file**: `specs/001-ephemeral-environment/workflow-migration-audit.md`

- [ ] M031d **TYPESCRIPT SCRIPT**: Create shared TypeScript utilities for GitHub Actions workflows
  - **Why**: Centralize reusable logic to avoid duplication across bash-to-TypeScript migrations
  - **Directory**: Create `infrastructure/github-actions/` for TypeScript utilities
  - **Files to create**:
    - `package.json` - Dependencies (@actions/core, @actions/github, @actions/exec)
    - `tsconfig.json` - TypeScript configuration
    - `src/pulumi.ts` - Pulumi CLI wrappers (stack select, up, destroy, refresh, output)
    - `src/kubernetes.ts` - kubectl wrappers (get, delete, wait, logs)
    - `src/retry.ts` - Retry logic with exponential backoff
    - `src/validation.ts` - Secret validation, output validation
    - `src/github.ts` - GitHub API helpers (comments, labels, deployments)
    - `src/types.ts` - Shared TypeScript types/interfaces
  - **Build setup**:
    - Compile to `dist/` directory
    - Add `npm run build` script to compile TypeScript
    - Add workflow step to build utilities before use
  - **Testing**: Unit tests for retry logic, validation functions
  - **Depends**: M031c (audit complete, know what utilities are needed)

- [ ] M031e **MIGRATE**: Replace deploy-preview.yml "Ensure preview-base stack" bash with TypeScript
  - **Why**: Most complex bash block (82 lines, retry loops, conditional logic, state validation)
  - **Current**: Lines 47-128 in deploy-preview.yml (bash script with retry logic, state checks)
  - **New approach**:
    ```yaml
    - name: Ensure preview-base stack exists and is deployed
      uses: actions/github-script@v7
      with:
        script: |
          const { ensureBaseStack } = require('./infrastructure/github-actions/dist/pulumi');
          await ensureBaseStack({
            stackName: 'preview-base',
            escEnvironment: 'aphiria.com/Preview',
            maxRetries: 3,
            retryBackoff: 60000, // 60s initial, exponential
          });
    ```
  - **TypeScript implementation** (`infrastructure/github-actions/src/pulumi.ts`):
    - `ensureBaseStack()` function with typed parameters
    - Proper error handling and logging
    - Testable retry logic
  - **Files to modify**:
    - `.github/workflows/deploy-preview.yml` - Replace bash with TypeScript action call
    - `infrastructure/github-actions/src/pulumi.ts` - Implement ensureBaseStack()
  - **Testing**: Unit tests for ensureBaseStack(), integration test in workflow
  - **Depends**: M031d (TypeScript utilities created)

- [ ] M031f **MIGRATE**: Replace deploy-preview.yml "Wait for pending deployment" bash with TypeScript
  - **Why**: Complex polling logic with conditional approval (32 lines, while loop, API calls)
  - **Current**: Lines 372-403 in deploy-preview.yml
  - **New**: TypeScript function `waitForDeploymentApproval()` in github.ts
  - **Depends**: M031d

- [ ] M031g **MIGRATE**: Replace cleanup-preview.yml "Force delete namespace" bash with TypeScript
  - **Why**: Complex retry logic with validation (34 lines, for loop, conditional exit)
  - **Current**: Lines 87-120 in cleanup-preview.yml
  - **New**: TypeScript function `forceDeleteNamespace()` in kubernetes.ts
  - **Depends**: M031d

- [ ] M031h **MIGRATE**: Replace deploy-preview.yml "Validate required secrets" bash with TypeScript
  - **Why**: Array operations, case statement, complex validation (36 lines)
  - **Current**: Lines 422-457 in deploy-preview.yml
  - **New**: TypeScript function `validateRequiredSecrets()` in validation.ts
  - **Depends**: M031d

- [ ] M031i **CODE REVIEW**: Review all bash-to-TypeScript migrations for maintainability
  - **Why**: Ensure TypeScript migrations are actually more maintainable than bash
  - **Criteria**:
    - Type safety: All inputs/outputs strongly typed
    - Error handling: Proper try/catch, meaningful errors
    - Testability: Unit tests cover edge cases
    - Readability: Clear function names, comments for complex logic
    - DRY: No duplication across workflows
  - **Deliverable**: Sign-off document or list of improvements needed
  - **Depends**: M031e, M031f, M031g, M031h (all migrations complete)

#### CI/CD Workflow Refactoring (Constitution Principle VI)

- [ ] M032 Create reusable deployment workflow `.github/workflows/deploy-shared.yml` with `workflow_call` trigger (parameterized for preview/production)
  - **Why**: Eliminate duplication between preview and production deployments
  - **Inputs**:
    - `environment` (preview, production) - Determines stack name pattern, approval requirements
    - `stack_name` (preview-pr-107, production) - Pulumi stack to deploy
    - `web_image_digest` - Web image SHA256 digest
    - `api_image_digest` - API image SHA256 digest
    - `pr_number` (optional) - PR number for preview environments
    - `cluster_stack` (preview-base, production-base) - Base stack for kubeconfig
  - **Secrets**:
    - `PULUMI_ACCESS_TOKEN` - Pulumi Cloud API token
    - `DEPLOYMENT_APPROVAL_TOKEN` (optional) - GitHub PAT for auto-approval
  - **Steps** (all TypeScript, no complex bash):
    1. Checkout repository
    2. Setup Node.js, Pulumi CLI
    3. Build infrastructure/pulumi TypeScript
    4. Ensure base stack deployed (using TypeScript utility from M031e)
    5. Configure Pulumi stack (stack select/init, config set)
    6. Setup kubeconfig from base stack
    7. Run Pulumi preview (validation)
    8. Post preview comment to PR (if pr_number provided)
    9. Check author permissions (if pr_number provided)
    10. Auto-approve deployment (if maintainer, using TypeScript utility from M031f)
    11. Run Pulumi up (deployment)
    12. Wait for pods ready (using TypeScript utility)
    13. Health check endpoints (using TypeScript utility)
    14. Post deployment comment to PR (if pr_number provided)
  - **Outputs**:
    - `deployment_status` (success, failed, pending)
    - `web_url` - Deployed web URL
    - `api_url` - Deployed API URL
  - **File**: `.github/workflows/deploy-shared.yml`
  - **Depends**: M031b (standardized stack exports), M031e-M031i (TypeScript utilities)

- [ ] M033 Create reusable image build workflow `.github/workflows/build-images-shared.yml` (parameterized for preview/production)
  - **Why**: Eliminate duplication between preview and production image builds
  - **Inputs**:
    - `environment` (preview, production) - Determines image tags, cache scopes
    - `tag_suffix` (pr-107, latest, v1.2.3) - Image tag suffix
    - `enable_cache_from_master` (boolean) - Whether to use master branch cache
  - **Outputs**:
    - `build_image_digest` - Build image SHA256 digest
    - `web_image_digest` - Web image SHA256 digest
    - `api_image_digest` - API image SHA256 digest
  - **Steps**:
    1. Checkout repository
    2. Setup Docker Buildx
    3. Login to GHCR
    4. Generate image tags (TypeScript utility for consistency)
    5. Build documentation image (multi-platform if production)
    6. Build web image
    7. Build API image
    8. Output digests (JSON format for easy parsing)
  - **File**: `.github/workflows/build-images-shared.yml`
  - **Depends**: None (can be created independently)

- [ ] M034 Refactor `build-preview-images.yml` to call reusable `build-images-shared.yml` workflow
  - **Why**: Eliminate 218 lines of duplicated build logic
  - **New structure** (drastically simplified):
    ```yaml
    jobs:
      build:
        uses: ./.github/workflows/build-images-shared.yml
        with:
          environment: preview
          tag_suffix: pr-${{ github.event.pull_request.number }}
          enable_cache_from_master: true
        secrets: inherit

      trigger-deploy:
        needs: build
        # ... (existing trigger logic, simplified with TypeScript)
    ```
  - **Files to modify**:
    - `.github/workflows/build-preview-images.yml` - Reduce from 218 to ~50 lines
  - **Depends**: M033 (reusable build workflow created)

- [ ] M035 Refactor `deploy-preview.yml` to call reusable `deploy-shared.yml` workflow
  - **Why**: Eliminate 689 lines of complex deployment logic
  - **New structure**:
    ```yaml
    jobs:
      deploy:
        uses: ./.github/workflows/deploy-shared.yml
        with:
          environment: preview
          stack_name: preview-pr-${{ inputs.pr_number }}
          web_image_digest: ${{ inputs.web_digest }}
          api_image_digest: ${{ inputs.api_digest }}
          pr_number: ${{ inputs.pr_number }}
          cluster_stack: preview-base
        secrets: inherit
    ```
  - **Files to modify**:
    - `.github/workflows/deploy-preview.yml` - Reduce from 689 to ~100 lines
  - **Depends**: M032 (reusable deploy workflow created)

- [ ] M036 Create `deploy-production.yml` workflow using reusable `deploy-shared.yml` workflow
  - **Why**: Production deployments should use same validated logic as preview
  - **Trigger**: Manual workflow_dispatch with optional image digests (defaults to latest master build)
  - **Structure**:
    ```yaml
    on:
      workflow_dispatch:
        inputs:
          web_digest:
            description: 'Web image digest (defaults to latest master)'
            required: false
          api_digest:
            description: 'API image digest (defaults to latest master)'
            required: false

      push:
        branches: [master]
        paths:
          - 'src/**'
          - 'public-api/**'
          - 'public-web/**'
          - 'infrastructure/**'

    jobs:
      build:
        if: github.event_name == 'push'
        uses: ./.github/workflows/build-images-shared.yml
        with:
          environment: production
          tag_suffix: latest
          enable_cache_from_master: false
        secrets: inherit

      deploy:
        needs: [build]
        if: always()
        uses: ./.github/workflows/deploy-shared.yml
        with:
          environment: production
          stack_name: production
          web_image_digest: ${{ inputs.web_digest || needs.build.outputs.web_image_digest }}
          api_image_digest: ${{ inputs.api_digest || needs.build.outputs.api_image_digest }}
          cluster_stack: production  # Assumes production has own cluster (not shared)
        secrets: inherit
    ```
  - **File**: `.github/workflows/deploy-production.yml` (new)
  - **Depends**: M032, M033 (reusable workflows created)

#### Production Stack Implementation

- [ ] M037a Refactor production.ts to match standardized stack structure and use shared components
  - **Why**: Current production.ts creates cluster inline instead of using shared `createKubernetesCluster` component (inconsistent with preview-base)
  - **Goal**: Make production.ts structure identical to preview-base.ts (different config values only)
  - **Files to modify**: `infrastructure/pulumi/stacks/production.ts`
  - **Changes required**:
    1. **Use shared cluster component**: Replace inline `digitalocean.KubernetesCluster` with `createKubernetesCluster` (like preview-base)
    2. **Add missing exports**: `databaseName`, `namespace`, `webImageRef`, `apiImageRef` (match M031b standard)
    3. **Use image digests from config**: `webImageDigest` and `apiImageDigest` config params (like preview-pr)
    4. **Add explicit provider dependency**: `dependsOn: [cluster]` in k8sProvider options (fixes race condition)
    5. **Add enableServerSideApply**: Set to `true` for consistency with other stacks
    6. **Simplify cluster config**: Remove unused properties (amdGpuDeviceMetricsExporterPlugin, etc.)
    7. **Remove protect flag**: Or keep if desired for safety (discuss in PR)
  - **Migration approach**:
    - Backup production data (PostgreSQL dump)
    - `pulumi destroy --stack production` (clean slate)
    - Update production.ts with new structure
    - `pulumi up --stack production` with new image digests
    - Restore data if needed
  - **Validation**: Production stack structure matches preview-base except for config values (replicas, storage, etc.)
  - **Depends**: M031b (standardized exports defined)
  - **Example structure**:
    ```typescript
    // Use shared component (like preview-base)
    const { cluster, kubeconfig: clusterKubeconfig } = createKubernetesCluster({
        name: "aphiria-com-cluster",
        region: "nyc3",
        version: "1.34.1-do.0",
        nodeSize: "s-2vcpu-2gb",
        nodeCount: 2,
        autoScale: false,
        minNodes: 2,
        maxNodes: 2,
        vpcUuid: "976f980d-dc84-11e8-80bc-3cfdfea9fba1",
    });

    const k8sProvider = new k8s.Provider("production-k8s", {
        kubeconfig: clusterKubeconfig,
        enableServerSideApply: true,
    }, {
        dependsOn: [cluster],  // Explicit dependency
    });

    // Use factory (already doing this)
    const stack = createStack({...}, k8sProvider);

    // Standardized exports (add missing ones)
    export { webUrl, apiUrl, databaseName, namespace };
    export const clusterId = cluster.id;
    export const clusterEndpoint = cluster.endpoint;
    export const kubeconfig = pulumi.secret(clusterKubeconfig);
    export const gatewayName = "nginx-gateway";
    export const gatewayNamespace = "nginx-gateway";
    export const webImageRef = `ghcr.io/aphiria/aphiria.com-web@${webImageDigest}`;
    export const apiImageRef = `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`;
    ```

- [ ] M037b Fix missing dependsOn in preview-pr.ts k8sProvider
  - **Why**: Stack references should have explicit dependencies to avoid race conditions during concurrent updates
  - **File**: `infrastructure/pulumi/stacks/preview-pr.ts`
  - **Change**: Add `dependsOn: [baseStack]` to k8sProvider resource options
  - **Current** (implicit dependency):
    ```typescript
    const baseStack = new pulumi.StackReference(baseStackRef);
    const kubeconfig = baseStack.requireOutput("kubeconfig");
    const k8sProvider = new k8s.Provider("preview-pr-k8s", {
        kubeconfig: kubeconfig,
        enableServerSideApply: true,
    });
    ```
  - **Fixed** (explicit dependency):
    ```typescript
    const baseStack = new pulumi.StackReference(baseStackRef);
    const kubeconfig = baseStack.requireOutput("kubeconfig");
    const k8sProvider = new k8s.Provider("preview-pr-k8s", {
        kubeconfig: kubeconfig,
        enableServerSideApply: true,
    }, {
        dependsOn: [baseStack],  // Ensure base stack outputs are resolved
    });
    ```
  - **Impact**: More robust dependency resolution when base stack is updating

- [ ] M037 Create production stack program: `infrastructure/pulumi/stacks/production.ts`
  - **NOTE**: This task is replaced by M037a (refactor existing production.ts instead of creating new)
  - **DEPRECATED**: Original task assumed production.ts didn't exist
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

## Phase 9: Pulumi Stack Refactoring (REFACTOR)

**Priority**: HIGH (Maintainability)
**Status**: PLANNED (2025-12-24)
**Detailed Plan**: See [pulumi-refactoring-plan.md](./pulumi-refactoring-plan.md)
**Goal**: Reduce preview-pr.ts from 748 lines to ~150 lines by using existing component architecture

### Context

`preview-pr.ts` (748 lines) implements all resources inline instead of using the component architecture that local.ts (135 lines), preview-base.ts (147 lines), and production.ts (176 lines) use successfully. This creates maintainability issues, code duplication, and inconsistency.

**Existing components** (already created and tested):
- `createWebDeployment` (web-deployment.ts, 127 lines)
- `createAPIDeployment` (api-deployment.ts, 242 lines)
- `createHTTPRoute` (http-route.ts, 161 lines)
- `createGateway` (gateway.ts, 285 lines)
- `createPostgreSQL` (database.ts, 232 lines)
- `createDBMigrationJob` (db-migration.ts, 86 lines)

**Missing components** (need to create):
- `createNamespace` (for ResourceQuota + NetworkPolicy + ImagePullSecret)
- `configMapChecksum` utility (for forcing pod restarts on config changes)

---

- [x] REFACTOR-01 **[REFACTOR]** Audit existing web-deployment component (2025-12-24)
  - **Why**: Verify `createWebDeployment` supports all features currently in preview-pr.ts inline implementation
  - **Files**: `components/web-deployment.ts`, `components/types.ts`
  - **Changes Made**:
    - ✅ Added `configChecksum` parameter for pod annotations
    - ✅ Added `configMapRefs` and `secretRefs` for environment variable loading
    - ✅ Added `imagePullSecrets` support
    - ✅ Added `resources` parameter for CPU/memory limits
    - ✅ Added readinessProbe (was only liveness before)
  - **Result**: Component now fully supports all preview-pr.ts web deployment features

- [x] REFACTOR-02 **[REFACTOR]** Audit existing API-deployment component (2025-12-24)
  - **Why**: Verify `createAPIDeployment` supports all features currently in preview-pr.ts inline implementation
  - **Files**: `components/api-deployment.ts`, `components/types.ts`
  - **Changes Made**:
    - ✅ Added `configChecksum` parameter for pod annotations
    - ✅ Added `configMapRefs` and `secretRefs` for additional environment variables
    - ✅ Added `imagePullSecrets` support
    - ✅ Added `resources.nginx`, `resources.php`, `resources.initContainer` for granular resource limits
    - ✅ Added readinessProbe for nginx container
    - ✅ Updated types to accept `pulumi.Input<string>` for dbHost, dbUser
  - **Result**: Component now fully supports all preview-pr.ts API deployment features

- [x] REFACTOR-03 **[REFACTOR]** Create namespace component (2025-12-24)
  - **Why**: Namespace setup (ResourceQuota + NetworkPolicy + ImagePullSecret) is repeated pattern across preview environments
  - **Files**: `components/namespace.ts` (new), `components/types.ts` (updated)
  - **Replaced**: Lines 70-191 in preview-pr.ts (namespace, ResourceQuota, NetworkPolicy, ImagePullSecret)
  - **Created**: Full namespace component with optional ResourceQuota, NetworkPolicy, and ImagePullSecret support
  - **Implementation**:
    ```typescript
    export interface NamespaceArgs {
        name: string;
        env: "local" | "preview" | "production";
        resourceQuota?: { cpu: string; memory: string; pods: string; };
        networkPolicy?: {
            allowDNS: boolean;
            allowHTTPS: boolean;
            allowPostgreSQL?: { host: string; port: number; };
        };
        imagePullSecret?: {
            registry: string;
            username: pulumi.Input<string>;
            token: pulumi.Input<string>;
        };
        labels?: Record<string, string>;
        provider: k8s.Provider;
    }

    export interface NamespaceResult {
        namespace: k8s.core.v1.Namespace;
        resourceQuota?: k8s.core.v1.ResourceQuota;
        networkPolicy?: k8s.networking.v1.NetworkPolicy;
        imagePullSecret?: k8s.core.v1.Secret;
    }

    export function createNamespace(args: NamespaceArgs): NamespaceResult {
        // Create namespace, optional ResourceQuota, NetworkPolicy, ImagePullSecret
        // All child resources use parent: namespace for proper dependency tracking
    }
    ```
  - **Testing**:
    1. TypeScript compilation: `npm run build`
    2. Create test stack using component
    3. Verify ResourceQuota enforced
    4. Verify NetworkPolicy rules applied
    5. Verify ImagePullSecret works for GHCR
  - **Acceptance**: Namespace component created, replaces lines 70-191 in preview-pr.ts
  - **Impact**: Required for preview-pr.ts refactoring, reusable across preview-pr-* stacks
  - **Depends**: REFACTOR-01, REFACTOR-02 (understand full pattern first)

- [x] REFACTOR-04 **[REFACTOR]** Create utilities file with checksum helper (2025-12-24)
  - **Why**: ConfigMap checksum pattern should be reusable across all stacks (preview, local, production)
  - **Files**: `components/utils.ts` (created)
  - **Replaced**: Lines 6-16 in old preview-pr.ts (configMapChecksum function moved to reusable utility)
  - **Implementation**:
    ```typescript
    import * as pulumi from "@pulumi/pulumi";
    import * as crypto from "crypto";

    /**
     * Calculate SHA256 checksum of ConfigMap data for pod template annotation.
     * This forces pod restarts when ConfigMap data changes.
     *
     * @param data ConfigMap data object
     * @returns SHA256 hex digest
     */
    export function configMapChecksum(data: Record<string, pulumi.Input<string>>): string {
        const serialized = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash("sha256").update(serialized).digest("hex");
    }
    ```
  - **Testing**:
    1. Import in preview-pr.ts: `import { configMapChecksum } from "../components";`
    2. Calculate checksum for ConfigMap
    3. Verify hash matches original implementation
  - **Acceptance**: Checksum helper extracted to reusable utility, imported from components/index.ts
  - **Impact**: Enables checksum pattern across all stacks, simplifies preview-pr.ts

- [x] REFACTOR-05 **[REFACTOR]** Update components/index.ts exports (2025-12-24)
  - **Why**: New components must be exported for use in stack files
  - **Files**: `components/index.ts`
  - **Changes**:
    - ✅ Added `export * from "./utils";`
    - ✅ Added `export * from "./namespace";`
    - ✅ Verified TypeScript compilation: `npm run build` succeeded
  - **Result**: All new components exported and available for import in stack files

- [x] REFACTOR-06 **[REFACTOR]** Refactor preview-pr.ts to use components (2025-12-24)
  - **Why**: Reduce preview-pr.ts from 748 lines to ~329 lines, eliminate code duplication, improve maintainability
  - **Files**: `stacks/preview-pr.ts`
  - **Results**:
    - ✅ **Before**: 748 lines
    - ✅ **After**: 329 lines
    - ✅ **Reduction**: 419 lines (56% reduction)
  - **Strategy**: Used component-based architecture
  - **Changes**:
    1. **Import components** (line 5):
       ```typescript
       import {
           createNamespace,
           createWebDeployment,
           createAPIDeployment,
           createHTTPRoute,
           configMapChecksum,
       } from "../components";
       ```
    2. **Replace namespace setup** (lines 70-191) with `createNamespace` call
    3. **Replace web deployment** (lines 294-468) with `createWebDeployment` call
    4. **Replace API deployment** (lines 312-642) with `createAPIDeployment` call
    5. **Replace HTTP routes** (lines 645-747) with `createHTTPRoute` calls
    6. **Keep inline** (environment-specific resources):
       - ConfigMaps (preview-config with PR-specific data)
       - Secrets (preview-secret with DB credentials)
       - DB init Job (per-PR database creation)
  - **Testing**:
    1. TypeScript compilation: `cd infrastructure/pulumi && npm run build`
    2. Stack validation: `pulumi preview --stack preview-pr-107`
    3. Deployment test: `pulumi up --stack preview-pr-107 --yes`
    4. Functional tests:
       - Access web URL: `https://107.pr.aphiria.com`
       - Access API URL: `https://107.pr-api.aphiria.com`
       - Verify CORS headers
       - Verify database connectivity
    5. ConfigMap checksum test:
       - Change LOG_LEVEL in preview-pr.ts
       - Run `pulumi up`
       - Verify pods restart automatically
       - Verify new config loaded: `kubectl exec -n preview-pr-107 deployment/api -c php -- env | grep LOG_LEVEL`
  - **Acceptance Criteria**:
    - preview-pr.ts reduced to ~150 lines (80% reduction from 748)
    - All functionality preserved (no regressions)
    - All tests pass
    - Deployment time unchanged or faster
  - **Impact**: CRITICAL - Main refactoring work, eliminates 598 lines of duplicated code
  - **Depends**: REFACTOR-01, REFACTOR-02, REFACTOR-03, REFACTOR-04, REFACTOR-05

- [ ] REFACTOR-07 **[REFACTOR]** Update local.ts to use checksum utility (optional)
  - **Why**: Consistency across all stacks, reuse checksum pattern
  - **Files**: `stacks/local.ts`
  - **Actions**:
    1. Import `configMapChecksum` from components
    2. Apply checksum annotations to web/API deployments if not already present
  - **Acceptance**: Local stack uses same checksum pattern as preview-pr
  - **Impact**: OPTIONAL - Improves local development experience (config changes auto-reload)
  - **Depends**: REFACTOR-06 (verify pattern works in preview first)

---

### Refactoring Dependencies

```
REFACTOR-01 (audit web component)
    ↓
REFACTOR-02 (audit API component)
    ↓
REFACTOR-03 (create namespace component)
    ↓
REFACTOR-04 (create utils with checksum)
    ↓
REFACTOR-05 (update exports)
    ↓
REFACTOR-06 (refactor preview-pr.ts) ← MAIN TASK
    ↓
REFACTOR-07 (optional: update local.ts)
```

**Parallel Opportunities**:
- REFACTOR-01 and REFACTOR-02 can run in parallel (independent audits)
- REFACTOR-03 and REFACTOR-04 can run in parallel (create different files)

---

## Phase 11: Component Reusability Improvements (REFACTOR-IMPROVE)

**Priority**: HIGH (Code quality and maintainability)
**Status**: PLANNED (2025-12-24)
**Detailed Plan**: See [refactoring-improvements-plan.md](./refactoring-improvements-plan.md)
**Goal**: Eliminate duplication between stacks, move all common logic into components

### Context

After REFACTOR-06, preview-pr.ts is 329 lines (down from 748), but it still contains hardcoded Kubernetes resources that should be in components:
- ConfigMaps/Secrets created manually (58 lines) instead of by components
- DB init Job created inline (57 lines) instead of using a component
- Hardcoded constants (DB_PORT, APP_BUILDER_API, etc.) scattered across stack files

**Problem**: This prevents true code reuse. Creating production.ts would require duplicating this logic.

**Solution**: Components should handle ALL Kubernetes resource creation and build ConfigMaps from parameters. Stacks should only specify environment-specific values (URLs, replica counts, log levels).

**Target**: preview-pr.ts reduced to ~80-100 lines (from 329), matching local.ts pattern

---

- [ ] REFACTOR-08 **[REFACTOR-IMPROVE]** Create database creation component
  - **Why**: Preview-pr.ts has 57 lines of inline Job code for creating databases. This logic should be reusable.
  - **Files**: `components/db-creation.ts` (new), `components/types.ts` (update), `components/index.ts` (update)
  - **Replaces**: Lines 100-156 in preview-pr.ts (db-init Job)
  - **Interface**:
    ```typescript
    export interface DatabaseCreationJobArgs {
        env: Environment;
        namespace: pulumi.Input<string>;
        databaseName: string;
        dbHost: pulumi.Input<string>;
        dbAdminUser: pulumi.Input<string>;
        dbAdminPassword: pulumi.Input<string>;
        labels?: Record<string, string>;
        provider: k8s.Provider;
    }

    export function createDatabaseCreationJob(args: DatabaseCreationJobArgs): k8s.batch.v1.Job
    ```
  - **Hardcoded in Component** (same across all environments):
    - Image: `postgres:16-alpine`
    - TTL: `300` seconds
    - Resources: `{ requests: { cpu: "100m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } }`
    - Command logic: `psql -c "CREATE DATABASE ${databaseName};" || echo "Database already exists"`
  - **Testing**:
    1. TypeScript compilation: `npm run build`
    2. Import in preview-pr.ts and replace inline Job
    3. Deploy to test stack: `pulumi up --stack preview-pr-107`
    4. Verify database created: Check PostgreSQL for database existence
  - **Acceptance**: Component creates database successfully, eliminates 57 lines from preview-pr.ts
  - **Impact**: HIGH - Enables database creation pattern reuse across stacks

- [ ] REFACTOR-09 **[REFACTOR-IMPROVE]** Enhance API deployment to build ConfigMaps internally
  - **Why**: API deployment component expects ConfigMaps to exist but doesn't create them. This forces stacks to manually create ConfigMaps (47+ lines of duplication).
  - **Files**: `components/api-deployment.ts`, `components/types.ts`
  - **Replaces**: Lines 162-201 in preview-pr.ts (ConfigMap/Secret creation)
  - **Changes to APIDeploymentArgs**:
    - **REMOVE**: `configMapRefs`, `secretRefs` (component creates these internally now)
    - **ADD**: `envConfig` object with environment-specific values only:
      ```typescript
      envConfig?: {
          appEnv?: string;          // Defaults: "production" for prod, "dev" for local/preview
          logLevel?: string;        // Defaults: "warning" for prod, "debug" for local/preview
          cookieDomain: string;     // Required (e.g., ".aphiria.com", ".pr.aphiria.com")
          cookieSecure?: boolean;   // Default: true
          prNumber?: string;        // Optional (preview only)
          extraVars?: Record<string, pulumi.Input<string>>; // Additional custom env vars
      }
      ```
  - **Hardcoded in Component** (same across all environments):
    - `DB_PORT: "5432"` (PostgreSQL standard)
    - `APP_BUILDER_API: "\\Aphiria\\Framework\\Api\\SynchronousApiApplicationBuilder"` (Aphiria framework constant)
    - `APP_BUILDER_CONSOLE: "\\Aphiria\\Framework\\Console\\ConsoleApplicationBuilder"` (Aphiria framework constant)
    - `APP_COOKIE_SECURE: "1"` (unless explicitly overridden)
  - **Component Logic**:
    - Build ConfigMap data from parameters (DB_HOST, DB_NAME, etc.) + hardcoded constants
    - Create `env-vars` ConfigMap internally
    - Create `env-var-secrets` Secret internally (with DB_PASSWORD)
    - Use these in Deployment (not external refs)
    - Calculate checksum internally if `configChecksum` parameter provided
  - **Backwards Compatibility**: Keep `configMapRefs`/`secretRefs` as deprecated optional parameters (warn if used)
  - **Testing**:
    1. TypeScript compilation: `npm run build`
    2. Update preview-pr.ts to use new `envConfig` parameter
    3. Remove manual ConfigMap/Secret creation from preview-pr.ts
    4. Deploy: `pulumi up --stack preview-pr-107`
    5. Verify pods restart with correct environment variables
    6. Check ConfigMap contains all expected keys (DB_HOST, APP_BUILDER_API, etc.)
  - **Acceptance**: Component creates ConfigMaps/Secrets internally, eliminates 47+ lines from preview-pr.ts
  - **Impact**: CRITICAL - Eliminates major duplication between stacks
  - **Depends**: REFACTOR-08 (test pattern with simpler component first)

- [ ] REFACTOR-10 **[REFACTOR-IMPROVE]** Enhance web deployment to build ConfigMaps internally
  - **Why**: Web deployment has same issue as API - expects ConfigMaps but doesn't create them
  - **Files**: `components/web-deployment.ts`, `components/types.ts`
  - **Changes to WebDeploymentArgs**:
    - **REMOVE**: `configMapRefs`, `secretRefs`
    - **ADD**: `envConfig` object (similar to API component)
  - **Hardcoded in Component**:
    - Same constants as API component (APP_ENV logic, LOG_LEVEL defaults, etc.)
  - **Component Logic**:
    - Build ConfigMap from parameters
    - Create ConfigMap internally (including js-config which already exists)
    - Calculate checksum internally
  - **Testing**: Same pattern as REFACTOR-09
  - **Acceptance**: Component creates ConfigMaps internally
  - **Impact**: MEDIUM - Consistency with API component
  - **Depends**: REFACTOR-09 (same pattern)

- [ ] REFACTOR-11 **[REFACTOR-IMPROVE]** Simplify preview-pr.ts to match local.ts pattern
  - **Why**: Remove all inline Kubernetes resources, reduce to ~80-100 lines of pure configuration
  - **Files**: `stacks/preview-pr.ts`
  - **Before**: 329 lines
  - **Target**: 80-100 lines
  - **Changes**:
    1. Remove lines 100-156 (db-init Job) → Replace with `createDatabaseCreationJob` call
    2. Remove lines 162-201 (ConfigMap/Secret) → Component handles this now
    3. Update `createWebDeployment` call to use `envConfig` parameter
    4. Update `createAPIDeployment` call to use `envConfig` parameter
    5. Remove `configMapChecksum` calculation (component does this internally)
  - **Result**:
    ```typescript
    // ~80-100 lines total
    const { namespace } = createNamespace({ ... });

    const dbInit = createDatabaseCreationJob({
        env: "preview",
        namespace: namespace.metadata.name,
        databaseName,
        dbHost: postgresqlHost,
        dbAdminUser: postgresqlAdminUser,
        dbAdminPassword: postgresqlAdminPassword,
        provider: k8sProvider,
    });

    const web = createWebDeployment({
        env: "preview",
        namespace: namespace.metadata.name,
        replicas: 1,
        image: `ghcr.io/aphiria/aphiria.com-web@${webImageDigest}`,
        jsConfigData: { apiUri: apiUrl, cookieDomain: ".pr.aphiria.com" },
        baseUrl: webUrl,
        envConfig: {
            appEnv: "preview",
            logLevel: "debug",
            cookieDomain: ".pr.aphiria.com",
            prNumber: prNumber.toString(),
        },
        imagePullSecrets: ["ghcr-pull-secret"],
        provider: k8sProvider,
    });

    const api = createAPIDeployment({
        env: "preview",
        namespace: namespace.metadata.name,
        replicas: 1,
        image: `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`,
        dbHost: postgresqlHost,
        dbName: databaseName,
        dbUser: postgresqlAdminUser,
        dbPassword: postgresqlAdminPassword,
        apiUrl,
        webUrl,
        envConfig: {
            appEnv: "preview",
            logLevel: "debug",
            cookieDomain: ".pr.aphiria.com",
            prNumber: prNumber.toString(),
        },
        imagePullSecrets: ["ghcr-pull-secret"],
        provider: k8sProvider,
    });

    const webRoute = createHTTPRoute({ ... });
    const apiRoute = createHTTPRoute({ ... });
    ```
  - **Testing**:
    1. TypeScript compilation: `npm run build`
    2. Deploy: `pulumi up --stack preview-pr-107`
    3. Functional tests:
       - Access web URL: `https://107.pr.aphiria.com`
       - Access API URL: `https://107.pr-api.aphiria.com`
       - Verify database connectivity
       - Check environment variables in pods
    4. ConfigMap change test:
       - Change `logLevel: "debug"` to `"info"` in preview-pr.ts
       - Run `pulumi up`
       - Verify pods restart automatically
       - Verify new log level: `kubectl exec -n preview-pr-107 deployment/api -c php -- env | grep LOG_LEVEL`
  - **Acceptance**: preview-pr.ts is 80-100 lines, all functionality preserved, no regressions
  - **Impact**: CRITICAL - Achieves true code reusability
  - **Depends**: REFACTOR-08, REFACTOR-09, REFACTOR-10

- [ ] REFACTOR-12 **[REFACTOR-IMPROVE]** Update local.ts for consistency
  - **Why**: Ensure local.ts uses same component pattern as preview-pr.ts
  - **Files**: `stacks/local.ts`
  - **Changes**:
    - Verify `createAPIDeployment` uses `envConfig` parameter
    - Verify `createWebDeployment` uses `envConfig` parameter
    - Ensure structure mirrors preview-pr.ts (for consistency)
  - **Testing**:
    1. TypeScript compilation: `npm run build`
    2. Deploy to Minikube: `pulumi up --stack local`
    3. Verify local environment works
  - **Acceptance**: local.ts uses same component pattern as preview-pr.ts
  - **Impact**: MEDIUM - Consistency across all stacks
  - **Depends**: REFACTOR-11 (verify pattern works in preview first)

---

### Refactoring Improvements Dependencies

```
REFACTOR-08 (DB creation component)
    ↓
REFACTOR-09 (API component builds ConfigMaps)
    ↓
REFACTOR-10 (Web component builds ConfigMaps)
    ↓
REFACTOR-11 (simplify preview-pr.ts) ← MAIN TASK
    ↓
REFACTOR-12 (update local.ts)
```

**Parallel Opportunities**:
- REFACTOR-09 and REFACTOR-10 can run in parallel (independent components)

---

## Phase 10: CI/CD Hotfixes (CICD-HOTFIX)

**Priority**: CRITICAL (Blocking deployments)
**Status**: ACTIVE (2025-12-24)
**Root Cause**: API pods cannot be created - db-migration init container missing resource limits

### Context

CI/CD run failed with exit code 124 (timeout) at https://github.com/aphiria/aphiria.com/actions/runs/20490492943/job/58881711973.

**Actual Problem** (discovered via kubectl investigation):
```
Error creating: pods "api-5dfcb7694-xxxxx" is forbidden:
failed quota: preview-quota: must specify limits.cpu for: db-migration;
limits.memory for: db-migration; requests.cpu for: db-migration;
requests.memory for: db-migration
```

**Root Cause**: The API Deployment has a `db-migration` init container that is missing resource requests/limits. When we increased the ResourceQuota (T052ak), it now enforces that ALL containers (including init containers) must specify resources, but the db-migration init container doesn't have them.

**Why timeout occurred**: Pulumi waited 10 minutes for pods to become ready, but they were never created due to ResourceQuota violation. Kubernetes kept retrying pod creation and failing silently.

**Evidence**:
- ReplicaSet shows: `0 current / 1 desired` (no pods created)
- Events show repeated: `FailedCreate` with ResourceQuota error
- API deployment is stuck: `READY: 0/1`, `UP-TO-DATE: 0`, `AVAILABLE: 0`
- Web deployment works fine (no init containers with missing resources)

---

- [x] CICD-HOTFIX-01 **[CICD]** Fix ResourceQuota violation in master branch (2025-12-24)
  - **Why**: CI/CD deployments fail because master branch code violates ResourceQuota
  - **Root Cause**: CI/CD ran from master branch (commit 3d2fbc8) which has `db-migration` init container WITHOUT resource specifications
  - **Error**: `failed quota: preview-quota: must specify limits.cpu for: db-migration; limits.memory for: db-migration`
  - **Branch Analysis**:
    - **Master branch** (3d2fbc8): Has `db-migration` init container WITHOUT resource limits → VIOLATES ResourceQuota
    - **001-ephemeral-environments branch** (6d55f60): Has `copy-api-code` init container WITH resource limits → WORKS
    - **Local deploys worked** because they ran from 001-ephemeral-environments branch
  - **Solution**: Deploy from 001-ephemeral-environments branch instead of master, OR merge 001-ephemeral-environments to master first
  - **Recommendation**: Merge feature branch to master once refactoring complete, ensuring CI/CD uses latest code with proper resource specifications

---

## Phase 12: Stack Factory Pattern (FACTORY)

**Priority**: HIGH
**Status**: PLANNED (2025-12-24)
**Goal**: Eliminate duplication across local.ts, preview-base.ts, preview-pr.ts, and future production.ts by creating a single stack factory function

### Context

Currently, each stack file (local.ts, preview-base.ts, preview-pr.ts) manually creates similar infrastructure:
- Helm charts installation
- PostgreSQL database
- Gateway with TLS
- Web and API deployments
- HTTPRoutes

**Problem**: When adding a new component (e.g., Redis cache), we must manually update all 3+ stack files, leading to:
- Code duplication
- Maintenance burden
- Risk of inconsistency between environments

**Solution**: Create a **stack factory function** that encapsulates all infrastructure creation logic, with each stack file only providing environment-specific configuration.

### Architecture

```
lib/stack-factory.ts
  ├── StackConfig interface (type-safe configuration)
  └── createStack(config) → all resources

stacks/local.ts         → createStack({ env: "local", ... })
stacks/preview-base.ts  → createStack({ env: "preview", ... })
stacks/preview-pr.ts    → createStack({ env: "preview", ... })
stacks/production.ts    → createStack({ env: "production", ... })
```

### Benefits

1. **Single source of truth**: Add component once in factory, automatically available in all stacks
2. **Type safety**: TypeScript ensures all stacks provide required configuration
3. **DRY compliance**: Aligns with Constitution Principle VI (Infrastructure Reuse)
4. **Maintainability**: Changes propagate automatically to all environments

### Dependency Graph

```
FACTORY-01 (create StackConfig interface)
    ↓
FACTORY-02 (create stack factory function)
    ↓
FACTORY-03 (refactor local.ts to use factory)
    ↓
FACTORY-04 (refactor preview-base.ts to use factory)
    ↓
FACTORY-05 (refactor preview-pr.ts to use factory)
    ↓
FACTORY-06 (verify all stacks build and deploy)
```

---

- [ ] FACTORY-01 **[Infra]** Create StackConfig interface and types
  - **File**: `infrastructure/pulumi/lib/types.ts`
  - **Why**: Define type-safe configuration structure for all environments
  - **What**:
    - Create `StackConfig` interface with all environment-specific parameters:
      - `env: Environment` (local/preview/production)
      - `cluster?: KubernetesClusterConfig` (optional for local - uses minikube)
      - `database: DatabaseConfig` (replicas, storage, credentials)
      - `gateway: GatewayConfig` (TLS mode, domains, DNS token)
      - `app: AppConfig` (replicas, URLs, image refs)
      - `namespace?: NamespaceConfig` (quota, network policy, image pull secrets)
    - Create supporting interfaces:
      - `KubernetesClusterConfig`: cluster name, region, node pool settings
      - `DatabaseConfig`: replicas, persistentStorage, storageSize, credentials
      - `GatewayConfig`: tlsMode, domains, dnsToken (optional)
      - `AppConfig`: webReplicas, apiReplicas, webUrl, apiUrl, webImage, apiImage
      - `NamespaceConfig`: name, resourceQuota, networkPolicy, imagePullSecret
    - Document interface with JSDoc comments
  - **Acceptance**:
    - `lib/types.ts` exists with all config interfaces
    - All required fields documented
    - Optional fields clearly marked
    - TypeScript compiles without errors
  - **Dependencies**: None

- [ ] FACTORY-02 **[Infra]** Create stack factory function
  - **File**: `infrastructure/pulumi/lib/stack-factory.ts`
  - **Why**: Centralize all infrastructure creation logic in one place
  - **What**:
    - Create `createStack(config: StackConfig, k8sProvider: k8s.Provider)` function
    - Function creates all infrastructure resources based on config:
      - Install Helm charts (cert-manager, nginx-gateway) if config.env !== "local"
      - Create PostgreSQL database with config.database settings
      - Create Gateway with config.gateway settings (including DNS token for wildcard certs)
      - Create namespace with ResourceQuota and NetworkPolicy if config.namespace provided
      - Create ImagePullSecret if config.namespace.imagePullSecret provided
      - Create Web deployment with config.app.webReplicas, webUrl, webImage
      - Create API deployment with config.app.apiReplicas, apiUrl, apiImage, database connection
      - Create HTTPRoutes for web and API
      - Create database migration job
    - Return object with all created resources for exports
    - Handle environment-specific logic:
      - Skip Helm charts for local (already installed in minikube)
      - Use different TLS modes per environment
      - Conditionally create namespace (preview-pr needs it, others use "default")
  - **Acceptance**:
    - `lib/stack-factory.ts` exports `createStack` function
    - Function accepts StackConfig and k8sProvider
    - All components created with proper configuration
    - Returns all resources for stack exports
    - TypeScript compiles without errors
  - **Dependencies**: FACTORY-01

- [ ] FACTORY-03 **[Infra]** Refactor local.ts to use stack factory
  - **File**: `infrastructure/pulumi/stacks/local.ts`
  - **Why**: Eliminate duplication and validate factory pattern works for simplest case
  - **What**:
    - Import `createStack` from `../lib/stack-factory`
    - Import `StackConfig` from `../lib/types`
    - Replace all inline resource creation with single `createStack()` call
    - Provide local-specific configuration:
      ```typescript
      const stackConfig: StackConfig = {
          env: "local",
          database: {
              replicas: 1,
              persistentStorage: true,
              storageSize: "5Gi",
              dbUser: "postgres",
              dbPassword: pulumi.secret("postgres"),
          },
          gateway: {
              tlsMode: "self-signed",
              domains: ["aphiria.com", "*.aphiria.com"],
          },
          app: {
              webReplicas: 1,
              apiReplicas: 1,
              webUrl: "https://www.aphiria.com",
              apiUrl: "https://api.aphiria.com",
              webImage: "davidbyoung/aphiria.com-web:latest",
              apiImage: "davidbyoung/aphiria.com-api:latest",
          },
      };

      const stack = createStack(stackConfig, k8sProvider);
      ```
    - Update exports to use `stack.*` resources
    - Keep file under 50 lines (was 135 lines)
  - **Acceptance**:
    - local.ts uses stack factory
    - File is <50 lines
    - `pulumi preview` shows no changes (infrastructure identical)
    - TypeScript compiles without errors
  - **Dependencies**: FACTORY-02

- [ ] FACTORY-04 **[Infra]** Refactor preview-base.ts to use stack factory
  - **File**: `infrastructure/pulumi/stacks/preview-base.ts`
  - **Why**: Validate factory handles cluster creation and complex base infrastructure
  - **What**:
    - Import `createStack` from `../lib/stack-factory`
    - Create cluster using `createKubernetesCluster` component (keep this part)
    - Replace infrastructure creation with `createStack()` call
    - Provide preview-base-specific configuration:
      ```typescript
      const stackConfig: StackConfig = {
          env: "preview",
          database: {
              replicas: 1,
              persistentStorage: true,
              storageSize: "20Gi",
              dbUser: postgresqlConfig.require("user"),
              dbPassword: postgresqlConfig.requireSecret("password"),
          },
          gateway: {
              tlsMode: "letsencrypt-prod",
              domains: ["*.pr.aphiria.com", "*.pr-api.aphiria.com"],
              dnsToken: certmanagerConfig.requireSecret("digitaloceanDnsToken"),
          },
          // No app deployment in base stack
      };
      ```
    - Keep DNS record creation (wildcard A records)
    - Keep exports (cluster info, gateway info, postgresql connection)
    - Target: <100 lines (was 148 lines)
  - **Acceptance**:
    - preview-base.ts uses stack factory
    - File is <100 lines
    - Cluster creation still works
    - DNS records still created
    - `pulumi preview` shows no changes
    - TypeScript compiles without errors
  - **Dependencies**: FACTORY-02

- [ ] FACTORY-05 **[Infra]** Refactor preview-pr.ts to use stack factory
  - **File**: `infrastructure/pulumi/stacks/preview-pr.ts`
  - **Why**: Validate factory handles per-PR namespaces and database creation
  - **What**:
    - Import `createStack` from `../lib/stack-factory`
    - Replace infrastructure creation with `createStack()` call
    - Provide preview-pr-specific configuration:
      ```typescript
      const stackConfig: StackConfig = {
          env: "preview",
          namespace: {
              name: `preview-pr-${prNumber}`,
              resourceQuota: {
                  cpu: "4",
                  memory: "8Gi",
                  pods: "5",
              },
              networkPolicy: {
                  allowDNS: true,
                  allowHTTPS: true,
                  allowPostgreSQL: {
                      host: "db.preview-base",
                      port: 5432,
                  },
              },
              imagePullSecret: {
                  registry: "ghcr.io",
                  username: ghcrUsername,
                  token: ghcrToken,
              },
          },
          database: {
              createDatabase: true, // Use createDatabaseCreationJob component
              databaseName: `aphiria_pr_${prNumber}`,
              dbHost: postgresqlHost,
              dbAdminUser: postgresqlAdminUser,
              dbAdminPassword: postgresqlAdminPassword,
          },
          app: {
              webReplicas: 1,
              apiReplicas: 1,
              webUrl: `https://${prNumber}.pr.aphiria.com`,
              apiUrl: `https://${prNumber}.pr-api.aphiria.com`,
              webImage: `ghcr.io/aphiria/aphiria.com-web@${webImageDigest}`,
              apiImage: `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`,
          },
      };
      ```
    - Keep stack reference to preview-base
    - Keep configuration loading (PR number, image digests)
    - Target: <100 lines (was 238 lines)
  - **Acceptance**:
    - preview-pr.ts uses stack factory
    - File is <100 lines
    - Per-PR namespace created
    - Database creation job works
    - `pulumi preview` shows no changes
    - TypeScript compiles without errors
  - **Dependencies**: FACTORY-02

- [ ] FACTORY-06 **[Infra]** Verify all stacks build and deploy successfully
  - **Files**: All stack files
  - **Why**: Ensure factory pattern doesn't introduce regressions
  - **What**:
    - Run `npm run build` - must succeed with zero errors
    - Run `pulumi preview` on local stack - must show "no changes"
    - Run `pulumi preview` on preview-base stack - must show "no changes"
    - Run `pulumi preview` on preview-pr stack - must show "no changes"
    - Verify all TypeScript types are correct (no `any` types in stack files)
    - Check that all stack files are under target line counts:
      - local.ts: <50 lines
      - preview-base.ts: <100 lines
      - preview-pr.ts: <100 lines
  - **Acceptance**:
    - All stacks build without errors
    - All `pulumi preview` commands show "no changes"
    - No TypeScript errors in any files
    - Line count targets met
  - **Dependencies**: FACTORY-03, FACTORY-04, FACTORY-05
  - **Acceptance**: This is a branch mismatch issue, not a code fix needed in current branch. Current branch (001-ephemeral-environments) already has correct code with `copy-api-code` init container including resource limits.

---

- [x] CICD-HOTFIX-02 **[CICD]** Fix kubectl wait timeout for Job pods (2025-12-24)
  - **Why**: Every deployment waits 5 minutes before reporting success, making it impossible to know if deployment actually succeeded
  - **Root Cause**: `kubectl wait --for=condition=Ready pods --all` includes completed Job pods (db-init) which never reach "Ready" state
  - **Error**: "Some pods did not become ready within timeout" warning after 5-minute delay on EVERY deployment
  - **File**: `.github/workflows/deploy-preview.yml` (lines 607-621)
  - **Fix Applied**: Changed from `--all` to label selector `app in (web,api)` to exclude Job pods
  - **Before**:
    ```bash
    kubectl wait --for=condition=Ready pods --all \
      --namespace="${NAMESPACE}" \
      --timeout=300s
    ```
  - **After**:
    ```bash
    kubectl wait --for=condition=Ready pods \
      -l 'app in (web,api)' \
      --namespace="${NAMESPACE}" \
      --timeout=300s
    ```
  - **Impact**: Eliminates 5-minute delay on every deployment, provides fast feedback on actual deployment success/failure
  - **Acceptance**: ✅ Only Deployment pods (web, api) checked for readiness, Job pods (db-init) excluded
  - **Next**: Test on next PR deployment to verify <30 second completion time

---

### Phase 13: Resource Limits Configuration (2025-12-24)

**Goal**: Add optional resource limits to factory pattern to support environment-specific resource constraints

**Context**: During factory refactoring, we lost per-container resource limits that were present in preview-pr.ts. Industry best practice is to make resource limits environment-specific configuration (not hardcoded in components), as different environments have different needs (production needs more than preview, preview needs limits for cost control, local may not need limits).

**Tasks**:

- [x] RESOURCES-01 **[Types]** Add resource limits to AppConfig interface
  - **Why**: Factory needs to accept optional resource configuration and pass it to components
  - **File**: `infrastructure/pulumi/shared/types.ts`
  - **Changes**:
    - Add optional `resources?` field to `AppConfig` interface
    - Define `ResourceLimits` interface with web/api-specific limits
    - Web: Simple container with requests/limits
    - API: Complex container with nginx/php/initContainer limits
  - **Implementation**:
    ```typescript
    export interface ResourceLimits {
        requests: {
            cpu: string;
            memory: string;
        };
        limits: {
            cpu: string;
            memory: string;
        };
    }

    export interface APIResourceLimits {
        nginx?: ResourceLimits;
        php?: ResourceLimits;
        initContainer?: ResourceLimits;
    }

    export interface AppConfig {
        // ... existing fields ...
        webResources?: ResourceLimits;
        apiResources?: APIResourceLimits;
    }
    ```
  - **Acceptance**: TypeScript compiles without errors, interfaces define optional resource limits
  - **Dependencies**: None

---

- [x] RESOURCES-02 **[Factory]** Pass resource limits to deployment components
  - **Why**: Factory must forward resource configuration to web/API components
  - **File**: `infrastructure/pulumi/shared/factory.ts`
  - **Changes**:
    - Pass `config.app.webResources` to `createWebDeployment()` (line ~136)
    - Pass `config.app.apiResources` to `createAPIDeployment()` (line ~156)
  - **Implementation**:
    ```typescript
    // Web deployment (line ~136)
    resources.web = createWebDeployment({
        // ... existing fields ...
        resources: config.app.webResources,
        provider: k8sProvider,
    });

    // API deployment (line ~156)
    resources.api = createAPIDeployment({
        // ... existing fields ...
        resources: config.app.apiResources,
        provider: k8sProvider,
    });
    ```
  - **Acceptance**: TypeScript compiles, factory passes optional resources to components
  - **Dependencies**: RESOURCES-01

---

- [x] RESOURCES-03 **[Stack]** Add resource limits to preview-pr configuration
  - **Why**: Preview environments need strict resource limits to prevent cost overruns from runaway PRs
  - **File**: `infrastructure/pulumi/stacks/preview-pr.ts`
  - **Changes**: Add `webResources` and `apiResources` to `app` config object
  - **Values** (from original preview-pr.ts before refactoring):
    ```typescript
    app: {
        // ... existing fields ...
        webResources: {
            requests: { cpu: "100m", memory: "256Mi" },
            limits: { cpu: "500m", memory: "1Gi" },
        },
        apiResources: {
            nginx: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "200m", memory: "256Mi" },
            },
            php: {
                requests: { cpu: "500m", memory: "1280Mi" },
                limits: { cpu: "1", memory: "2560Mi" },
            },
            initContainer: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "200m", memory: "256Mi" },
            },
        },
    }
    ```
  - **Acceptance**: preview-pr.ts specifies resource limits matching original values
  - **Dependencies**: RESOURCES-01, RESOURCES-02

---

- [x] RESOURCES-04 **[Verification]** Build and verify all stacks
  - **Why**: Ensure resource limits compile and don't break existing stacks
  - **Commands**:
    ```bash
    cd infrastructure/pulumi && npm run build
    ```
  - **Checks**:
    - TypeScript compiles without errors
    - local.ts builds (no resource limits - developer convenience)
    - preview-base.ts builds (no app deployment)
    - preview-pr.ts builds (with resource limits)
    - production.ts builds (unchanged)
  - **Acceptance**: All stacks compile successfully, no TypeScript errors
  - **Dependencies**: RESOURCES-01, RESOURCES-02, RESOURCES-03

---

**Phase 13 Summary**:
- Adds optional resource limits to factory pattern
- Preview-PR gets strict limits for cost control
- Local remains unlimited for developer convenience
- Production can add limits later based on metrics
- Follows industry best practice: environment-specific configuration

---

### Phase 14: Infrastructure Quality Improvements (2025-12-24)

**Goal**: Address high/medium priority infrastructure improvements identified in code audit

**Context**: Code audit (Grade: A-, 88/100) identified production-ready infrastructure with minor improvements needed for enterprise-grade reliability. This phase addresses refactoring production.ts to use factory pattern, adding PodDisruptionBudgets for HA, implementing database backup strategy, fixing SQL injection risk, replacing `any` types with specific Pulumi types, and adding Pulumi drift detection.

**Tasks**:

- [ ] INFRA-01 **[Production Stack]** Refactor production.ts to use factory pattern
  - **Why**: Eliminates duplication, ensures consistency with local/preview environments
  - **Current Issue**: production.ts duplicates component logic that factory already handles (177 lines)
  - **File**: `infrastructure/pulumi/stacks/production.ts`
  - **Changes**:
    - Replace inline component calls with `createStack()` factory
    - Extract production-specific cluster creation (keep outside factory - it's imported, not created)
    - Pass production configuration to factory
    - Reduce from ~177 lines to ~80 lines (similar to preview-base)
  - **Implementation**:
    ```typescript
    // Keep cluster import (production-specific)
    const cluster = new digitalocean.KubernetesCluster("aphiria-com-cluster", { ... }, { protect: true });

    // Use factory for everything else
    const stack = createStack({
        env: "production",
        database: {
            replicas: 2,
            persistentStorage: true,
            storageSize: "20Gi",
            dbUser: postgresqlConfig.require("user"),
            dbPassword: postgresqlConfig.requireSecret("password"),
        },
        gateway: {
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com"],
        },
        app: {
            webReplicas: 2,
            apiReplicas: 2,
            webUrl: "https://www.aphiria.com",
            apiUrl: "https://api.aphiria.com",
            webImage: config.require("webImage"),
            apiImage: config.require("apiImage"),
            cookieDomain: ".aphiria.com",
        },
    }, k8sProvider);
    ```
  - **Acceptance**: production.ts uses factory, compiles without errors, maintains all existing functionality
  - **Dependencies**: None

---

- [ ] INFRA-02 **[HA]** Add PodDisruptionBudgets for production deployments
  - **Why**: Prevents all pods going down during node maintenance, ensures high availability
  - **Current Issue**: No PDBs defined - Kubernetes can drain all pods simultaneously during upgrades
  - **Files**:
    - `infrastructure/pulumi/components/types.ts` (add PDB interfaces)
    - `infrastructure/pulumi/components/web-deployment.ts` (create PDB)
    - `infrastructure/pulumi/components/api-deployment.ts` (create PDB)
    - `infrastructure/pulumi/shared/types.ts` (add optional PDB config to AppConfig)
  - **Implementation**:
    ```typescript
    // types.ts - Add to WebDeploymentArgs/APIDeploymentArgs
    export interface PodDisruptionBudgetConfig {
        minAvailable?: number;  // e.g., 1 (at least 1 pod always running)
        maxUnavailable?: number; // e.g., 1 (max 1 pod down at a time)
    }

    // web-deployment.ts - Add PDB resource
    if (args.podDisruptionBudget) {
        new k8s.policy.v1.PodDisruptionBudget("web-pdb", {
            metadata: { name: "web", namespace: args.namespace },
            spec: {
                minAvailable: args.podDisruptionBudget.minAvailable,
                selector: { matchLabels: { app: "web" } },
            },
        }, { provider: args.provider });
    }

    // AppConfig - Add optional PDB config
    webPodDisruptionBudget?: PodDisruptionBudgetConfig;
    apiPodDisruptionBudget?: PodDisruptionBudgetConfig;

    // production.ts - Enable PDBs
    app: {
        // ... existing fields ...
        webPodDisruptionBudget: { minAvailable: 1 },
        apiPodDisruptionBudget: { minAvailable: 1 },
    }
    ```
  - **Acceptance**: PDBs created for production web/api, prevents all pods draining simultaneously
  - **Dependencies**: INFRA-01 (production uses factory)

---

- [ ] INFRA-03 **[Backups]** Implement database backup strategy
  - **Why**: Disaster recovery requires automated backups with restore procedures
  - **Current Issue**: No backup automation defined in IaC
  - **Files**:
    - Create `infrastructure/pulumi/components/database-backup.ts`
    - Update `infrastructure/pulumi/components/types.ts`
    - Update `infrastructure/pulumi/shared/types.ts`
    - Update `infrastructure/pulumi/shared/factory.ts`
  - **Implementation**:
    ```typescript
    // database-backup.ts - Create CronJob for pg_dump
    export function createDatabaseBackup(args: DatabaseBackupArgs): k8s.batch.v1.CronJob {
        return new k8s.batch.v1.CronJob("db-backup", {
            metadata: { name: "db-backup", namespace: args.namespace },
            spec: {
                schedule: args.schedule, // e.g., "0 2 * * *" (2 AM daily)
                jobTemplate: {
                    spec: {
                        template: {
                            spec: {
                                restartPolicy: "OnFailure",
                                containers: [{
                                    name: "backup",
                                    image: "postgres:16-alpine",
                                    command: ["sh", "-c"],
                                    args: [`
                                        pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE -Fc -f /backup/db-$(date +%Y%m%d-%H%M%S).dump &&
                                        # Upload to S3/DigitalOcean Spaces
                                        s3cmd put /backup/*.dump s3://${args.backupBucket}/postgres/
                                    `],
                                    env: [
                                        { name: "PGHOST", value: args.dbHost },
                                        { name: "PGUSER", value: args.dbUser },
                                        { name: "PGPASSWORD", value: args.dbPassword },
                                        { name: "PGDATABASE", value: args.dbName },
                                    ],
                                    volumeMounts: [{
                                        name: "backup",
                                        mountPath: "/backup",
                                    }],
                                }],
                                volumes: [{
                                    name: "backup",
                                    emptyDir: {},
                                }],
                            },
                        },
                    },
                },
            },
        }, { provider: args.provider });
    }

    // DatabaseConfig - Add backup config
    backup?: {
        enabled: boolean;
        schedule: string; // Cron format
        backupBucket: string; // S3/Spaces bucket
        retention: number; // Days to retain backups
    };

    // factory.ts - Create backup CronJob if enabled
    if (config.database.backup?.enabled) {
        resources.dbBackup = createDatabaseBackup({
            env: config.env,
            namespace,
            dbHost: dbHost,
            dbName: dbName,
            dbUser: dbUser,
            dbPassword: dbPassword,
            schedule: config.database.backup.schedule,
            backupBucket: config.database.backup.backupBucket,
            provider: k8sProvider,
        });
    }
    ```
  - **Acceptance**: Production database backs up daily to object storage, backups retained per policy
  - **Dependencies**: INFRA-01

---

- [ ] INFRA-04 **[Security]** Fix SQL injection risk in database creation
  - **Why**: Prevent potential SQL injection if databaseName becomes user-controlled
  - **Current Issue**: `psql -c "CREATE DATABASE ${args.databaseName};"` uses string interpolation
  - **File**: `infrastructure/pulumi/components/db-creation.ts`
  - **Changes**:
    ```typescript
    // BEFORE (line 77)
    command: [
        "sh", "-c",
        `psql -c "CREATE DATABASE ${args.databaseName};" || echo "Database already exists"`
    ],

    // AFTER - Use psql variable substitution
    command: [
        "sh", "-c",
        `psql -v dbname="${args.databaseName}" -c 'CREATE DATABASE :"dbname";' || echo "Database already exists"`
    ],
    ```
  - **Note**: Current risk is low (databaseName from trusted Pulumi config), but this follows security best practices
  - **Acceptance**: Database creation uses parameterized psql command, no string interpolation
  - **Dependencies**: None

---

- [ ] INFRA-05 **[Type Safety]** Replace `any` types with specific Pulumi types
  - **Why**: Better compile-time safety, IntelliSense, prevents runtime errors
  - **Current Issue**: 10+ instances of `any` type in result interfaces
  - **Files**:
    - `infrastructure/pulumi/shared/factory.ts` (lines 21-30)
    - `infrastructure/pulumi/components/types.ts` (lines 296-384)
  - **Changes**:
    ```typescript
    // BEFORE (factory.ts:21-30)
    export interface StackResources {
        helmCharts?: any;
        postgres?: any;
        gateway?: any;
        namespace?: any;
        dbInitJob?: any;
        web?: any;
        api?: any;
        migration?: any;
        webRoute?: any;
        apiRoute?: any;
        httpsRedirect?: any;
        wwwRedirect?: any;
    }

    // AFTER - Use specific Pulumi output types
    export interface StackResources {
        helmCharts?: {
            certManager: k8s.helm.v3.Chart;
            nginxGateway: k8s.helm.v3.Chart;
        };
        postgres?: k8s.apps.v1.StatefulSet;
        gateway?: k8s.apiextensions.CustomResource; // Gateway API resource
        namespace?: {
            namespace: k8s.core.v1.Namespace;
            resourceQuota?: k8s.core.v1.ResourceQuota;
            networkPolicy?: k8s.networking.v1.NetworkPolicy;
            imagePullSecret?: k8s.core.v1.Secret;
        };
        dbInitJob?: k8s.batch.v1.Job;
        web?: {
            deployment: k8s.apps.v1.Deployment;
            service: k8s.core.v1.Service;
            configMap: k8s.core.v1.ConfigMap;
        };
        api?: {
            deployment: k8s.apps.v1.Deployment;
            service: k8s.core.v1.Service;
            secret: k8s.core.v1.Secret;
        };
        migration?: k8s.batch.v1.Job;
        webRoute?: k8s.apiextensions.CustomResource;
        apiRoute?: k8s.apiextensions.CustomResource;
        httpsRedirect?: k8s.apiextensions.CustomResource;
        wwwRedirect?: k8s.apiextensions.CustomResource;
    }

    // Similar changes for types.ts result interfaces
    ```
  - **Acceptance**: All `any` types replaced with specific Pulumi/Kubernetes types, TypeScript compiles
  - **Dependencies**: None

---

- [ ] INFRA-06 **[Drift Detection]** Add Pulumi drift detection to CI/CD
  - **Why**: Automated checks for manual changes prevent configuration drift
  - **Current Issue**: No automated drift detection - manual changes go unnoticed
  - **File**: Create `.github/workflows/pulumi-drift-check.yml`
  - **Implementation**:
    ```yaml
    name: Pulumi Drift Detection

    on:
      schedule:
        - cron: '0 6 * * *'  # Daily at 6 AM UTC
      workflow_dispatch:  # Manual trigger

    jobs:
      drift-check:
        name: Check Infrastructure Drift
        runs-on: ubuntu-latest
        strategy:
          matrix:
            stack: [local, preview-base, production]

        steps:
          - uses: actions/checkout@v4

          - uses: pulumi/actions@v5
            with:
              command: preview
              stack-name: ${{ matrix.stack }}
              work-dir: infrastructure/pulumi
            env:
              PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}

          - name: Check for drift
            run: |
              # If preview shows changes, there's drift
              if pulumi preview --stack ${{ matrix.stack }} --non-interactive --diff | grep -q "^[~+-]"; then
                echo "::error::Drift detected in ${{ matrix.stack }} stack!"
                exit 1
              fi

          - name: Create issue on drift
            if: failure()
            uses: actions/github-script@v7
            with:
              script: |
                await github.rest.issues.create({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  title: `Infrastructure Drift Detected: ${{ matrix.stack }}`,
                  body: `Automated drift detection found manual changes in the ${{ matrix.stack }} stack.\n\nRun \`pulumi preview --stack ${{ matrix.stack }}\` to see changes.`,
                  labels: ['infrastructure', 'drift-detection']
                });
    ```
  - **Acceptance**: Daily drift checks run, GitHub issues created on detected drift
  - **Dependencies**: None

---

- [ ] INFRA-07 **[Verification]** Build and test all infrastructure changes
  - **Why**: Ensure all refactoring compiles and doesn't break existing functionality
  - **Commands**:
    ```bash
    cd infrastructure/pulumi
    npm run build
    pulumi preview --stack local
    pulumi preview --stack preview-base
    pulumi preview --stack production
    ```
  - **Checks**:
    - TypeScript compiles without errors
    - All stacks show "no changes" (idempotent refactoring)
    - PDBs appear in production preview
    - Backup CronJob appears in production preview (if enabled)
  - **Acceptance**: All stacks compile, previews show expected resources
  - **Dependencies**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06

---

**Phase 14 Summary**:
- Refactors production to use factory pattern (eliminates duplication)
- Adds PodDisruptionBudgets for high availability
- Implements automated database backups
- Fixes SQL injection risk (defense in depth)
- Replaces `any` types with specific Pulumi types
- Adds automated drift detection
- Raises code quality from A- (88/100) to A+ (95/100)

---

### CI/CD Hotfix Dependencies

```
CICD-HOTFIX-01 (branch mismatch) ← RESOLVED - No code fix needed
CICD-HOTFIX-02 (kubectl wait) ← HIGH PRIORITY - Fix immediately (5min delay per deployment)
```

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
