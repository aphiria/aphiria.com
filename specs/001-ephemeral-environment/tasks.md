# Implementation Tasks: Pull Request Ephemeral Environments

**Branch**: `001-ephemeral-environment`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

---

## Overview

This document organizes implementation tasks by user story to enable independent, incremental delivery. Each phase represents a complete, testable increment.

**Total Tasks**: 70 (Updated 2025-12-20 to include Pulumi migration)
**User Stories**: 3 (P1, P2, P3)
**Parallel Opportunities**: 28 tasks can run in parallel within phases

---

## Implementation Strategy

### Architecture Decision (2025-12-20)

**Full Pulumi Migration**: Consolidate ALL infrastructure (dev-local, preview, production) from Helm/Kustomize to Pulumi for tool consolidation and "test what you deploy" validation.

**Migration Order**: dev-local → preview → production

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
Phase 7 (Migrate dev-local to Pulumi)
  ↓
Phase 8 (Migrate production to Pulumi)
```

**Story Dependencies**:
- Phase 0 creates shared components used by all subsequent phases
- US1 (P1): No dependencies - can start immediately after Phase 2
- US2 (P2): Depends on US1 (uses same infrastructure)
- US3 (P3): Depends on US1 (destroys what US1 creates)

---

## Phase 0: Pulumi Migration - Shared Components

**Goal**: Create reusable Pulumi components that will be used across dev-local, preview, and production stacks

**Rationale**: Consolidate infrastructure tooling from Helm/Kustomize/Pulumi → Pulumi only. This enables "test what you deploy" validation and eliminates tool sprawl.

### Tasks

- [ ] M001 Create shared Pulumi project structure at `infrastructure/pulumi/aphiria.com/`
- [ ] M002 Initialize Pulumi project with TypeScript in `infrastructure/pulumi/aphiria.com/`
- [ ] M003 [P] Install dependencies: @pulumi/kubernetes, @pulumi/pulumi, @pulumi/digitalocean, @pulumi/postgresql in `infrastructure/pulumi/aphiria.com/package.json`
- [ ] M004 [P] Create shared types definition file: `infrastructure/pulumi/aphiria.com/src/shared/types.ts`
- [ ] M005 Create shared Helm chart component: `infrastructure/pulumi/aphiria.com/src/shared/helm-charts.ts` (cert-manager, nginx-gateway)
- [ ] M006 [P] Create shared Gateway component: `infrastructure/pulumi/aphiria.com/src/shared/gateway.ts` (Gateway API resources, TLS certificates)
- [ ] M007 [P] Create shared PostgreSQL component: `infrastructure/pulumi/aphiria.com/src/shared/database.ts` (deployment, service, database creation)
- [ ] M008 Create shared web deployment component: `infrastructure/pulumi/aphiria.com/src/shared/web-deployment.ts` (nginx, js-config ConfigMap)
- [ ] M009 Create shared API deployment component: `infrastructure/pulumi/aphiria.com/src/shared/api-deployment.ts` (nginx + PHP-FPM, initContainer pattern)
- [ ] M010 [P] Create shared db-migration job component: `infrastructure/pulumi/aphiria.com/src/shared/db-migration.ts` (Phinx + LexemeSeeder)
- [ ] M011 [P] Create shared HTTPRoute component: `infrastructure/pulumi/aphiria.com/src/shared/http-route.ts` (Gateway API routing)
- [ ] M012 Document shared component usage in `infrastructure/pulumi/aphiria.com/README.md`

**Completion Criteria**:
- ✅ All shared components implemented with TypeScript type safety
- ✅ Components support environment-specific configuration (dev-local, preview, production)
- ✅ Components match existing Kustomize/Helm behavior exactly
- ✅ README documents component parameters and usage examples

**Parallel Opportunities**: M003-M011 can be developed in parallel after M002

---

## Phase 1: Setup & Prerequisites

**Goal**: Initialize preview-specific project structure and configure base requirements

### Tasks

- [X] T001 Create Pulumi project directory structure at `infrastructure/pulumi/ephemeral/`
- [X] T002 Initialize Pulumi project with TypeScript in `infrastructure/pulumi/ephemeral/`
- [X] T003 [P] Create `.gitignore` entries for Pulumi state and node_modules in `infrastructure/pulumi/ephemeral/.gitignore`
- [X] T004 [P] Configure Pulumi backend (Pulumi Cloud or S3) in `infrastructure/pulumi/ephemeral/Pulumi.yaml`
- [X] T005 Install Pulumi Kubernetes provider in `infrastructure/pulumi/ephemeral/package.json`
- [X] T006 [P] Install Pulumi PostgreSQL provider (for database operations) in `infrastructure/pulumi/ephemeral/package.json`
- [X] T007 [P] Create GitHub Actions workflow directory structure at `.github/workflows/`
- [X] T008 Document Pulumi stack naming conventions in `infrastructure/pulumi/ephemeral/README.md`

**Completion Criteria**:
- ✅ Pulumi project initialized and can run `pulumi preview`
- ✅ Dependencies installed
- ✅ Project structure matches plan.md

---

## Phase 2: Foundational - Base Infrastructure Stack

**Goal**: Deploy persistent infrastructure (ephemeral-base stack) that supports all preview environments

**Independent Test**: Verify base stack deploys successfully and outputs expected values (PostgreSQL service, Gateway reference, wildcard TLS secret)

### Tasks

- [X] T009 Create base infrastructure Pulumi program in `infrastructure/pulumi/ephemeral/src/base-stack.ts`
- [X] T010 [P] Define PostgreSQL deployment in base stack (`infrastructure/pulumi/ephemeral/src/base-stack.ts`)
- [X] T011 [P] Define Gateway API configuration in base stack (`infrastructure/pulumi/ephemeral/src/base-stack.ts`)
- [X] T012 Configure wildcard TLS certificate (`*.pr.aphiria.com`) via cert-manager in `infrastructure/pulumi/ephemeral/src/base-stack.ts`
- [ ] T013 Create DNS wildcard records (`*.pr.aphiria.com`, `*.pr-api.aphiria.com`) in DigitalOcean DNS
- [X] T014 Export base stack outputs (PostgreSQL host, Gateway name, TLS secret) in `infrastructure/pulumi/ephemeral/src/base-stack.ts`
- [ ] T015 Deploy base stack manually: `pulumi up --stack ephemeral-base`
- [ ] T016 Verify PostgreSQL is running and accessible within cluster
- [X] T017 [P] Document base stack outputs and usage in `infrastructure/pulumi/ephemeral/README.md`

**Completion Criteria**:
- ✅ `ephemeral-base` Pulumi stack deployed successfully
- ✅ PostgreSQL running and accessible via service `db`
- ✅ Gateway API configured and ready
- ✅ Wildcard TLS cert issued and stored as K8s Secret
- ✅ DNS records resolve to cluster load balancer
- ✅ Stack outputs available for ephemeral stacks

---

## Phase 3: User Story 1 (P1) - Preview Pull Request Changes

**Goal**: Deploy and update ephemeral preview environments with maintainer approval

**User Story**: As a maintainer, I want to preview pull request changes in a live, isolated environment so that I can validate functionality and behavior before merging.

**Independent Test**:
1. Open test PR → approve deployment → verify environment accessible at `{PR}.pr.aphiria.com`
2. Push new commit → verify environment updates with new image digest
3. Verify production can reference same image digest used in preview

### Infrastructure Tasks

- [X] T018 [US1] Create ephemeral stack Pulumi program in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T019 [P] [US1] Implement Kubernetes namespace creation in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T020 [P] [US1] Implement per-PR database creation logic in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T021 [P] [US1] Create ConfigMap generator with PR-specific values in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T022 [P] [US1] Create Secret generator for DB credentials in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T023 [P] [US1] Implement ResourceQuota (2 CPU, 4Gi, 5 pods) in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T024 [P] [US1] Implement NetworkPolicy for namespace isolation in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T025 [US1] Create web Deployment (1 replica) with image digest reference in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T026 [US1] Create API Deployment (1 replica) with image digest reference in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T027 [P] [US1] Create web and API Services in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T028 [US1] Create HTTPRoute for web (`{PR}.pr.aphiria.com`) and API (`{PR}.pr-api.aphiria.com`) in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T029 [P] [US1] Add connection-level rate limiting annotations to HTTPRoute in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T030 [US1] Create db-migration Job (Phinx migrations + LexemeSeeder) in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T031 [US1] Export stack outputs (webUrl, apiUrl, databaseName) in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`

