# Implementation Plan: Post-Deployment Smoke Tests

**Feature Branch**: `002-playwright-smoke-tests`
**Specification**: [spec.md](./spec.md)
**Created**: 2026-01-02
**Status**: Planning
**Version**: 2.0 (Corrected)

---

## Technical Context

### Technology Stack

- **Test Framework**: Playwright (TypeScript)
- **Runtime**: Node.js (version specified in package.json)
- **CI/CD**: GitHub Actions
- **Execution Environment**: GitHub Actions runners + local development
- **Test Location**: `tests/e2e/` at repository root
- **Configuration**: `playwright.config.ts` at repository root (Playwright default location)

### Architecture

```
GitHub Actions Workflow (cd.yml)
├── determine-mode job (existing)
│   ├── outputs.mode (production|preview)
│   └── outputs.pr-number (for preview)
├── deploy job (existing)
│   └── waits for deployment success
└── smoke-tests job (NEW)
    ├── needs: [determine-mode, deploy]
    ├── constructs SITE_BASE_URL/GRAFANA_BASE_URL env vars
    ├── runs Playwright tests
    └── fails workflow if any test fails
```

### Integration Points

1. **GitHub Actions Workflow** (`cd.yml`)
    - Add `smoke-tests` job after `deploy` job
    - Read `mode` and `pr-number` outputs from `determine-mode` job
    - Construct SITE_BASE_URL and GRAFANA_BASE_URL from inputs
    - Export as environment variables (single source of truth)

2. **Playwright Test Suite** (`tests/e2e/`)
    - Read SITE_BASE_URL and GRAFANA_BASE_URL from environment variables ONLY
    - Configure ignoreHTTPSErrors via LOCAL_DEV env var
    - Implement `assertPageOk()` helper with retry logic for 5xx/timeout errors
    - Playwright global retries: 0 (retries only in navigation helper)
    - Generate test reports with clear error messages
    - Handle HTTP redirects (redirect-to-200 considered success)
    - Collect artifact traces on failure only

3. **Local Development**
    - Support running tests against local minikube
    - Accept self-signed certificates via ignoreHTTPSErrors
    - Use same URLs as production (www.aphiria.com, grafana.aphiria.com)

### Dependencies

- `@playwright/test` (TypeScript test framework)
- `playwright` (browser automation)
- GitHub Actions environment (ubuntu-latest runner)
- Deployed application endpoints (from deploy job)

### Unknowns/Research Needed

- RESOLVED: Retry mechanism - Playwright global retries: 0, custom `assertPageOk()` helper retries 5xx/timeout with 10s delay
- RESOLVED: URL passing - GitHub Actions constructs SITE_BASE_URL/GRAFANA_BASE_URL env vars; tests read these directly (single source of truth)
- RESOLVED: Self-signed certs - ignoreHTTPSErrors: process.env.LOCAL_DEV === 'true'
- RESOLVED: Test scope - Detailed in FR-018 through FR-024
- RESOLVED: Redirect handling - Redirect-to-200 (3xx to 2xx) considered success for all navigation
- RESOLVED: Config location - playwright.config.ts at repo root (Playwright default location)
- RESOLVED: Sidebar traversal - Collect hrefs first to avoid stale element references; skip external links
- RESOLVED: Artifacts - Upload both playwright-report/ and test-results/ with trace: 'retain-on-failure'

---

## Constitution Check

### Core Principle I: PHP Framework Standards

**Status**: NOT APPLICABLE
**Justification**: This feature uses TypeScript/Playwright, not PHP. No PHP code changes required.

### Core Principle II: Documentation-First Development

**Status**: COMPLIANT
**How**: Tests validate documentation site functionality (navigation, search, sidebar links). No documentation content changes required for this feature.

### Core Principle III: Test Coverage (NON-NEGOTIABLE)

**Status**: COMPLIANT
**How**:

- Smoke tests themselves validate deployment health
- Unit tests not applicable (Playwright tests are end-to-end)
- Tests cover all functional requirements (FR-001 through FR-025)

### Core Principle IV: Static Analysis & Code Quality

**Status**: COMPLIANT
**How**:

- TypeScript compilation via `tsc --noEmit` before running tests
- ESLint configuration for Playwright tests
- No SQL queries (read-only HTTP tests)

### Core Principle V: Production Reliability

**Status**: COMPLIANT
**How**:

