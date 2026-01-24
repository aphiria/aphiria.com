# Feature Specification: SSR Migration

**Feature Branch**: `003-ssr-migration`
**Created**: 2026-01-22
**Status**: Draft
**Input**: User description: "i want to convert my react site to use ssr. this will simplify things like context selection and other logic that we we forcing into ssg. we will need to update our pulumi code (eg remove the nginx config) and use env vars instead for things like apiUri and cookieDomain to pass in from pulumi so that the website can run in minikube, our preview infra, and prod. we should try to reuse our docker workflow (build -> runtime) as much as possible, although i understand it'll require changing the web runtime image to support nodejs. we must ensure we've updated unit tests for the web code and any pulumi changes."

## User Scenarios & Testing

### User Story 1 - Page Load Without Visual Flicker (Priority: P1)

When a user visits any documentation page, the context selector (framework/library toggle) displays the correct value immediately on page load without flickering or changing after the page renders.

**Why this priority**: This is the most visible user-facing issue with the current SSG approach. Visual flicker creates a poor user experience and makes the site feel buggy. SSR eliminates this by rendering the correct state on the server before sending HTML to the client.

**Independent Test**: Can be fully tested by visiting any docs page with a context cookie set and verifying no visual changes occur after initial render. Delivers immediate user experience improvement.

**Acceptance Scenarios**:

1. **Given** a user has previously selected "library" context, **When** they navigate to a documentation page, **Then** the page loads showing library-specific content immediately without flickering to framework content first
2. **Given** a user shares a URL with `?context=framework` query parameter, **When** another user opens that link, **Then** the page displays framework content from initial render
3. **Given** a user has no context preference saved, **When** they visit the site for the first time, **Then** the page displays the default context (framework) immediately without delay

---

### User Story 2 - Context Persistence Across Sessions (Priority: P2)

When a user selects a context preference (framework or library), that preference persists across browser sessions and is immediately available on subsequent visits.

**Why this priority**: User preference persistence is essential for a good documentation experience, but less critical than eliminating flicker. SSR enables server-side cookie reading to apply preferences before rendering.

**Independent Test**: Can be tested by selecting a context, closing the browser, reopening, and verifying the selection persists. Delivers value independently of other stories.

**Acceptance Scenarios**:

1. **Given** a user selects "library" context, **When** they close and reopen their browser, **Then** the site remembers their library preference
2. **Given** a user has selected framework context, **When** they navigate between different documentation pages, **Then** all pages show framework-specific content
3. **Given** a user switches from framework to library, **When** they refresh the page, **Then** the library context remains selected

---

### User Story 3 - Environment-Specific Configuration (Priority: P3)

The website correctly adapts its behavior (API endpoints, cookie domains) based on the deployment environment (local development, preview, production) without requiring code changes or rebuilds.

**Why this priority**: This enables the same build artifact to work across all environments, simplifying deployment and reducing bugs. Lower priority because it's an operational improvement rather than user-facing.

**Independent Test**: Can be tested by deploying the same container image to different environments and verifying correct API connectivity. Delivers operational value independently.

**Acceptance Scenarios**:

1. **Given** the site is deployed to the preview environment, **When** a user performs a search, **Then** the search queries the preview API endpoint
2. **Given** the site is running locally in minikube, **When** a developer accesses the site, **Then** cookies are set with the local domain
3. **Given** the site is deployed to production, **When** a user interacts with the site, **Then** all requests use production API endpoints and production cookie domains

---

### User Story 4 - Simplified Client-Side Logic (Priority: P4)

The website's client-side code is simpler and more maintainable because server-side rendering handles initial state resolution, reducing the need for complex client-side logic to detect and correct state mismatches.

**Why this priority**: This is a code quality improvement that benefits developers but has minimal direct user impact. Lower priority but delivers long-term maintainability value.

**Independent Test**: Can be tested by code review of client components and verification that state resolution logic is simplified. Delivers developer experience value.

**Acceptance Scenarios**:

1. **Given** a new developer reviews the ContextSelector component, **When** they examine the code, **Then** they find straightforward logic without complex useEffect chains for state synchronization
2. **Given** the site uses SSR, **When** comparing code complexity before and after migration, **Then** client-side state management code is reduced by at least 30%
3. **Given** the site runs with SSR, **When** monitoring client-side errors, **Then** hydration mismatch errors are eliminated