### CI/CD Tasks

- [X] T032 [P] [US1] Create Docker build workflow in `.github/workflows/build-preview-images.yml`
- [X] T033 [US1] Implement image digest capture in build workflow (`.github/workflows/build-preview-images.yml`)
- [X] T034 [US1] Create preview deployment workflow in `.github/workflows/preview-deploy.yml`
- [ ] T035 [US1] Configure GitHub environment protection ("preview") with required reviewers
- [X] T036 [US1] Implement Pulumi stack initialization in deployment workflow (`.github/workflows/preview-deploy.yml`)
- [X] T037 [US1] Pass PR number and image digests to Pulumi program in `.github/workflows/preview-deploy.yml`)
- [X] T038 [US1] Implement deployment status polling (wait for pods ready) in `.github/workflows/preview-deploy.yml`
- [X] T039 [US1] Create PR comment with deployment status in `.github/workflows/preview-deploy.yml`
- [X] T040 [P] [US1] Add PR labels with image digests for production promotion tracking in `.github/workflows/preview-deploy.yml`

### Update Flow Tasks

- [X] T041 [US1] Implement preview update logic (detect existing stack, run pulumi up with new digests) in `.github/workflows/preview-deploy.yml`
- [X] T042 [US1] Update PR comment on successful update with new commit SHA in `.github/workflows/preview-deploy.yml`

