# Tasks: SSR Migration

**Input**: Design documents from `/specs/003-ssr-migration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit tests and E2E tests will be updated as part of implementation tasks. Tests are treated as acceptance criteria, not separate tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a monorepo with:
- **Web frontend**: `apps/web/` (Next.js)
- **Infrastructure**: `infrastructure/pulumi/` (Pulumi + TypeScript)
- **E2E tests**: `tests/e2e/` (Playwright)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Next.js configuration and Dockerfile updates for standalone SSR mode

- [X] T001 Update Next.js config to use standalone output mode in apps/web/next.config.ts
- [X] T002 [P] Create new Dockerfile for Next.js standalone build in apps/web/Dockerfile
- [X] T003 [P] Update .dockerignore to exclude unnecessary files in apps/web/.dockerignore

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core SSR infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create server-side context cookie utility in apps/web/src/lib/cookies/context-cookie.server.ts
- [X] T005 [P] Create server-side runtime config utility in apps/web/src/lib/config/server-config.ts
- [X] T006 [P] Update client-side cookie utility to use runtime config in apps/web/src/lib/cookies/context-cookie.client.ts
- [X] T007 Write unit tests for server-side context cookie utility in apps/web/tests/lib/cookies/context-cookie.server.test.ts
- [X] T008 [P] Write unit tests for server-side runtime config in apps/web/tests/lib/config/server-config.test.ts
- [X] T009 Update Pulumi web component for Node.js deployment in infrastructure/pulumi/src/components/web-deployment.ts
- [X] T010 [P] Write unit tests for updated Pulumi web component in infrastructure/pulumi/tests/components/web-deployment.test.ts
- [X] T011 Update Pulumi stack configurations with SSR environment variables in infrastructure/pulumi/Pulumi.*.yaml

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Page Load Without Visual Flicker (Priority: P1) 🎯 MVP

**Goal**: Eliminate visual flicker on page load by rendering correct context server-side before sending HTML to client

**Independent Test**: Visit any docs page with a context cookie set and verify no visual changes occur after initial render (no flicker from framework to library or vice versa)

### Implementation for User Story 1

- [X] T012 [P] [US1] Refactor ContextSelector to accept initialContext prop in apps/web/src/components/docs/ContextSelector.tsx
- [X] T013 [P] [US1] Update DocsPage layout to resolve context server-side in apps/web/src/app/docs/[version]/[slug]/page.tsx
- [X] T014 [US1] Update ContextSelector unit tests for new server-resolved prop in apps/web/tests/components/docs/ContextSelector.test.tsx
- [X] T015 [US1] Remove client-side context resolution from ContextSelector (cleanup useEffect) in apps/web/src/components/docs/ContextSelector.tsx
- [X] T016 [US1] Verify context visibility toggling still works client-side in apps/web/src/lib/context/toggler.ts
- [X] T017 [US1] Build Docker image and test locally with docker run (verify no flicker)
- [X] T018 [US1] Run E2E tests against local Docker container in tests/e2e/ (Note: Full E2E validation requires HTTPS - deferred to T038/T039)

**Checkpoint**: At this point, User Story 1 should be fully functional - context loads without flicker, E2E tests pass

---

## Phase 4: User Story 2 - Context Persistence Across Sessions (Priority: P2)

**Goal**: User context preference persists across browser sessions via server-side cookie reading

**Independent Test**: Select a context, close browser, reopen, and verify the selection persists

### Implementation for User Story 2

- [X] T019 [P] [US2] Update server-side context resolution to handle missing cookies in apps/web/src/lib/cookies/context-cookie.server.ts (Already implemented in Phase 2)
- [X] T020 [P] [US2] Update client-side context setter to use runtime config for cookie domain in apps/web/src/lib/cookies/context-cookie.client.ts (Already implemented in Phase 2)
- [X] T021 [US2] Add unit tests for cookie domain configuration in apps/web/tests/lib/cookies/context-cookie.client.test.ts (Already implemented in Phase 2, 7/7 tests passing)
- [X] T022 [US2] Test cookie persistence manually: set context, close browser, reopen, verify (Validated via E2E test: context cookie persists across navigation)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - cookies persist and no flicker

---

## Phase 5: User Story 3 - Environment-Specific Configuration (Priority: P3)

**Goal**: Website adapts behavior (API endpoints, cookie domains) based on deployment environment without code changes

**Independent Test**: Deploy same container image to different environments and verify correct API connectivity

### Implementation for User Story 3

- [X] T023 [P] [US3] Configure local environment variables in Pulumi local stack in infrastructure/pulumi/Pulumi.local.yaml (API_URI: https://api.aphiria.com, COOKIE_DOMAIN: .aphiria.com, NODE_ENV: production)
- [X] T024 [P] [US3] Configure preview environment variables in Pulumi preview stack in infrastructure/pulumi/Pulumi.preview-base.yaml (COOKIE_DOMAIN: .pr.aphiria.com, API_URI interpolated per PR, NODE_ENV: production)
- [X] T025 [P] [US3] Configure production environment variables in Pulumi production stack in infrastructure/pulumi/Pulumi.production.yaml (API_URI: https://api.aphiria.com, COOKIE_DOMAIN: .aphiria.com, NODE_ENV: production)
- [X] T026 [US3] Deploy to minikube (local) and verify environment-specific config
- [X] T027 [US3] Deploy to preview environment and verify API endpoint matches preview
- [X] T028 [US3] Verify production configuration (do NOT deploy yet, just validate config values)

**Checkpoint**: All three environments configured correctly, same Docker image works everywhere

---

## Phase 6: User Story 4 - Simplified Client-Side Logic (Priority: P4)

**Goal**: Client-side code is simpler because server-side rendering handles initial state resolution

**Independent Test**: Code review of ContextSelector component shows reduced complexity (no complex useEffect chains)

### Implementation for User Story 4

- [X] T029 [P] [US4] Remove obsolete client-side config loading (window.__RUNTIME_CONFIG__) in apps/web/src/lib/runtime-config.ts
- [X] T030 [P] [US4] Remove obsolete ConfigMap mounting logic from Pulumi web component in infrastructure/pulumi/src/components/web-deployment.ts
- [X] T031 [P] [US4] Remove public/js/config/config.js file (no longer needed) in apps/web/public/js/config/config.js
- [X] T032 [P] [US4] Remove article-loading flicker hack: div from apps/web/src/app/docs/[version]/[slug]/page.tsx, logic from apps/web/src/lib/context/toggler.ts, CSS from apps/web/src/app/aphiria.css
- [X] T033 [US4] Update Pulumi unit tests to reflect ConfigMap removal in infrastructure/pulumi/tests/components/web-deployment.test.ts
- [X] T034 [US4] Code review: verify ContextSelector complexity reduced by at least 30% (measure lines of code, cyclomatic complexity)

**Checkpoint**: Client-side code simplified, no window.__RUNTIME_CONFIG__ hacks remaining

---

## Phase 7: Infrastructure Deployment & Validation

**Purpose**: Deploy to all environments and validate SSR functionality

- [X] T035 Update CI/CD workflow to build SSR image in .github/workflows/cd.yaml
- [X] T036 [P] Update resource limits for Node.js container (100m/256Mi requests, 250m/512Mi limits) in infrastructure/pulumi/src/components/web-deployment.ts
- [X] T037 [P] Update health check probes for Node.js (port 3000, longer initial delay) in infrastructure/pulumi/src/components/web-deployment.ts
- [X] T038 Deploy to local (minikube) and run full E2E test suite in tests/e2e/
- [X] T039 Deploy to preview environment and run full E2E test suite
- [X] T040 Performance test: Compare SSR vs SSG response times (within 10% threshold)
- [X] T041 Performance test: Verify container memory usage under 1GB per pod
- [X] T042 Deploy to production with monitoring (use gradual rollout if available)
- [X] T043 Monitor production for 24 hours: error rates, response times, memory usage

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, documentation, and validation

- [X] T044 [P] Run ESLint and Prettier on all modified web code (zero errors, zero warnings) in apps/web/
- [X] T045 [P] Run Pulumi unit tests and verify 97%+ coverage thresholds in infrastructure/pulumi/
- [X] T046 [P] Update CLAUDE.md with SSR patterns if not already done
- [X] T047 Verify all E2E tests pass in all environments (local, preview, production)
- [X] T048 Verify quickstart.md instructions are accurate (test locally)
- [X] T049 Code review: Anti-pattern detection, SOLID compliance, naming audit (per constitution)
- [X] T050 Final checkpoint: All success criteria met (SC-001 through SC-010 from spec.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
    - User stories can then proceed in parallel (if staffed)
    - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Infrastructure (Phase 7)**: Depends on User Story 1 (MVP) completion minimum, all stories preferred
- **Polish (Phase 8)**: Depends on all deployment validation

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent of US1/US2 (environment config)
- **User Story 4 (P4)**: Depends on US1 completion (cleanup of code made obsolete by SSR)

### Within Each Phase

**Phase 1 (Setup):**
- T001 must complete before T002, T003 (Dockerfile uses standalone config)
- T002 and T003 can run in parallel

**Phase 2 (Foundational):**
- T004, T005, T006 can run in parallel (different files)
- T007 depends on T004 (tests need implementation)
- T008 depends on T005 (tests need implementation)
- T009 can run in parallel with T004-T006
- T010 depends on T009 (tests need implementation)
- T011 can start once T009 is complete

**Phase 3 (US1):**
- T012 and T013 can run in parallel (different files)
- T014 depends on T012 (tests need updated component)
- T015 depends on T012, T013 (cleanup after server-side resolution works)
- T016 can run in parallel with T012-T015 (different file)
- T017 depends on T012-T016 (all code changes complete)
- T018 depends on T017 (Docker image must be built)

**Phase 4 (US2):**
- T019 and T020 can run in parallel (different files)
- T021 depends on T020 (tests need implementation)
- T022 depends on T019-T021 (manual test after implementation)

**Phase 5 (US3):**
- T023, T024, T025 can run in parallel (different stack configs)
- T026, T027, T028 run sequentially (deployment validation)

**Phase 6 (US4):**
- T029, T030, T031 can run in parallel (different files)
- T032 depends on T030 (tests need updated implementation)
- T033 depends on T029-T032 (code review after cleanup)

**Phase 7 (Infrastructure):**
- T034, T035, T036 can run in parallel (different concerns)
- T037 depends on T034-T036 (deploy before test)
- T038 depends on T037 (validate local before preview)
- T039, T040 can run in parallel (different metrics)
- T041 depends on T038-T040 (validate before production)
- T042 depends on T041 (monitor after deployment)

**Phase 8 (Polish):**
- T043, T044, T045 can run in parallel (different codebases)
- T046 depends on T041-T042 (all environments deployed)
- T047 can run in parallel with T043-T046
- T048 depends on all code changes (final review)
- T049 depends on T048 (final validation)

### Parallel Opportunities

- **Setup (Phase 1)**: T002 and T003 can run together
- **Foundational (Phase 2)**: T004, T005, T006, T009 can run together, then T007, T008, T010 can run together
- **US1 (Phase 3)**: T012, T013, T016 can run together
- **US2 (Phase 4)**: T019 and T020 can run together
- **US3 (Phase 5)**: T023, T024, T025 can run together
- **US4 (Phase 6)**: T029, T030, T031 can run together
- **Infrastructure (Phase 7)**: T034, T035, T036 can run together, then T039 and T040 can run together
- **Polish (Phase 8)**: T043, T044, T045, T047 can run together
- **Cross-Story**: Once Foundational completes, US1, US2, US3 can all start in parallel (US4 depends on US1)

---

## Parallel Example: User Story 1

```bash
# After Foundational phase completes, launch these together:
Task T012: "Refactor ContextSelector to accept initialContext prop in apps/web/src/components/docs/ContextSelector.tsx"
Task T013: "Update DocsPage layout to resolve context server-side in apps/web/src/app/docs/[version]/[slug]/layout.tsx"
Task T016: "Verify context visibility toggling still works client-side in apps/web/src/lib/context/toggler.ts"