---

### Edge Cases

- What happens when a user has an invalid context cookie value (not "framework" or "library")?
- How does the system handle environment variable misconfiguration (missing API_URI)?
- What happens when the Node.js server crashes or restarts during a deployment?
- How does the system behave when a user has JavaScript disabled?
- What happens when preview environment URLs change or preview stacks are destroyed?

## Requirements

### Functional Requirements

- **FR-001**: System MUST render pages server-side with the user's context preference applied before sending HTML to the client
- **FR-002**: System MUST read context preference from cookies on the server during page rendering
- **FR-003**: System MUST accept runtime configuration (API URI, cookie domain) via environment variables
- **FR-004**: System MUST support deployment to local (minikube), preview, and production environments using the same container image
- **FR-005**: System MUST maintain the existing Docker multi-stage build pattern (build stage + runtime stage)
- **FR-006**: System MUST run on a Node.js runtime instead of nginx for serving the website
- **FR-007**: Infrastructure configuration MUST remove nginx-specific configuration
- **FR-008**: System MUST provide unit test coverage for all modified web application code
- **FR-009**: System MUST provide unit test coverage for all modified infrastructure code
- **FR-010**: System MUST handle query parameter context overrides (`?context=library`) by rendering with that context server-side
- **FR-011**: System MUST set appropriate defaults when environment variables are not provided (localhost for development)
- **FR-012**: System MUST maintain backward compatibility with existing URLs and routes
- **FR-013**: Client-side hydration MUST match server-rendered HTML to avoid React hydration errors
- **FR-014**: System MUST continue to support both framework and library contexts as distinct modes

### Key Entities

- **Context Preference**: Represents a user's choice between "framework" and "library" views, stored in cookies and URL parameters
- **Runtime Configuration**: Environment-specific settings (API URI, cookie domain) provided via environment variables
- **Environment**: Deployment target (local/minikube, preview, production) that determines runtime configuration values

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users see the correct context on page load with zero visual flicker or content changes after initial render
- **SC-002**: Context preferences persist across browser sessions with 100% reliability
- **SC-003**: The same container image can be deployed to all three environments (local, preview, production) without modification
- **SC-004**: Page load time (Time to First Contentful Paint) remains within 10% of current SSG performance
- **SC-005**: All existing end-to-end tests continue to pass without modification
- **SC-006**: Unit test coverage for web application code remains at or above current levels (100% for components)
- **SC-007**: Unit test coverage for infrastructure code remains at or above current thresholds (97% branches, 100% functions/lines/statements)
- **SC-008**: Zero hydration mismatch errors reported in browser console during normal usage
- **SC-009**: Container memory usage remains under 1GB per pod during normal traffic
- **SC-010**: Site remains functional with JavaScript disabled (shows default context content)

## Assumptions

- Next.js standalone output mode will be used for SSR deployment
- Current Docker multi-stage build pattern can be adapted to Node.js runtime
- Environment variables can be injected by Pulumi/Kubernetes without requiring application code changes
- Existing E2E tests are sufficient to validate SSR behavior (may need minor adjustments but no major rewrites)
- Development workflow using `npm run dev` already uses SSR and will continue to work
- Node.js 20 alpine base image provides adequate performance and security
- Port 3000 is acceptable for the Node.js server (standard Next.js default)
- Resource limits of 1GB memory and 500m CPU are sufficient for expected traffic

## Dependencies

- Next.js framework must support standalone output mode (already supported)
- Pulumi infrastructure code must support environment variable injection
- Kubernetes clusters (minikube, preview, production) must support Node.js containers
- CI/CD pipeline must support building Node.js-based Docker images

## Out of Scope

- Implementing new features beyond SSR migration
- Changing the API backend architecture
- Modifying documentation content or structure
- Performance optimizations beyond maintaining current performance levels
- Adding new monitoring or observability tooling (use existing tools)
- Migrating to a different framework or technology stack
- Implementing incremental static regeneration (ISR) or other advanced Next.js features
- Changing the context selection mechanism (framework/library toggle remains the same)