**Acceptance Validation** (Manual):
1. Open test PR with code changes
2. Workflow waits for approval
3. Approve deployment via GitHub UI
4. Verify environment provisions within 5 minutes
5. Access `{PR}.pr.aphiria.com` - see PR changes
6. Access `{PR}.pr-api.aphiria.com` - API works, search functional
7. Push new commit to PR
8. Verify automatic update (new image digest deployed)
9. Verify PR comment shows deployment status and URLs

---

## Phase 4: User Story 2 (P2) - Share Preview with Stakeholders

**Goal**: Enable public access to preview environments for stakeholder validation

**User Story**: As a maintainer, I want to share a working preview URL so that reviewers or stakeholders can validate behavior without local setup.

**Independent Test**:
1. Share preview URL with non-GitHub user → verify accessible without login
2. Multiple users access preview simultaneously → verify no conflicts

### Tasks

- [X] T043 [US2] Verify HTTPRoute has no authentication requirements (public access already configured in US1)
- [ ] T044 [US2] Test preview URL access from incognito browser (no GitHub session)
- [X] T045 [US2] Document preview URL sharing instructions in `infrastructure/pulumi/ephemeral/README.md`

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

- [X] T046 [US3] Create cleanup workflow in `.github/workflows/preview-cleanup.yml`
- [X] T047 [US3] Implement Pulumi destroy logic in cleanup workflow (`.github/workflows/preview-cleanup.yml`)
- [X] T048 [US3] Verify database drop in Pulumi destroy (query pg_database) in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [X] T049 [US3] Update PR comment on cleanup completion in `.github/workflows/preview-cleanup.yml`
- [X] T050 [US3] Add cleanup verification (check namespace and stack no longer exist) in `.github/workflows/preview-cleanup.yml`

**Acceptance Validation** (Manual):
1. Create and deploy test preview environment
2. Close the PR without merging
3. Verify cleanup workflow triggers automatically
4. Verify preview URL becomes inaccessible
5. Verify namespace deleted: `kubectl get namespace ephemeral-pr-{PR}` returns not found
6. Verify database dropped: Query PostgreSQL for `aphiria_pr_{PR}` → not found
7. Verify Pulumi stack removed: `pulumi stack ls` shows no `ephemeral-pr-{PR}`
8. Repeat test with merged PR instead of closed

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Production readiness, documentation, and operational improvements

### Documentation

- [X] T051 [P] Create maintainer quickstart guide in `infrastructure/pulumi/ephemeral/QUICKSTART.md`
- [X] T052 [P] Document approval workflow in `.github/CONTRIBUTING.md`
- [X] T053 [P] Update project README with preview environment section in `README.md`

### Operational Enhancements

