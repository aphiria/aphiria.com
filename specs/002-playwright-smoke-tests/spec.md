# Feature Specification: Post-Deployment Smoke Tests

**Feature Branch**: `001-playwright-smoke-tests`
**Created**: 2026-01-02
**Status**: Draft
**Input**: User description: "Add Playwright (TypeScript) smoke tests that run after deployment in the GitHub Actions CD workflow. The deploy job provides two environment-specific URLs: SITE_BASE_URL (eg https://www.aphiria.com or https://123.pr.aphiria.com) GRAFANA_BASE_URL (eg https://grafana.aphiria.com or https://123.pr-grafana.aphiria.com) The smoke test job must fail if any test fails."

## Clarifications

### Session 2026-01-02

- Q: When a smoke test fails due to a network timeout or 5xx error, should the test framework retry? → A: Retry once with 10-second delay for network/5xx errors only
- Q: If the main site (www.aphiria.com) tests pass but Grafana tests fail, what should happen? → A: Workflow fails - both sites must pass
- Q: If a deployment rollback occurs while smoke tests are running, what should happen? → A: Tests continue running - report deployment as "unstable"
- Q: How should the deployment job pass SITE_BASE_URL and GRAFANA_BASE_URL to the smoke test job? → A: Construct URLs from mode and PR number: if preview mode, use https://{pr-number}.pr.aphiria.com and https://{pr-number}.pr-grafana.aphiria.com; otherwise use https://www.aphiria.com and https://grafana.aphiria.com
- Q: When the smoke tests themselves have errors (e.g., test code bugs, invalid selectors), what should happen? → A: Tests fail gracefully with clear error message indicating test infrastructure issue
- Q: Should tests support local minikube development with self-signed TLS certificates? → A: Yes - tests must accept self-signed certificates for local development (minikube uses https://www.aphiria.com and https://grafana.aphiria.com with self-signed certs)
- **Detailed requirements provided**: User specified exact test coverage including DOM selectors, navigation structure, search behavior (keyboard navigation, wrap-around, no-results handling), sidebar traversal, and Grafana scope (HTTP 200 only, no auth). See FR-017 through FR-025 for complete implementation details.

## User Scenarios & Testing

### User Story 1 - Verify Deployment Health (Priority: P1)

When a deployment completes, the development team needs immediate confirmation that the deployed application is accessible and functioning at a basic level across both the main site and monitoring dashboard.

**Why this priority**: This is the foundational requirement - detecting a broken deployment immediately prevents users from encountering errors and allows the team to roll back or fix issues before they impact users.

**Independent Test**: Can be fully tested by triggering a deployment and verifying that the smoke tests run automatically and report success/failure status.

**Acceptance Scenarios**:

1. **Given** a deployment has completed successfully to production, **When** the deployment workflow finishes, **Then** smoke tests run automatically against https://www.aphiria.com and https://grafana.aphiria.com
2. **Given** a deployment has completed successfully to a preview environment, **When** the deployment workflow finishes, **Then** smoke tests run automatically against the preview-specific URLs (e.g., https://123.pr.aphiria.com and https://123.pr-grafana.aphiria.com)
3. **Given** the smoke tests are running, **When** any test fails, **Then** the deployment workflow fails with a clear error message
4. **Given** the smoke tests are running, **When** all tests pass, **Then** the deployment workflow completes successfully

---

### User Story 2 - Validate Core Site Functionality (Priority: P2)

After deployment, the team needs to verify that essential pages load correctly and critical user-facing features are operational on the main site.

**Why this priority**: Once we know the site is accessible (P1), we need to verify that users can actually use the core features - this catches regressions in critical paths.

**Independent Test**: Can be tested by running smoke tests against a deployed site and verifying they check homepage accessibility, documentation pages, and search functionality.

**Acceptance Scenarios**:

1. **Given** the main site is deployed, **When** smoke tests run, **Then** they verify the homepage loads successfully within 5 seconds and validates main navigation structure (4 items: logo, Docs, Source, Community)
2. **Given** the main site is deployed, **When** smoke tests run, **Then** they verify at least one documentation page loads successfully and validates sidebar navigation structure
3. **Given** the main site is deployed, **When** smoke tests run, **Then** they verify search functionality accepts typing, displays results, supports keyboard navigation (arrow keys with wrap-around), handles Enter key navigation, and shows "no results" message for invalid queries
4. **Given** any core page fails to load, **When** smoke tests run, **Then** the workflow fails and reports which page failed

---

### User Story 3 - Validate Monitoring Dashboard Access (Priority: P3)

After deployment, the team needs to confirm that the Grafana monitoring dashboard is accessible and displays data, ensuring visibility into application health metrics.

**Why this priority**: While important for operations, monitoring dashboard issues don't directly impact end users - the main site health (P1-P2) is more critical for user experience.

**Independent Test**: Can be tested by running smoke tests against the Grafana URL and verifying login page loads and basic dashboard accessibility.

**Acceptance Scenarios**:

1. **Given** Grafana is deployed, **When** smoke tests run, **Then** they verify the Grafana base URL returns HTTP 200 (no authentication or dashboard validation required)
2. **Given** Grafana fails to load or returns non-200 status, **When** smoke tests run, **Then** the workflow fails and reports the Grafana accessibility issue

---

### User Story 4 - Support Local Development Testing (Priority: P4)

Developers need to run the same smoke tests locally against their minikube environment to verify changes before pushing to CI/CD, even though local environments use self-signed TLS certificates.

**Why this priority**: Enables faster development iteration and catches issues earlier, but doesn't block production deployments.

**Independent Test**: Can be tested by running smoke tests locally against minikube (https://www.aphiria.com and https://grafana.aphiria.com with self-signed certificates) and verifying they pass without certificate errors.

**Acceptance Scenarios**:

1. **Given** minikube is running locally with self-signed certificates, **When** smoke tests run locally, **Then** they accept the self-signed certificates and do not fail due to certificate validation errors
2. **Given** smoke tests are configured to accept self-signed certificates, **When** run against production/preview with valid certificates, **Then** they still validate certificates properly (no security degradation)
3. **Given** a developer runs tests locally, **When** tests complete, **Then** results are identical to CI/CD runs (same test coverage and assertions)

---

### Edge Cases

- If main site passes but Grafana fails (or vice versa), the entire workflow fails - both sites must pass
- What happens when a site loads but takes longer than expected (timeout scenarios)?
- If deployment rollback occurs during test execution, tests continue running and report deployment status as "unstable"
- Test infrastructure errors (invalid selectors, test code bugs) cause graceful failure with clear error messages distinguishing test issues from deployment issues
- Network timeouts and HTTP 5xx errors trigger a single retry with 10-second delay before failing

## Requirements

### Functional Requirements

- **FR-001**: Smoke tests MUST run automatically after every successful deployment completes
- **FR-002**: Smoke tests MUST construct base URLs from deployment mode (production/preview) and PR number: preview mode uses https://{pr-number}.pr.aphiria.com and https://{pr-number}.pr-grafana.aphiria.com; production uses https://www.aphiria.com and https://grafana.aphiria.com
- **FR-003**: Smoke tests MUST verify that the main site homepage loads successfully (HTTP 200 status) and validates navigation structure (see FR-018)
- **FR-004**: Smoke tests MUST verify that documentation pages load successfully and validate sidebar navigation structure (see FR-023)
- **FR-005**: Smoke tests MUST verify that the Grafana base URL loads successfully (HTTP 200 status - see FR-024 for scope)
- **FR-006**: Smoke tests MUST complete within 5 minutes to provide fast feedback
- **FR-007**: The deployment workflow MUST fail if any smoke test fails (both main site and Grafana tests must pass)
- **FR-008**: The deployment workflow MUST report which specific tests failed when smoke tests fail, with clear distinction between deployment failures and test infrastructure errors
- **FR-009**: Smoke tests MUST run in the same GitHub Actions workflow as the deployment job
- **FR-010**: Smoke tests MUST wait for the deployment job to complete successfully before running
- **FR-011**: Smoke tests MUST support both production URLs (e.g., www.aphiria.com) and preview environment URLs (e.g., 123.pr.aphiria.com)
- **FR-012**: Smoke tests MUST receive deployment mode and PR number from the workflow to construct environment-specific URLs dynamically
- **FR-013**: Smoke tests MUST retry failed requests once with a 10-second delay for network timeouts and HTTP 5xx errors only
- **FR-014**: If deployment rollback occurs during test execution, tests MUST continue running and mark the deployment status as "unstable" in the test report
- **FR-015**: Test infrastructure errors (invalid selectors, missing elements, test code bugs) MUST produce clear error messages that distinguish test suite issues from deployment issues
- **FR-016**: Smoke tests MUST accept self-signed TLS certificates to support local minikube development environments
- **FR-017**: Playwright test files MUST be located under `tests/e2e/` at the repository root
- **FR-018**: Smoke tests MUST validate main navigation in `nav.main-nav` contains exactly 4 `<li>` items in order: logo, Docs (links to `/docs/1.x/introduction.html`), Source (links to `https://github.com/aphiria/aphiria`), Community (links to `https://github.com/aphiria/aphiria/discussions`) with matching link text
- **FR-019**: Smoke tests MUST validate search input `#search-query` accepts typing and displays results in sibling `ul.search-results` containing `<li>` children with `<a>` links
- **FR-020**: Smoke tests MUST validate arrow key navigation in search results applies CSS class `selected` to exactly one result `<li>` at a time with wrap-around behavior (down arrow on last item selects first; up arrow on first item selects last)
- **FR-021**: Smoke tests MUST validate that pressing Enter with a selected search result navigates to that result's page and the destination returns HTTP 200 (or redirect to 200)
- **FR-022**: Smoke tests MUST validate that typing `abcdefg123` in search renders exactly one `<li class="no-results">` with text `no results for "abcdefg123"`
- **FR-023**: Smoke tests MUST validate docs sidebar structure on `/docs/1.x/introduction.html`: `nav.side-nav` contains multiple `<section>` elements, each with an `<h5>` containing non-empty text and a sibling `ul.doc-sidebar-nav` with multiple `<li><a>` links; tests MUST visit each link and assert HTTP 200 (or redirect to 200)
- **FR-024**: Grafana validation MUST only verify HTTP 200 response for `${GRAFANA_BASE_URL}/` (no authentication or dashboard content checks)
- **FR-025**: Smoke tests MUST accept self-signed certificates when running locally via Playwright's `ignoreHTTPSErrors: true` configuration option (enabled by LOCAL_DEV environment variable or always enabled if acceptable)

### Key Entities

- **Deployment Workflow**: The GitHub Actions CD pipeline that deploys the application and triggers smoke tests
- **Smoke Test Suite**: Collection of automated tests that verify basic functionality post-deployment
- **Test Report**: Output from smoke tests indicating pass/fail status and details of any failures
- **Deployment Mode**: Workflow output indicating environment type (production or preview)
- **PR Number**: For preview deployments, the pull request number used to construct preview-specific URLs
- **Base URLs**: Environment-specific URLs constructed from mode and PR number (SITE_BASE_URL and GRAFANA_BASE_URL)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Smoke tests run automatically within 30 seconds of deployment completion
- **SC-002**: Smoke tests complete in under 3 minutes for all environments
- **SC-003**: Failed deployments are detected within 5 minutes of deployment completion
- **SC-004**: 100% of deployments trigger smoke tests (no missed runs)
- **SC-005**: Team can identify failed deployment within 5 minutes by checking workflow status
- **SC-006**: Zero false positives from smoke tests over a 30-day period (tests fail only when actual issues exist)

## Assumptions

- The deployment workflow provides deployment mode (production/preview) and PR number (for preview) as job outputs
- The deployed sites are publicly accessible at the time smoke tests run (no network restrictions)
- GitHub Actions runners have network access to the deployed environments
- Standard web response times (under 5 seconds for page loads) are acceptable
- Smoke tests focus on basic accessibility and don't require deep functional testing (that's covered by other test suites)
- Test failures should immediately halt the deployment workflow (fail-fast approach)
- Preview URLs follow the pattern https://{pr-number}.pr.aphiria.com and https://{pr-number}.pr-grafana.aphiria.com
- Production URLs are https://www.aphiria.com and https://grafana.aphiria.com
- Local minikube development uses the same production URLs (https://www.aphiria.com and https://grafana.aphiria.com) but with self-signed TLS certificates
- Tests must be runnable both in CI/CD (with valid certificates) and locally (with self-signed certificates)

## Out of Scope

- Deep functional testing of application features (covered by existing test suites)
- Performance testing or load testing
- Security scanning or vulnerability testing
- Testing of internal APIs or backend services (only user-facing pages)
- Automated rollback on test failure (workflow fails but rollback is manual)
- Testing across multiple browsers (assumes single browser for smoke tests)
- Authentication testing beyond verifying login pages load
