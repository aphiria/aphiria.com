# Implementation Tasks: Pull Request Ephemeral Environments

**Branch**: `001-ephemeral-environment`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

---

## Overview

This document organizes implementation tasks by user story to enable independent, incremental delivery. Each phase represents a complete, testable increment.

**Total Tasks**: 47
**User Stories**: 3 (P1, P2, P3)
**Parallel Opportunities**: 23 tasks can run in parallel within phases

---

## Implementation Strategy

### MVP Scope (User Story 1 - P1)
Deploy and update ephemeral preview environments with maintainer approval. This provides core value and validates the infrastructure.

### Incremental Delivery
1. **Phase 1-2**: Setup base infrastructure (persistent stack)
2. **Phase 3**: US1 - Core preview deployment (create, update)
3. **Phase 4**: US2 - Public access validation (already implemented by US1)
4. **Phase 5**: US3 - Automatic cleanup on PR close

---

## Task Dependency Graph

```
Phase 1 (Setup)
  ↓
Phase 2 (Foundational - Base Infrastructure)
  ↓
Phase 3 (US1 - Preview Deployment) ← MVP Complete Here
  ↓
Phase 4 (US2 - Public Access) ← Minimal work, mostly validation
  ↓
Phase 5 (US3 - Cleanup)
  ↓
Phase 6 (Polish)
```

**Story Dependencies**:
- US1 (P1): No dependencies - can start immediately after Phase 2
- US2 (P2): Depends on US1 (uses same infrastructure)
- US3 (P3): Depends on US1 (destroys what US1 creates)

---

## Phase 1: Setup & Prerequisites

**Goal**: Initialize project structure and configure base requirements

### Tasks

- [ ] T001 Create Pulumi project directory structure at `infrastructure/pulumi/ephemeral/`
- [ ] T002 Initialize Pulumi project with TypeScript in `infrastructure/pulumi/ephemeral/`
- [ ] T003 [P] Create `.gitignore` entries for Pulumi state and node_modules in `infrastructure/pulumi/ephemeral/.gitignore`
- [ ] T004 [P] Configure Pulumi backend (Pulumi Cloud or S3) in `infrastructure/pulumi/ephemeral/Pulumi.yaml`
- [ ] T005 Install Pulumi Kubernetes provider in `infrastructure/pulumi/ephemeral/package.json`
- [ ] T006 [P] Install Pulumi PostgreSQL provider (for database operations) in `infrastructure/pulumi/ephemeral/package.json`
- [ ] T007 [P] Create GitHub Actions workflow directory structure at `.github/workflows/`
- [ ] T008 Document Pulumi stack naming conventions in `infrastructure/pulumi/ephemeral/README.md`

**Completion Criteria**:
- ✅ Pulumi project initialized and can run `pulumi preview`
- ✅ Dependencies installed
- ✅ Project structure matches plan.md

---

## Phase 2: Foundational - Base Infrastructure Stack

**Goal**: Deploy persistent infrastructure (ephemeral-base stack) that supports all preview environments

**Independent Test**: Verify base stack deploys successfully and outputs expected values (PostgreSQL service, Gateway reference, wildcard TLS secret)

### Tasks

- [ ] T009 Create base infrastructure Pulumi program in `infrastructure/pulumi/ephemeral/src/base-stack.ts`
- [ ] T010 [P] Define PostgreSQL deployment in base stack (`infrastructure/pulumi/ephemeral/src/base-stack.ts`)
- [ ] T011 [P] Define Gateway API configuration in base stack (`infrastructure/pulumi/ephemeral/src/base-stack.ts`)
- [ ] T012 Configure wildcard TLS certificate (`*.pr.aphiria.com`) via cert-manager in `infrastructure/pulumi/ephemeral/src/base-stack.ts`
- [ ] T013 Create DNS wildcard records (`*.pr.aphiria.com`, `*.pr-api.aphiria.com`) in DigitalOcean DNS
- [ ] T014 Export base stack outputs (PostgreSQL host, Gateway name, TLS secret) in `infrastructure/pulumi/ephemeral/src/base-stack.ts`
- [ ] T015 Deploy base stack manually: `pulumi up --stack ephemeral-base`
- [ ] T016 Verify PostgreSQL is running and accessible within cluster
- [ ] T017 [P] Document base stack outputs and usage in `infrastructure/pulumi/ephemeral/README.md`

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