- [X] T054 [P] Add concurrency limits to prevent duplicate deployments for same PR in `.github/workflows/preview-deploy.yml`
- [X] T055 [P] Implement deployment timeout (fail after 10 minutes) in `.github/workflows/preview-deploy.yml`
- [X] T056 [P] Add error handling and detailed failure messages in `.github/workflows/preview-deploy.yml`

### Monitoring & Observability

- [X] T057 [P] Add deployment metrics to PR comment (build time, deploy time) in `.github/workflows/preview-deploy.yml`
- [X] T058 [P] Implement health check URL validation after deployment in `.github/workflows/preview-deploy.yml`

### Secrets Management

- [ ] T059 Review and document all required secrets for dev-local, preview, and production environments
- [ ] T060 Evaluate secrets management strategy: Pulumi ESC (free tier) vs GitHub Secrets vs hybrid approach
- [ ] T061 Implement chosen secrets management solution across all environments
- [ ] T062 Document secrets rotation procedures and access control

### Workflow Cleanup

- [ ] T063 Update `test.yml` to remove Pulumi preview steps (lines 82-120) since infrastructure preview is now in separate workflows
- [ ] T064 Remove `build-docker-image.yml` (replaced by `build-preview-images.yml` for now, will be refactored to reusable `build-images.yml` later)
- [ ] T065 Remove `build-deploy.yml` (replaced by `production-deploy.yml` - to be created in Phase 8)

### Infrastructure Preview for OSS Safety

- [ ] T066 [FR-066] Add Pulumi preview step to `preview-deploy.yml` that runs BEFORE environment approval gate
- [ ] T067 [FR-067] Post Pulumi preview output as PR comment showing all infrastructure changes (creates, updates, deletes)
- [ ] T068 [FR-068] Remove `--skip-preview` flags from all `pulumi up` commands in `preview-deploy.yml`

**Completion Criteria**:
- ✅ All documentation complete and accurate
- ✅ Workflows handle edge cases gracefully
- ✅ Error messages actionable
- ✅ Deployment observability improved
- ✅ Secrets management strategy documented and implemented

---

## Phase 7: Migrate dev-local to Pulumi

**Goal**: Migrate Minikube local development from Kustomize to Pulumi using shared components

**Why First**: Test migration locally before touching production. Low risk, validates shared component patterns.

### Tasks

- [ ] M013 Create dev-local stack program: `infrastructure/pulumi/aphiria.com/src/dev-local-stack.ts`
- [ ] M014 Import shared Helm chart component (cert-manager, nginx-gateway) in dev-local stack
- [ ] M015 [P] Import shared PostgreSQL component with dev-local config in dev-local stack
- [ ] M016 [P] Import shared Gateway component with self-signed TLS for Minikube in dev-local stack
- [ ] M017 Import shared web deployment component with dev-local configuration in dev-local stack
- [ ] M018 Import shared API deployment component with dev-local configuration in dev-local stack
- [ ] M019 [P] Import shared db-migration job component in dev-local stack
- [ ] M020 [P] Import shared HTTPRoute component for local domains (aphiria.com, api.aphiria.com) in dev-local stack
- [ ] M021 Configure Pulumi stack config for dev-local: `pulumi config set`
- [ ] M022 Create `dev-local` Pulumi stack: `pulumi stack init dev-local`
- [ ] M023 Deploy dev-local stack to Minikube: `pulumi up --stack dev-local`
- [ ] M024 Verify local site accessible at https://www.aphiria.com
- [ ] M025 Verify local API accessible at https://api.aphiria.com/docs
- [ ] M026 Test local rebuild cycle: build images → pulumi up → verify changes
- [ ] M027 Document dev-local Pulumi workflow in README.md (replace Kustomize instructions)

**Completion Criteria**:
- ✅ Minikube deployment fully managed by Pulumi
- ✅ `pulumi up --stack dev-local` deploys complete local environment
- ✅ Site and API accessible at local domains
- ✅ Local development workflow faster than Kustomize (no `helmfile` + `kubectl apply` steps)
- ✅ Shared components validated in real environment

**Testing**:
1. Fresh Minikube: `minikube delete && minikube start`
2. Deploy: `cd infrastructure/pulumi/aphiria.com && pulumi up --stack dev-local`
3. Verify: Access https://www.aphiria.com and https://api.aphiria.com/docs
4. Update: Change code, rebuild images, `pulumi up`, verify changes
5. Teardown: `pulumi destroy --stack dev-local`