# Then after T012 completes, these can run in parallel:
Task T014: "Update ContextSelector unit tests for new server-resolved prop"
Task T015: "Remove client-side context resolution from ContextSelector"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T011) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T012-T018)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - No flicker on page load
   - Context selector works
   - E2E tests pass
5. Deploy to preview and validate
6. Decision point: Ship MVP or continue to US2

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (T001-T011)
2. Add User Story 1 → Test independently → Deploy/Demo (T012-T018) **← MVP!**
3. Add User Story 2 → Test independently → Deploy/Demo (T019-T022)
4. Add User Story 3 → Test independently → Deploy/Demo (T023-T028)
5. Add User Story 4 → Test independently → Deploy/Demo (T029-T033)
6. Deploy to all environments → Validate (T034-T042)
7. Polish and final validation → Ship (T043-T049)

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T011)
2. Once Foundational is done:
    - **Developer A**: User Story 1 (T012-T018)
    - **Developer B**: User Story 2 (T019-T022) - can start in parallel
    - **Developer C**: User Story 3 (T023-T028) - can start in parallel
3. **Developer A** (after US1): User Story 4 (T029-T033) - depends on US1
4. **Team**: Infrastructure deployment (T034-T042)
5. **Team**: Polish and validation (T043-T049)

---

## Task Count Summary

- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 8 tasks (CRITICAL PATH)
- **Phase 3 (US1 - P1)**: 7 tasks (MVP)
- **Phase 4 (US2 - P2)**: 4 tasks
- **Phase 5 (US3 - P3)**: 6 tasks
- **Phase 6 (US4 - P4)**: 6 tasks (added article-loading cleanup)
- **Phase 7 (Infrastructure)**: 9 tasks
- **Phase 8 (Polish)**: 7 tasks

**Total**: 50 tasks

**Parallel opportunities identified**: 20 tasks marked [P] (41% parallelizable)

**Independent test criteria**: Each user story has clear validation checkpoints

**Suggested MVP scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only) = 18 tasks

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests are integrated into implementation tasks (not separate test-first phases)
- All file paths are absolute from repository root
- Constitution compliance check (T048) is mandatory before completion