- No database migrations (tests only, no schema changes)
- No configuration changes to deployed app
- Tests validate production reliability but don't modify it
- Graceful failure with clear error messages (FR-015)

### Core Principle VI: CI/CD & Infrastructure Reuse

**Status**: COMPLIANT
**How**:

- Single smoke-tests job parameterized by mode (production/preview)
- No workflow duplication - URL construction based on inputs
- Reusable across all environments

### Gate Violations

**None** - Feature is compliant with all applicable constitution principles.

---

## Phase 0: Research & Technology Decisions

### Research Tasks

1. **Playwright Best Practices for CI/CD**
    - Retry strategies for flaky tests
    - Headless browser configuration
    - Test parallelization
    - Artifact generation (screenshots, traces)

2. **GitHub Actions Integration Patterns**
    - Job dependencies and outputs
    - Environment variable passing
    - Artifact upload for test results

3. **Error Handling Patterns**
    - Distinguishing test failures from deployment failures
    - Retry logic for transient errors
    - Clear error reporting

### Technology Decisions

#### Decision 1: Playwright vs Cypress

**Chosen**: Playwright
**Rationale**:

- Better TypeScript support
- Built-in retry mechanisms
- Faster execution in CI/CD
- Native support for multiple browsers
- Modern API aligned with async/await patterns

**Alternatives Considered**: Cypress (more mature ecosystem but slower in CI)

#### Decision 2: Test Organization

**Chosen**: Single test suite with multiple test files
**Structure**:

```
playwright.config.ts (repo root)
tests/e2e/
├── utils/
│   └── navigation.ts (assertPageOk helper)
├── homepage.spec.ts (FR-018: navigation)
├── search.spec.ts (FR-019-022: search functionality)
├── docs-sidebar.spec.ts (FR-023: sidebar traversal)
└── grafana.spec.ts (FR-024: Grafana health check)
```

**Rationale**: Separation by feature area allows parallel execution and clear failure attribution. Config at repo root follows Playwright defaults.

#### Decision 3: Retry Strategy

**Chosen**: Playwright global retries: 0 + custom `assertPageOk()` helper for 5xx/timeout
**Implementation**:

- Global retry: 0 (Playwright config - no test-level retries)
- Custom navigation helper retries ONLY 5xx/timeout with 10s delay
- Max 1 retry per navigation (total 2 attempts)
- No retries for assertion failures (genuine bugs)

**Rationale**: Prevents double-counting retries and ensures only network errors are retried, not test logic failures. Matches clarification requirement.

#### Decision 4: Self-Signed Certificate Handling

**Chosen**: `ignoreHTTPSErrors: true` when `LOCAL_DEV=true`
**Implementation**:

```typescript
use: {
  ignoreHTTPSErrors: process.env.LOCAL_DEV === 'true',
}
```

**Rationale**: Simple flag-based approach, safe for local dev, secure for production.

#### Decision 5: Redirect Handling

**Chosen**: Redirect-to-200 (3xx -> 2xx) considered success
**Rationale**: Matches web best practices; allows URL canonicalization and HTTPS enforcement without false negatives.

---

## Phase 1: Design & Contracts

### Data Model