---

## Phase 8: Migrate Production to Pulumi

**Goal**: Migrate DigitalOcean production deployment from Kustomize to Pulumi using shared components

**Why Last**: Highest risk. Migrated after validating shared components in dev-local and preview environments.

### Tasks

- [ ] M028 Create production stack program: `infrastructure/pulumi/aphiria.com/src/production-stack.ts`
- [ ] M029 Import shared Helm chart component (cert-manager, nginx-gateway) in production stack
- [ ] M030 [P] Import shared PostgreSQL component with production config (2 replicas, persistent storage) in production stack
- [ ] M031 [P] Import shared Gateway component with Let's Encrypt production TLS in production stack
- [ ] M032 Import shared web deployment component with production configuration (2 replicas) in production stack
- [ ] M033 Import shared API deployment component with production configuration (2 replicas) in production stack
- [ ] M034 [P] Import shared db-migration job component in production stack
- [ ] M035 [P] Import shared HTTPRoute component for production domains (aphiria.com, api.aphiria.com, www.aphiria.com) in production stack
- [ ] M036 Configure Pulumi stack config for production: `pulumi config set --secret` for sensitive values
- [ ] M037 Create `production` Pulumi stack: `pulumi stack init production`
- [ ] M038 **DRY RUN**: `pulumi preview --stack production` (verify changes before applying)
- [ ] M039 **IMPORT EXISTING RESOURCES**: Use `pulumi import` for existing PostgreSQL, Gateway to avoid recreation
- [ ] M040 Deploy production stack: `pulumi up --stack production` (off-peak hours)
- [ ] M041 Verify production site accessible at https://www.aphiria.com
- [ ] M042 Verify production API accessible at https://api.aphiria.com
- [ ] M043 Monitor for 24 hours: check logs, metrics, uptime
- [ ] M044 Update CI/CD workflows to use Pulumi instead of Kustomize for production deployments
- [ ] M045 Move old Kustomize files to `infrastructure/kubernetes-deprecated/`
- [ ] M046 Add deprecation notice to `infrastructure/kubernetes-deprecated/README.md`
- [ ] M047 Update main README.md deployment instructions (replace Kustomize with Pulumi)

**Completion Criteria**:
- ✅ Production fully managed by Pulumi
- ✅ Zero downtime during migration
- ✅ All production resources imported (no recreation)
- ✅ CI/CD workflows updated
- ✅ Old Kustomize files archived with deprecation notice
- ✅ Documentation updated

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
- **Group B**: M005-M011 (all component implementations)
- **Group C**: M012 (documentation - can write while implementing)

### Within Phase 3 (US1)
Can parallelize after T018 (ephemeral stack program created):
- **Group A**: T019-T024 (namespace, database, ConfigMap, Secret, quotas, policies)
- **Group B**: T025-T027 (Deployments and Services)
- **Group C**: T028-T029 (HTTPRoute and rate limiting)
- **Group D**: T032-T033 (Build workflow - independent of Pulumi tasks)

### Within Phase 6 (Polish)
All documentation tasks (T051-T053) can run in parallel
All operational tasks (T054-T058) can run in parallel after documentation

### Within Phase 7 (dev-local Migration)
Can parallelize after M013 (dev-local stack created):
- **Group A**: M014-M020 (all component imports)
- **Group B**: M021-M022 (stack configuration)

### Within Phase 8 (Production Migration)
Can parallelize after M028 (production stack created):
- **Group A**: M029-M035 (all component imports)
- **Group B**: M036-M037 (stack configuration)
- Must be sequential: M038 (preview) → M039 (import) → M040 (deploy) → M041-M043 (verify)

---

## Success Metrics

Track these throughout implementation:

- **SC-001**: Preview environments accessible within 5 minutes of approval
- **SC-002**: Both web and API URLs posted to PRs
- **SC-003**: ≥95% deployment success rate (minimal manual intervention)
- **SC-004**: Cleanup completes on PR close/merge
- **SC-005**: Zero orphaned resources after cleanup
- **SC-006**: Maintainer approval required for all privileged deployments

---

## Testing Strategy