- [ ] T018 [US1] Create ephemeral stack Pulumi program in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T019 [P] [US1] Implement Kubernetes namespace creation in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T020 [P] [US1] Implement per-PR database creation logic in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T021 [P] [US1] Create ConfigMap generator with PR-specific values in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T022 [P] [US1] Create Secret generator for DB credentials in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T023 [P] [US1] Implement ResourceQuota (2 CPU, 4Gi, 5 pods) in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T024 [P] [US1] Implement NetworkPolicy for namespace isolation in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T025 [US1] Create web Deployment (1 replica) with image digest reference in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T026 [US1] Create API Deployment (1 replica) with image digest reference in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T027 [P] [US1] Create web and API Services in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T028 [US1] Create HTTPRoute for web (`{PR}.pr.aphiria.com`) and API (`{PR}.pr-api.aphiria.com`) in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T029 [P] [US1] Add connection-level rate limiting annotations to HTTPRoute in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T030 [US1] Create db-migration Job (Phinx migrations + LexemeSeeder) in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T031 [US1] Export stack outputs (webUrl, apiUrl, databaseName) in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`

### CI/CD Tasks

- [ ] T032 [P] [US1] Create Docker build workflow in `.github/workflows/build-preview-images.yml`
- [ ] T033 [US1] Implement image digest capture in build workflow (`.github/workflows/build-preview-images.yml`)
- [ ] T034 [US1] Create preview deployment workflow in `.github/workflows/preview-deploy.yml`
- [ ] T035 [US1] Configure GitHub environment protection ("preview") with required reviewers
- [ ] T036 [US1] Implement Pulumi stack initialization in deployment workflow (`.github/workflows/preview-deploy.yml`)
- [ ] T037 [US1] Pass PR number and image digests to Pulumi program in `.github/workflows/preview-deploy.yml`
- [ ] T038 [US1] Implement deployment status polling (wait for pods ready) in `.github/workflows/preview-deploy.yml`
- [ ] T039 [US1] Create PR comment with deployment status in `.github/workflows/preview-deploy.yml`
- [ ] T040 [P] [US1] Add PR labels with image digests for production promotion tracking in `.github/workflows/preview-deploy.yml`

### Update Flow Tasks

- [ ] T041 [US1] Implement preview update logic (detect existing stack, run pulumi up with new digests) in `.github/workflows/preview-deploy.yml`
- [ ] T042 [US1] Update PR comment on successful update with new commit SHA in `.github/workflows/preview-deploy.yml`

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

- [ ] T043 [US2] Verify HTTPRoute has no authentication requirements (public access already configured in US1)
- [ ] T044 [US2] Test preview URL access from incognito browser (no GitHub session)
- [ ] T045 [US2] Document preview URL sharing instructions in `infrastructure/pulumi/ephemeral/README.md`

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

- [ ] T046 [US3] Create cleanup workflow in `.github/workflows/preview-cleanup.yml`
- [ ] T047 [US3] Implement Pulumi destroy logic in cleanup workflow (`.github/workflows/preview-cleanup.yml`)
- [ ] T048 [US3] Verify database drop in Pulumi destroy (query pg_database) in `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts`
- [ ] T049 [US3] Update PR comment on cleanup completion in `.github/workflows/preview-cleanup.yml`
- [ ] T050 [US3] Add cleanup verification (check namespace and stack no longer exist) in `.github/workflows/preview-cleanup.yml`

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

- [ ] T051 [P] Create maintainer quickstart guide in `infrastructure/pulumi/ephemeral/QUICKSTART.md`
- [ ] T052 [P] Document approval workflow in `.github/CONTRIBUTING.md`
- [ ] T053 [P] Update project README with preview environment section in `README.md`

### Operational Enhancements

- [ ] T054 [P] Add concurrency limits to prevent duplicate deployments for same PR in `.github/workflows/preview-deploy.yml`
- [ ] T055 [P] Implement deployment timeout (fail after 10 minutes) in `.github/workflows/preview-deploy.yml`
- [ ] T056 [P] Add error handling and detailed failure messages in `.github/workflows/preview-deploy.yml`

### Monitoring & Observability

- [ ] T057 [P] Add deployment metrics to PR comment (build time, deploy time) in `.github/workflows/preview-deploy.yml`
- [ ] T058 [P] Implement health check URL validation after deployment in `.github/workflows/preview-deploy.yml`

**Completion Criteria**:
- ✅ All documentation complete and accurate
- ✅ Workflows handle edge cases gracefully
- ✅ Error messages actionable
- ✅ Deployment observability improved

---

## Parallel Execution Opportunities

### Within Phase 3 (US1)
Can parallelize after T018 (ephemeral stack program created):
- **Group A**: T019-T024 (namespace, database, ConfigMap, Secret, quotas, policies)
- **Group B**: T025-T027 (Deployments and Services)
- **Group C**: T028-T029 (HTTPRoute and rate limiting)
- **Group D**: T032-T033 (Build workflow - independent of Pulumi tasks)

### Within Phase 6 (Polish)
All documentation tasks (T051-T053) can run in parallel
All operational tasks (T054-T058) can run in parallel after documentation

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

### Order of Execution

1. **Setup phase (T001-T008)**: Can work locally, no cloud resources needed
2. **Base infrastructure (T009-T017)**: Deploy once to cluster, verify before proceeding
3. **US1 tasks (T018-T042)**: Core functionality, most complex phase
4. **US2 tasks (T043-T045)**: Minimal work, mostly validation
5. **US3 tasks (T046-T050)**: Cleanup logic
6. **Polish (T051-T058)**: Can defer until after MVP validation

### Critical Path

The critical path (minimum tasks for MVP):
- Setup: T001, T002, T004, T005, T006
- Base: T009, T010, T013, T015
- US1: T018, T020, T021, T025, T026, T028, T030, T032, T034, T036, T037, T039

**Estimated MVP**: ~25 core tasks

### Rollback Strategy

If deployment fails or needs rollback:
1. Pulumi stack can be destroyed: `pulumi destroy --stack ephemeral-pr-{PR}`
2. Database automatically dropped during stack destroy
3. GitHub workflow can be manually cancelled
4. No persistent state outside Pulumi + Kubernetes

---

## File Reference

**Pulumi Programs**:
- `infrastructure/pulumi/ephemeral/src/base-stack.ts` - Persistent base infrastructure
- `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts` - Per-PR ephemeral resources

**GitHub Workflows**:
- `.github/workflows/build-preview-images.yml` - Docker image builds
- `.github/workflows/preview-deploy.yml` - Preview deployment and updates
- `.github/workflows/preview-cleanup.yml` - Cleanup on PR close

**Documentation**:
- `infrastructure/pulumi/ephemeral/README.md` - Pulumi setup and stack docs
- `infrastructure/pulumi/ephemeral/QUICKSTART.md` - Maintainer guide
- `README.md` - Project README (preview environment section)

---

**Next Steps**: Begin with Phase 1 (Setup) and proceed sequentially through phases. MVP is complete after Phase 3 (US1).