**Entities**: Not applicable (smoke tests don't persist data)

**Test Configuration Model**:

```typescript
interface TestConfig {
    siteBaseUrl: string; // From SITE_BASE_URL env var
    grafanaBaseUrl: string; // From GRAFANA_BASE_URL env var
    localDev: boolean; // From LOCAL_DEV env var
}
```

**Test Result Model** (implicit in Playwright):

```typescript
interface TestResult {
    status: "passed" | "failed" | "skipped";
    error?: string;
    duration: number;
    retries: number;
}
```

### API Contracts

**Not applicable** - This feature only consumes existing HTTP endpoints, does not define new APIs.

**Consumed Endpoints** (read-only):

- `GET ${SITE_BASE_URL}/` (homepage)
- `GET ${SITE_BASE_URL}/docs/1.x/introduction.html` (docs page)
- `GET ${SITE_BASE_URL}/docs/1.x/*` (sidebar links, same-origin only)
- `GET ${GRAFANA_BASE_URL}/` (Grafana health)

**Success Criteria**: HTTP 2xx or 3xx->2xx (redirects allowed)

### Workflow Contract

**GitHub Actions Job Interface**:

**Inputs** (from `determine-mode` job):

```yaml
needs:
    - determine-mode
    - deploy
```

**URL Construction** (in GitHub Actions, NOT in tests):

```bash
MODE="${{ needs.determine-mode.outputs.mode }}"
PR="${{ needs.determine-mode.outputs.pr-number }}"

if [ "$MODE" = "preview" ]; then
  echo "SITE_BASE_URL=https://${PR}.pr.aphiria.com" >> $GITHUB_ENV
  echo "GRAFANA_BASE_URL=https://${PR}.pr-grafana.aphiria.com" >> $GITHUB_ENV
else
  echo "SITE_BASE_URL=https://www.aphiria.com" >> $GITHUB_ENV
  echo "GRAFANA_BASE_URL=https://grafana.aphiria.com" >> $GITHUB_ENV
fi
```

**Test Suite Contract** (reads env vars ONLY):

```typescript
const siteBaseUrl = process.env.SITE_BASE_URL!;
const grafanaBaseUrl = process.env.GRAFANA_BASE_URL!;
// NO URL construction in tests
```

**Outputs**:

- Exit code 0 (all tests pass) or 1 (any test fails)
- Test report artifact (HTML + JSON)
- Screenshots/traces for failed tests only

---

## Phase 2: Implementation Tasks

### Task Breakdown

#### Task 1: Setup Playwright Infrastructure

**Estimated Effort**: 1 hour
**Dependencies**: None

**Subtasks**:

1. Install Playwright dependencies (`npm install -D @playwright/test playwright`)
2. Create `tests/e2e/` directory at repo root
3. Create `playwright.config.ts` at repo root with:
    - `ignoreHTTPSErrors` based on LOCAL_DEV
    - **Global retries: 0** (critical: no test-level retries)
    - Timeout: 30s per test
    - Reporters: HTML + JSON
    - **trace: 'retain-on-failure'** (only keep traces when tests fail)
    - **screenshot: 'only-on-failure'**
    - Base URL configuration from SITE_BASE_URL env var
4. Create `tests/e2e/utils/` directory
5. Add npm scripts: `test:e2e`, `test:e2e:local`

**Acceptance Criteria**:

- [ ] Playwright installed and configured
- [ ] Config at repo root (not in tests/e2e/)
- [ ] retries: 0 in config
- [ ] trace/screenshot config for failure-only artifacts
- [ ] npm scripts execute successfully

---

#### Task 2: Implement Navigation Helper (FR-013)

**Estimated Effort**: 1 hour
**Dependencies**: Task 1

**File**: `tests/e2e/utils/navigation.ts`

**Implementation**:

```typescript
import { Page } from "@playwright/test";

/**
 * Navigate to URL and assert successful response (HTTP 2xx or 3xx->2xx).
 * Retries once on 5xx errors or timeouts with 10s delay.
 */
export async function assertPageOk(page: Page, url: string, maxRetries = 1): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await page.goto(url, { waitUntil: "domcontentloaded" });

            if (response) {
                const status = response.status();

                // Success: 2xx or 3xx (redirect)
                if (status >= 200 && status < 400) {
                    return;
                }

                // Retry 5xx errors
                if (status >= 500 && attempt < maxRetries) {
                    console.log(`HTTP ${status} for ${url}, retrying in 10s...`);
                    await new Promise((resolve) => setTimeout(resolve, 10000));
                    continue;
                }

                throw new Error(`HTTP ${status} for ${url}`);
            }

            // No response (SPA navigation) - verify via request API
            const checkResp = await page.request.get(page.url());
            const checkStatus = checkResp.status();

            if (checkStatus < 400) {
                return;
            }

            throw new Error(`HTTP ${checkStatus} for ${page.url()} (SPA navigation)`);
        } catch (error: any) {
            lastError = error;

            // Retry timeouts and 5xx errors
            const isRetryable =
                error.message?.includes("timeout") ||
                error.message?.includes("5") ||
                error.name === "TimeoutError";

            if (isRetryable && attempt < maxRetries) {
                console.log(`${error.message}, retrying in 10s...`);
                await new Promise((resolve) => setTimeout(resolve, 10000));
                continue;
            }

            throw error;
        }
    }

    throw lastError!;
}
```

**Acceptance Criteria**:

- [ ] Helper implemented
- [ ] Retries only 5xx/timeout (max 1 retry = 2 total attempts)
- [ ] Accepts redirects (3xx->2xx)
- [ ] Handles SPA navigation (null response)

---

#### Task 3: Implement Homepage & Navigation Tests (FR-018)

**Estimated Effort**: 1 hour
**Dependencies**: Tasks 1, 2

**Test File**: `tests/e2e/homepage.spec.ts`

**Test Cases**:

1. Homepage loads (HTTP 200 or redirect-to-200)
2. Main nav contains 4 items
3. Logo link present
4. Docs link points to `/docs/1.x/introduction.html`
5. Source link points to `https://github.com/aphiria/aphiria`
6. Community link points to `https://github.com/aphiria/aphiria/discussions`

**Implementation**:

```typescript
import { test, expect } from "@playwright/test";
import { assertPageOk } from "./utils/navigation";

test("homepage loads successfully", async ({ page }) => {
    await assertPageOk(page, process.env.SITE_BASE_URL!);
});

test("main navigation structure", async ({ page }) => {
    await assertPageOk(page, process.env.SITE_BASE_URL!);

    const nav = page.locator("nav.main-nav");
    const items = nav.locator("li");
    await expect(items).toHaveCount(4);

    // Validate links exist and have correct hrefs
    await expect(nav.locator('a[href="/docs/1.x/introduction.html"]')).toBeVisible();
    await expect(nav.locator('a[href="https://github.com/aphiria/aphiria"]')).toBeVisible();
    await expect(
        nav.locator('a[href="https://github.com/aphiria/aphiria/discussions"]')
    ).toBeVisible();
});
```

**Acceptance Criteria**:

- [ ] All 6 test cases pass
- [ ] Uses assertPageOk() helper
- [ ] Test runs in <5 seconds

---

#### Task 4: Implement Search Tests (FR-019-022)

**Estimated Effort**: 2 hours
**Dependencies**: Tasks 1, 2

**Test File**: `tests/e2e/search.spec.ts`

**Test Cases**:

1. Search input accepts typing
2. Search results appear in `ul.search-results`
3. Results contain `<li><a>` links
4. Arrow down navigation applies `selected` class
5. Arrow up navigation applies `selected` class
6. Wrap-around: down on last -> first
7. Wrap-around: up on first -> last
8. Enter key navigates to selected result (HTTP 200 or redirect)
9. Invalid query shows no-results message

**Implementation**:

```typescript
import { test, expect } from "@playwright/test";
import { assertPageOk } from "./utils/navigation";

test("search displays results", async ({ page }) => {
    await assertPageOk(page, process.env.SITE_BASE_URL!);

    await page.fill("#search-query", "rout");
    await page.waitForSelector("ul.search-results li");

    const results = page.locator("ul.search-results li");
    await expect(results).not.toHaveCount(0);

    const firstResult = results.first().locator("a");
    await expect(firstResult).toBeVisible();
});

test("search keyboard navigation", async ({ page }) => {
    await assertPageOk(page, process.env.SITE_BASE_URL!);

    await page.fill("#search-query", "rout");
    await page.waitForSelector("ul.search-results li");

    // Arrow down selects first
    await page.keyboard.press("ArrowDown");
    let selected = page.locator("ul.search-results li.selected");
    await expect(selected).toHaveCount(1);

    // Get total count for wrap-around test
    const results = page.locator("ul.search-results li");
    const count = await results.count();

    // Navigate to last item
    for (let i = 1; i < count; i++) {
        await page.keyboard.press("ArrowDown");
    }

    // Wrap-around: down on last -> first
    await page.keyboard.press("ArrowDown");
    selected = results.first().locator(".selected");
    await expect(selected).toHaveCount(1);

    // Wrap-around: up on first -> last
    await page.keyboard.press("ArrowUp");
    selected = results.last().locator(".selected");
    await expect(selected).toHaveCount(1);
});

test("search enter key navigation", async ({ page }) => {
    await assertPageOk(page, process.env.SITE_BASE_URL!);

    await page.fill("#search-query", "rout");
    await page.waitForSelector("ul.search-results li");

    await page.keyboard.press("ArrowDown"); // Select first result

    // Capture href before navigation
    const selectedLink = page.locator("ul.search-results li.selected a");
    const href = await selectedLink.getAttribute("href");

    await page.keyboard.press("Enter");

    // Wait for navigation and verify HTTP 200/redirect
    await page.waitForLoadState("domcontentloaded");

    // Verify we navigated (URL or content changed)
    const currentUrl = page.url();
    expect(currentUrl).toContain(href || "");

    // No explicit HTTP check needed - assertPageOk not applicable for Enter navigation
    // If page loaded, navigation succeeded
});

test("search no results message", async ({ page }) => {
    await assertPageOk(page, process.env.SITE_BASE_URL!);

    await page.fill("#search-query", "abcdefg123");
    await page.waitForSelector("li.no-results");

    const noResults = page.locator("li.no-results");
    await expect(noResults).toHaveCount(1);
    await expect(noResults).toContainText('no results for "abcdefg123"');
});
```

**Acceptance Criteria**:

- [ ] All 9 test cases pass
- [ ] Keyboard navigation works correctly
- [ ] Wrap-around validated
- [ ] No-results case validated

---

#### Task 5: Implement Docs Sidebar Tests (FR-023)

**Estimated Effort**: 1.5 hours
**Dependencies**: Tasks 1, 2

**Test File**: `tests/e2e/docs-sidebar.spec.ts`

**Test Cases**:

1. Sidebar contains multiple sections
2. Each section has `<h5>` with text
3. Each section has `ul.doc-sidebar-nav`
4. Each same-origin sidebar link returns HTTP 200 or redirect

**Implementation**:

```typescript
import { test, expect } from "@playwright/test";
import { assertPageOk } from "./utils/navigation";

test("sidebar structure", async ({ page }) => {
    await assertPageOk(page, `${process.env.SITE_BASE_URL}/docs/1.x/introduction.html`);

    const sections = page.locator("nav.side-nav section");
    await expect(sections).not.toHaveCount(0);

    const sectionCount = await sections.count();

    for (let i = 0; i < sectionCount; i++) {
        const section = sections.nth(i);

        // Each section has <h5> with text
        const heading = section.locator("h5");
        await expect(heading).toBeVisible();
        const headingText = await heading.textContent();
        expect(headingText?.trim()).not.toBe("");

        // Each section has ul.doc-sidebar-nav
        const nav = section.locator("ul.doc-sidebar-nav");
        await expect(nav).toBeVisible();
    }
});

test("sidebar link traversal", async ({ page }) => {
    await assertPageOk(page, `${process.env.SITE_BASE_URL}/docs/1.x/introduction.html`);

    // Collect all hrefs first (avoid stale elements)
    const sections = page.locator("nav.side-nav section");
    const hrefs: string[] = [];

    const sectionCount = await sections.count();
    for (let i = 0; i < sectionCount; i++) {
        const links = sections.nth(i).locator("ul.doc-sidebar-nav li a");
        const linkCount = await links.count();

        for (let j = 0; j < linkCount; j++) {
            const href = await links.nth(j).getAttribute("href");
            if (href) hrefs.push(href);
        }
    }

    // Dedupe
    const uniqueHrefs = [...new Set(hrefs)];

    // Filter to same-origin only (skip external links like GitHub)
    const baseUrl = new URL(process.env.SITE_BASE_URL!);
    const internalHrefs = uniqueHrefs.filter((href) => {
        try {
            const url = new URL(href, baseUrl);
            return url.origin === baseUrl.origin;
        } catch {
            return false; // Skip malformed URLs
        }
    });

    console.log(`Testing ${internalHrefs.length} same-origin sidebar links`);

    // Test each link
    for (const href of internalHrefs) {
        const fullUrl = new URL(href, baseUrl).toString();
        await assertPageOk(page, fullUrl);
    }
});
```

**Acceptance Criteria**:

- [ ] All sidebar links validated
- [ ] HTTP 200 or redirect assertions pass
- [ ] External links skipped
- [ ] No stale element errors
- [ ] Test completes in <2 minutes

---

#### Task 6: Implement Grafana Health Check (FR-024)

**Estimated Effort**: 0.5 hours
**Dependencies**: Tasks 1, 2

**Test File**: `tests/e2e/grafana.spec.ts`

**Test Cases**:

1. Grafana base URL returns HTTP 200 or redirect

**Implementation**:

```typescript
import { test } from "@playwright/test";
import { assertPageOk } from "./utils/navigation";

test("Grafana accessibility", async ({ page }) => {
    await assertPageOk(page, process.env.GRAFANA_BASE_URL!);
});
```

**Acceptance Criteria**:

- [ ] Test passes for Grafana URL
- [ ] No authentication required
- [ ] Uses assertPageOk() helper

---

#### Task 7: Add GitHub Actions Smoke Test Job

**Estimated Effort**: 1 hour
**Dependencies**: Tasks 1-6

**File**: `.github/workflows/cd.yml`

**Changes**:

```yaml
smoke-tests:
    name: Smoke Tests
    runs-on: ubuntu-latest
    needs: [determine-mode, deploy]
    steps:
        - uses: actions/checkout@v4

        - uses: actions/setup-node@v4
          with:
              node-version: "20"
              cache: "npm"

        - name: Install dependencies
          run: npm ci

        - name: Install Playwright browsers
          run: npx playwright install --with-deps chromium

        - name: Construct URLs
          run: |
              MODE="${{ needs.determine-mode.outputs.mode }}"
              PR="${{ needs.determine-mode.outputs.pr-number }}"

              if [ "$MODE" = "preview" ]; then
                echo "SITE_BASE_URL=https://${PR}.pr.aphiria.com" >> $GITHUB_ENV
                echo "GRAFANA_BASE_URL=https://${PR}.pr-grafana.aphiria.com" >> $GITHUB_ENV
              else
                echo "SITE_BASE_URL=https://www.aphiria.com" >> $GITHUB_ENV
                echo "GRAFANA_BASE_URL=https://grafana.aphiria.com" >> $GITHUB_ENV
              fi

        - name: Run smoke tests
          run: npm run test:e2e

        - name: Upload test artifacts
          if: always()
          uses: actions/upload-artifact@v4
          with:
              name: playwright-artifacts
              path: |
                  playwright-report/
                  test-results/
              retention-days: 7
```

**Acceptance Criteria**:

- [ ] Job runs after deploy completes
- [ ] URLs constructed correctly for both modes
- [ ] Workflow fails if tests fail
- [ ] Both playwright-report/ and test-results/ uploaded

---

#### Task 8: Add Local Development Support

**Estimated Effort**: 0.5 hours
**Dependencies**: Tasks 1-6

**Changes**:

1. Add `.env.example` with:

    ```
    LOCAL_DEV=true
    SITE_BASE_URL=https://www.aphiria.com
    GRAFANA_BASE_URL=https://grafana.aphiria.com
    ```

2. Update `playwright.config.ts` to read from .env (use dotenv package)

3. Add npm script:

    ```json
    {
        "scripts": {
            "test:e2e": "playwright test",
            "test:e2e:local": "LOCAL_DEV=true playwright test"
        }
    }
    ```

4. Document in README

**Acceptance Criteria**:

- [ ] Tests run locally against minikube
- [ ] Self-signed certs accepted when LOCAL_DEV=true
- [ ] Same tests as CI/CD

---

### Summary

**Total Estimated Effort**: 8.5 hours

**Critical Path**:

1. Task 1 (Setup) -> Task 2 (Navigation Helper) -> Tasks 3-6 (Tests) -> Task 7 (GitHub Actions) -> Task 8 (Local Dev)

**Risks Mitigated**:

- Flaky tests -> assertPageOk() helper with controlled retries
- Stale elements -> Collect hrefs first in sidebar traversal
- Double retries -> Global retries: 0
- URL contract violations -> Single source of truth (env vars only)
- Missing artifacts -> Upload both playwright-report/ and test-results/

**Success Criteria**:

- All FR-001 through FR-025 implemented and tested
- Smoke tests run automatically in CI/CD
- Tests pass locally with self-signed certs
- Zero false positives (SC-006)
- Completion time <3 minutes (SC-002)

---

## Post-Implementation Validation

### Constitution Re-Check

**All principles remain compliant** - No changes to compliance status post-implementation.

### Quality Gates

**Pre-Merge Checklist**:

- [ ] All Playwright tests pass locally
- [ ] Tests pass in CI/CD for both preview and production
- [ ] Test coverage includes all FR-001 through FR-025
- [ ] TypeScript compiles without errors
- [ ] ESLint passes with no warnings
- [ ] Both test-results/ and playwright-report/ artifacts uploaded
- [ ] Documentation updated (README with local dev instructions)

**Deployment Validation**:

- [ ] Smoke tests run automatically after deployment
- [ ] Workflow fails if any test fails
- [ ] Test completion time <3 minutes
- [ ] Clear error messages for failures

---

## Next Steps

After this plan is approved:

1. `/speckit.tasks` - Generate detailed task breakdown with dependencies
2. Implementation - Execute tasks in order
3. Testing - Validate against acceptance criteria
4. Review - PR with test results and artifacts
5. Deploy - Merge to enable smoke tests in CI/CD

---

**Plan Version**: 2.0 (Corrected)
**Last Updated**: 2026-01-02
**Corrections Applied**: All 6 from PLAN_CORRECTIONS.md