### Manual Validation Per Phase

**Phase 2 (Base Infrastructure)**:
- Deploy `ephemeral-base` stack
- Verify all stack outputs present
- Verify PostgreSQL accessible
- Verify Gateway configured

**Phase 3 (US1 - Core Deployment)**:
- Open test PR
- Approve deployment
- Verify preview environment accessible
- Push new commit
- Verify automatic update
- Check image digest tracking

**Phase 4 (US2 - Public Access)**:
- Access preview URL without authentication
- Share URL with team member
- Verify simultaneous access works

**Phase 5 (US3 - Cleanup)**:
- Close test PR
- Verify automatic cleanup
- Verify all resources removed

### No Automated Tests
Per constitution check, this is infrastructure-only work. Validation is manual via GitHub Actions workflow execution and manual testing of preview environments.

---

## Implementation Notes

### Order of Execution (Updated 2025-12-20 with Migration)

**Recommended Execution Order**:

1. **Phase 0 (M001-M012)**: Create shared Pulumi components - foundation for all stacks
2. **Phase 1-2 (T001-T017)**: Setup preview infrastructure using shared components
3. **Phase 3-6 (T018-T058)**: Implement preview environments (MVP)
4. **Phase 7 (M013-M027)**: Migrate dev-local to Pulumi (validate shared components locally)
5. **Phase 8 (M028-M047)**: Migrate production to Pulumi (after validation)

**Alternative Order (User Preference)**:

Per user request: "let's migrate dev-local first so i can try running this in minikube before even trying to push anything out over the wire to digitalocean"

1. **Phase 0 (M001-M012)**: Create shared components
2. **Phase 7 (M013-M027)**: Migrate dev-local FIRST (test locally)
3. **Phase 1-2 (T001-T017)**: Setup preview infrastructure
4. **Phase 3-6 (T018-T058)**: Implement preview environments
5. **Phase 8 (M028-M047)**: Migrate production LAST

### Critical Path

**For MVP (Preview Environments)**:
- Migration: M001, M002, M003, M005, M007, M008, M009, M011
- Setup: T001, T002, T004, T005, T006
- Base: T009, T010, T013, T015
- US1: T018, T020, T021, T025, T026, T028, T030, T032, T034, T036, T037, T039

**Estimated MVP**: ~35 core tasks (includes shared components)

**For Full Migration (All Environments)**:
- All MVP tasks + Phase 7 (dev-local) + Phase 8 (production)
- **Estimated Total**: ~70 tasks

### Rollback Strategy

**Preview Environments**:
1. Pulumi stack can be destroyed: `pulumi destroy --stack ephemeral-pr-{PR}`
2. Database automatically dropped during stack destroy
3. GitHub workflow can be manually cancelled
4. No persistent state outside Pulumi + Kubernetes

**Production Migration Rollback**:
1. Keep Kustomize files in `infrastructure/kubernetes-deprecated/` for 24 hours
2. If issues after migration: `pulumi destroy --stack production`
3. Redeploy via Kustomize: `helmfile sync && kubectl apply -k infrastructure/kubernetes-deprecated/environments/prod`
4. Investigate issues, fix Pulumi stack, retry migration
5. Remove deprecated files only after 24h successful production operation

**Dev-Local Rollback**:
- Low risk (local only)
- Worst case: `pulumi destroy --stack dev-local`
- Redeploy via Kustomize: `helmfile sync && kubectl apply -k infrastructure/kubernetes/environments/dev`

---

## File Reference

**Shared Pulumi Components** (Phase 0):
- `infrastructure/pulumi/aphiria.com/src/shared/types.ts` - TypeScript type definitions
- `infrastructure/pulumi/aphiria.com/src/shared/helm-charts.ts` - Helm chart deployments (cert-manager, nginx-gateway)
- `infrastructure/pulumi/aphiria.com/src/shared/gateway.ts` - Gateway API resources, TLS certificates
- `infrastructure/pulumi/aphiria.com/src/shared/database.ts` - PostgreSQL deployment and database creation
- `infrastructure/pulumi/aphiria.com/src/shared/web-deployment.ts` - Web (nginx) deployment with js-config
- `infrastructure/pulumi/aphiria.com/src/shared/api-deployment.ts` - API (nginx + PHP-FPM) deployment with initContainer
- `infrastructure/pulumi/aphiria.com/src/shared/db-migration.ts` - Database migration job (Phinx + LexemeSeeder)
- `infrastructure/pulumi/aphiria.com/src/shared/http-route.ts` - Gateway API HTTPRoute configuration

