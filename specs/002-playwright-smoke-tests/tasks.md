---
description: "Task list for Post-Deployment Smoke Tests feature implementation"
---

# Tasks: Post-Deployment Smoke Tests

**Input**: Design documents from `/specs/002-playwright-smoke-tests/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Tests are not a separate phase - the smoke tests themselves ARE the tests. No additional unit/integration test layer required.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project root**: Tests and config at repository root
- **Test location**: `tests/e2e/` at repository root
- **Config location**: `playwright.config.ts` at repository root (Playwright default)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Playwright infrastructure setup

- [x] T001 Install Playwright dependencies: npm install -D @playwright/test playwright
- [x] T002 Create tests/e2e/ directory at repository root
- [x] T003 Create tests/e2e/utils/ directory for shared helpers
- [x] T004 Create playwright.config.ts at repository root with retries: 0, trace: 'retain-on-failure', screenshot: 'only-on-failure', ignoreHTTPSErrors based on APP_ENV === 'local'
- [x] T005 [P] Add npm scripts in package.json: "test:e2e" and "test:e2e:local"
- [x] T006 [P] Create tests/e2e/.env.dist with APP_ENV, SITE_BASE_URL, GRAFANA_BASE_URL

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core navigation helper that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Implement assertPageOk() navigation helper in tests/e2e/utils/navigation.ts with retry logic for 5xx/timeout errors (max 1 retry), redirect-to-200 support, and SPA navigation handling

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Verify Deployment Health (Priority: P1) 🎯 MVP

**Goal**: Ensure main site and Grafana are accessible after deployment

**Independent Test**: Trigger a deployment and verify smoke tests run automatically, reporting success/failure status

### Implementation for User Story 1

- [x] T008 [P] [US1] Create tests/e2e/homepage.spec.ts with test case: homepage loads successfully using assertPageOk()
- [x] T009 [P] [US1] Create tests/e2e/grafana.spec.ts with test case: Grafana base URL returns HTTP 200 or redirect using assertPageOk()
- [x] T010 [US1] Add GitHub Actions smoke-tests job in .github/workflows/cd.yml with needs: [determine-mode, deploy], URL construction step, test execution step, and artifact upload (playwright-report/ and test-results/)
- [x] T011 [US1] Test deployment workflow end-to-end for production URLs (www.aphiria.com, grafana.aphiria.com)
- [x] T012 [US1] Test deployment workflow end-to-end for preview URLs ({pr}.pr.aphiria.com, {pr}.pr-grafana.aphiria.com)

**Checkpoint**: At this point, User Story 1 should be fully functional - basic deployment health verification works for both production and preview environments

---

## Phase 4: User Story 2 - Validate Core Site Functionality (Priority: P2)

**Goal**: Verify essential pages load correctly and critical user-facing features are operational

**Independent Test**: Run smoke tests against deployed site and verify they check homepage navigation, documentation pages, and search functionality

### Implementation for User Story 2

- [x] T013 [P] [US2] Add test case to tests/e2e/homepage.spec.ts: main navigation structure validates 4 items (logo, Docs, Source, Community) with correct hrefs
- [x] T014 [P] [US2] Create tests/e2e/search.spec.ts with test case: search displays results in ul.search-results with li > a structure
- [x] T015 [P] [US2] Add test case to tests/e2e/search.spec.ts: search keyboard navigation with ArrowDown/ArrowUp applies 'selected' class and supports wrap-around
- [x] T016 [P] [US2] Add test case to tests/e2e/search.spec.ts: pressing Enter on selected result navigates to that page
- [x] T017 [P] [US2] Add test case to tests/e2e/search.spec.ts: typing 'abcdefg123' shows 'no results for "abcdefg123"' in li.no-results
- [x] T018 [P] [US2] Create tests/e2e/docs-sidebar.spec.ts with test case: sidebar structure validates nav.side-nav sections each have h5 with text and ul.doc-sidebar-nav
- [x] T019 [US2] Add test case to tests/e2e/docs-sidebar.spec.ts: sidebar link traversal collects all hrefs first, filters to same-origin only, and validates each with assertPageOk()
- [x] T020 [US2] Run all User Story 2 tests locally and verify they pass

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - deployment health verification plus core site functionality validation

---

## Phase 5: User Story 3 - Validate Monitoring Dashboard Access (Priority: P3)

**Goal**: Confirm Grafana monitoring dashboard is accessible (already implemented in US1, this phase validates scope)

**Independent Test**: Run smoke tests against Grafana URL and verify HTTP 200 check (no auth validation)

### Implementation for User Story 3

- [x] T021 [US3] Verify tests/e2e/grafana.spec.ts only checks HTTP 200 for GRAFANA_BASE_URL (no authentication or dashboard content validation)
- [x] T022 [US3] Test Grafana smoke test independently to confirm it does not require authentication

**Checkpoint**: All production deployment validation stories are complete (P1-P3)

---

## Phase 6: User Story 4 - Support Local Development Testing (Priority: P4)

**Goal**: Enable developers to run smoke tests locally against minikube with self-signed certificates

**Independent Test**: Run smoke tests locally against minikube (https://www.aphiria.com and https://grafana.aphiria.com with self-signed certificates) and verify they pass

### Implementation for User Story 4

- [x] T023 [P] [US4] Verify playwright.config.ts uses ignoreHTTPSErrors: process.env.APP_ENV === 'local'
- [x] T024 [P] [US4] Add dotenv package for .env file support: npm install -D dotenv
- [x] T025 [US4] Update playwright.config.ts to load .env file using dotenv if present
- [x] T026 [US4] Update root README.md with local development instructions (setting APP_ENV=local, using npm run test:e2e:local)
- [x] T027 [US4] Test smoke tests locally against minikube with self-signed certificates and verify ignoreHTTPSErrors works
- [x] T028 [US4] Verify APP_ENV!=local validates certificates properly (no security degradation)

**Checkpoint**: All user stories complete - smoke tests work in CI/CD and local development

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [x] T029 [P] Run TypeScript compiler check: npx tsc --noEmit
- [x] T030 [P] Run ESLint on test files and verify 0 errors/warnings (ESLint not configured for e2e tests)
- [x] T031 Verify all functional requirements FR-001 through FR-025 are implemented
- [x] T032 Verify success criteria SC-001 through SC-006 are met
- [x] T033 Run full smoke test suite and verify completion time is under 3 minutes (SC-002)
- [x] T034 Verify workflow fails correctly when tests fail (FR-007)
- [x] T035 Verify test error messages clearly distinguish deployment failures from test infrastructure errors (FR-015)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
    - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
    - User Story 2 (P2): Can start after Foundational - Extends US1 tests but independently testable
    - User Story 3 (P3): Can start after Foundational - Already implemented in US1, just validation
    - User Story 4 (P4): Can start after Foundational - Adds local dev support, independently testable
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 tests but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Validates Grafana scope (already in US1)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Independent local dev support

### Within Each User Story

- Setup foundation before tests
- Test files can be created in parallel (marked [P])
- GitHub Actions integration after tests are written
- Validation after implementation

### Parallel Opportunities

- All Setup tasks (T001-T006) can run in parallel
- User Story 1 test files (T008, T009) can be created in parallel
- User Story 2 test files (T013-T019) can be created in parallel
- User Story 4 tasks (T023-T024, T026) can be created in parallel
- Polish tasks (T029-T030) can be run in parallel
- Once Foundational phase completes, all user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 2

```bash
# Launch all test file creation for User Story 2 together:
Task T013: "Add test case to tests/e2e/homepage.spec.ts: main navigation structure"
Task T014: "Create tests/e2e/search.spec.ts with test case: search displays results"
Task T015: "Add test case to tests/e2e/search.spec.ts: search keyboard navigation"
Task T016: "Add test case to tests/e2e/search.spec.ts: pressing Enter on selected result"
Task T017: "Add test case to tests/e2e/search.spec.ts: typing 'abcdefg123' shows no results"
Task T018: "Create tests/e2e/docs-sidebar.spec.ts with test case: sidebar structure"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T008-T012)
4. **STOP and VALIDATE**: Test User Story 1 independently (basic deployment health verification)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! - basic health checks)
3. Add User Story 2 → Test independently → Deploy/Demo (core site functionality)
4. Add User Story 3 → Validate Grafana scope → Deploy/Demo (monitoring dashboard validation)
5. Add User Story 4 → Test locally → Deploy/Demo (local dev support)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
    - Developer A: User Story 1 (basic health checks)
    - Developer B: User Story 2 (core site functionality)
    - Developer C: User Story 4 (local dev support)
    - User Story 3 is just validation of US1's Grafana test - can be done by anyone
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Critical**: assertPageOk() helper is foundational - must be complete before any test implementation
- **Critical**: Global retries MUST be 0 in playwright.config.ts to prevent double-counting with assertPageOk() retries
- **Critical**: GitHub Actions MUST construct URLs and export as env vars (single source of truth)
- **Critical**: Tests MUST collect hrefs before iteration to avoid stale element errors in sidebar traversal
- **Critical**: Upload BOTH playwright-report/ AND test-results/ directories as artifacts