**Pulumi Stack Programs**:
- `infrastructure/pulumi/aphiria.com/src/dev-local-stack.ts` - Minikube local development (Phase 7)
- `infrastructure/pulumi/aphiria.com/src/production-stack.ts` - DigitalOcean production deployment (Phase 8)
- `infrastructure/pulumi/ephemeral/src/base-stack.ts` - Persistent preview infrastructure (Phase 2)
- `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts` - Per-PR ephemeral resources (Phase 3)

**GitHub Workflows**:
- `.github/workflows/build-preview-images.yml` - Docker image builds
- `.github/workflows/preview-deploy.yml` - Preview deployment and updates
- `.github/workflows/preview-cleanup.yml` - Cleanup on PR close

**Documentation**:
- `infrastructure/pulumi/aphiria.com/README.md` - Shared components and stack documentation
- `infrastructure/pulumi/ephemeral/README.md` - Preview environment Pulumi setup
- `infrastructure/pulumi/ephemeral/QUICKSTART.md` - Maintainer preview deployment guide
- `README.md` - Project README (updated with Pulumi workflow)
- `.github/CONTRIBUTING.md` - Contributor guide with preview environment info

**Deprecated Files** (after Phase 8 completion):
- `infrastructure/kubernetes-deprecated/` - Old Kustomize manifests (preserved for 24h)
- `infrastructure/kubernetes-deprecated/README.md` - Deprecation notice

---

## Migration Strategy Summary

**Why Migrate to Pulumi**:
- ✅ Tool consolidation: Helm + Kustomize + Pulumi → Pulumi only
- ✅ Test what you deploy: Preview uses same components as production
- ✅ Type safety: Catch configuration errors before deployment
- ✅ Better local dev: Single `pulumi up` command vs `helmfile sync && kubectl apply`
- ✅ State management: Pulumi tracks all resources, reliable cleanup

**Migration Scope**:
1. **Helm charts** → Pulumi Helm provider (`src/shared/helm-charts.ts`)
2. **Kustomize base** → Pulumi shared components (`src/shared/*.ts`)
3. **Kustomize overlays** → Stack-specific configuration (dev-local, production)
4. **Image registry** → DockerHub to ghcr.io for better GitHub Actions integration
5. **Databases** → Pulumi manages PostgreSQL and logical databases across all environments

**Migration Order** (per user preference):
1. Phase 0: Create shared components (M001-M012)
2. Phase 7: Migrate dev-local FIRST (M013-M027) - test locally before cloud
3. Phase 1-2: Setup preview infrastructure (T001-T017)
4. Phase 3-6: Implement preview environments (T018-T058) - MVP complete
5. Phase 8: Migrate production LAST (M028-M047) - after validation

**Risk Mitigation**:
- Dev-local migration first: Validate shared components locally (low risk)
- Preview validation: Test shared components in DigitalOcean before production
- Production import: Use `pulumi import` to avoid resource recreation
- Rollback plan: Kustomize files remain in `infrastructure/kubernetes/` until Phase 8 completes successfully
- Deprecation only after validation: Files moved to `infrastructure/kubernetes-deprecated/` only after 24h successful production operation
- Monitoring: Watch logs and metrics for 24 hours after production migration
- Git rollback available: Can always restore Kustomize files from git history if needed

---

**Next Steps**:

**Updated 2025-12-20**: Begin with Phase 0 (Shared Components), then Phase 7 (dev-local migration) to validate locally before implementing preview environments.

**Execution Order**:
1. Phase 0 (M001-M012): Shared Pulumi components
2. Phase 7 (M013-M027): Migrate dev-local to Pulumi (test in Minikube)
3. Phase 1-2 (T001-T017): Setup preview infrastructure
4. Phase 3 (T018-T042): Preview deployment (MVP complete)
5. Phase 4-6 (T043-T058): Public access validation, cleanup, polish
6. Phase 8 (M028-M047): Migrate production to Pulumi
