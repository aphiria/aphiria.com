# Feature Specification: Next.js Migration for aphiria.com

**Feature Branch**: `001-nextjs-migration`
**Created**: 2026-01-18
**Status**: Draft
**Input**: User description: "Migrate aphiria.com to Next.js with App Router while preserving 100% visual and UX parity"

## Overview

This specification defines the migration of https://www.aphiria.com from a PHP-rendered templating system with gulp-based asset pipeline to a modern Next.js application using the App Router. The migration is a greenfield rewrite of the website frontend while maintaining pixel-perfect visual fidelity and identical user experience. The compiled documentation content remains shared between the website and the API's Postgres full-text search system via a build artifact contract.

**Core Constraint**: This is NOT a redesign. Every pixel, spacing, color, animation, and interaction pattern must match the current site exactly.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Documentation Browsing with Context Selection (Priority: P1)

A developer visits the Aphiria documentation to learn about the framework. They need to toggle between "framework" (full Aphiria framework) and "library" (individual Aphiria libraries) contexts to see relevant documentation sections without losing their place or experiencing a full page reload.

**Why this priority**: This is the primary user journey for the documentation site. The context switching mechanism is fundamental to how users consume Aphiria's dual-audience documentation (framework users vs. library-only users).

**Independent Test**: Can be fully tested by navigating to any documentation page, selecting a context from the dropdown, verifying the URL query parameter updates, confirming the cookie is set, and observing that context-specific content toggles visibility instantly without a page reload. Success delivers immediate context-aware documentation browsing.

**Acceptance Scenarios**:

1. **Given** a user visits `/docs/1.x/installation` without any context parameter, **When** the page loads, **Then** the context selector defaults to "framework", the cookie `aphiria_docs_context` is set to "framework", `.context-framework` elements display with `display: revert`, and `.context-library` elements display with `display: none`

2. **Given** a user visits `/docs/1.x/routing?context=library`, **When** the page loads, **Then** the context selector shows "library" selected, the URL retains `?context=library`, `.context-library` elements are visible, and `.context-framework` elements are hidden

3. **Given** a user is viewing `/docs/1.x/controllers` with context=framework, **When** they change the select dropdown to "library", **Then** the page does NOT reload, the URL updates to `?context=library` via `pushState`, the cookie updates to "library", and all `.context-library` elements become visible while `.context-framework` elements hide instantly

4. **Given** a user has `aphiria_docs_context=library` cookie set, **When** they visit `/docs/1.x/middleware` (no query parameter), **Then** the context selector displays "library", the page shows library-specific content, and the URL remains `/docs/1.x/middleware` (no automatic query param added until user changes context)

5. **Given** the environment variable `COOKIE_DOMAIN` is set to `.aphiria.com`, **When** context is changed, **Then** the cookie domain attribute is `.aphiria.com` with `SameSite=Lax` and `Secure=true` in production

---

### User Story 2 - SEO-Friendly Documentation URLs (Priority: P1)

A user clicks on a legacy link (e.g., from search engines, bookmarks, or external sites) to `/docs/1.x/routing.html` and needs to be seamlessly redirected to the canonical extension-less URL `/docs/1.x/routing` without broken links or 404 errors.

**Why this priority**: Preserving SEO equity and preventing broken links from existing backlinks, search engine results, and user bookmarks is critical for maintaining site authority and user trust. This is part of the MVP because legacy URLs are actively in use.

**Independent Test**: Can be fully tested by requesting any `.html` URL under `/docs/**/*.html` and verifying a 301 permanent redirect to the extension-less equivalent with proper HTTP headers. Success delivers backward compatibility and SEO preservation.

**Acceptance Scenarios**:

1. **Given** a user visits `/docs/1.x/installation.html`, **When** the request is processed, **Then** they receive a 301 redirect to `/docs/1.x/installation`

2. **Given** a user visits `/docs/1.x/routing.html?context=library`, **When** the request is processed, **Then** they receive a 301 redirect to `/docs/1.x/routing?context=library` (query parameters preserved)

3. **Given** a user visits `/docs/1.x/controllers.html#route-constraints`, **When** the request is processed, **Then** they receive a 301 redirect to `/docs/1.x/controllers#route-constraints` (anchor preserved)

---

### User Story 3 - Documentation Page Rendering with TOC and Sidebar (Priority: P1)

A developer navigates to a documentation page and needs to see the full layout including main navigation, version-aware sidebar with active link highlighting, rendered markdown content, and table of contentsall matching the current visual design exactly.

**Why this priority**: This is the core content consumption experience. Without proper layout, navigation, and content rendering, the documentation is unusable. This is essential for MVP.

**Independent Test**: Can be fully tested by visiting any documentation page, verifying the sidebar shows the correct sections filtered by context, the active page is highlighted, the TOC is generated from headings, and the compiled HTML fragment is inserted into the article element. Success delivers a complete, navigable documentation experience.

**Acceptance Scenarios**:

1. **Given** a user visits `/docs/1.x/routing`, **When** the page loads, **Then** the document title is "Routing | Aphiria", the sidebar highlights "Routing" as active, the article contains the compiled HTML fragment for routing documentation, and the TOC is generated from h2-h5 headings in the fragment

2. **Given** a user visits `/docs` (no version or page), **When** the request is processed, **Then** they are redirected to `/docs/1.x/introduction` (default version and page)

3. **Given** a documentation page with context-specific content, **When** the context is "framework", **Then** the sidebar only shows framework-relevant navigation items, and the TOC only includes visible headings (context-library headings are excluded)

4. **Given** a user visits `/docs/1.x/middleware` on mobile, **When** they tap the mobile menu icon (a), **Then** the sidebar slides in from the right, a gray overlay appears, and tapping the overlay dismisses the sidebarmatching current mobile behavior exactly

---

### User Story 4 - Home Page Rendering (Priority: P2)

A user visits the homepage at `/` and needs to see the site slogan, code example, installation command, and quick links to key documentation pagesall matching the current design and layout.

**Why this priority**: The homepage is the entry point for new users and sets the tone for the framework. While important, it's lower priority than documentation functionality because most traffic goes directly to docs.

**Independent Test**: Can be fully tested by visiting `/` and verifying the title is "Aphiria - A simple, extensible REST API framework", the hero code sample renders with Prism syntax highlighting, and all quick-link buttons work. Success delivers a complete marketing/landing experience.

**Acceptance Scenarios**:

1. **Given** a user visits `/`, **When** the page loads, **Then** the document title is exactly "Aphiria - A simple, extensible REST API framework", the h1 is "A simple, extensible REST API framework for PHP", and the hero code block has the `.no-copy` class

2. **Given** a user views the homepage, **When** they click "Installing" button, **Then** they are taken to `/docs/1.x/installation` (extension-less URL)

---

### User Story 5 - Documentation Search (Priority: P3)

A user needs to search documentation content by typing queries into the search bar, seeing instant results ranked by relevance, and navigating to specific sections via search result links.

**Why this priority**: Search enhances discoverability but is not essential for MVP since users can browse via sidebar navigation. Can be implemented after core browsing experience is stable.

**Independent Test**: Can be fully tested by typing a query in the search input, verifying API calls to `/api/search`, checking result rendering with context highlighting, and confirming keyboard navigation (arrow keys, enter). Success delivers enhanced content discovery.

**Acceptance Scenarios**:

1. **Given** a user types "routing" in the search bar, **When** results are returned from the API, **Then** the results dropdown appears below the search input, each result shows the heading hierarchy (h1 > h2 > h3), matched text is highlighted with `<em>`, and results are grouped by context (framework/library/global)

2. **Given** search results are visible, **When** the user presses the down arrow key, **Then** the first result is highlighted with the `.selected` class and background color `#eef7ff`

3. **Given** a search result is selected, **When** the user presses Enter, **Then** they navigate to the link specified in the result (e.g., `/docs/1.x/routing#route-constraints`)

---

### Edge Cases

- **What happens when a user visits a non-existent documentation page** (e.g., `/docs/1.x/nonexistent`)? System MUST return a 404 page with helpful navigation back to valid documentation sections.

- **What happens when the `COOKIE_DOMAIN` environment variable is not set?** System MUST default to `.aphiria.com` for the cookie domain.

- **What happens when a user has an invalid `aphiria_docs_context` cookie value** (e.g., `aphiria_docs_context=invalid`)? System MUST fall back to default "framework" context and overwrite the cookie with the valid default.

- **What happens when a documentation page has no headings** (edge case for TOC generation)? System MUST render an empty TOC or hide the TOC section entirely without errors.

- **What happens when JavaScript is disabled and context needs to be changed?** System MUST gracefully degrade: the select element can still submit a form or use a server-side mechanism, OR document that JavaScript is required for context switching (acceptable trade-off for modern web apps).

- **What happens when the docs build artifact is missing or corrupted?** Next.js build MUST fail with a clear error message indicating the artifact path and expected format.

- **What happens when a URL contains both `.html` extension and query parameters with special characters** (e.g., `/docs/1.x/routing.html?q=test%20value&context=library`)? System MUST correctly parse and preserve all query parameters during 301 redirect.

- **What happens when a user rapidly toggles context multiple times?** System MUST debounce or handle rapid changes gracefully without race conditions, ensuring the final UI state matches the selected context.

## Requirements _(mandatory)_

### Functional Requirements

#### Next.js Application Architecture

- **FR-001**: System MUST use Next.js App Router (NOT Pages Router) for all routing and rendering
- **FR-002**: System MUST deploy as a Node.js server application (NOT a static export)
- **FR-003**: System MUST use Server Components by default for all pages and layouts
- **FR-004**: System MUST use Client Components ONLY for: context selector dropdown, mobile navigation toggle, search UI
- **FR-005**: System MUST eliminate all gulp build tasks and replace with Next.js built-in build pipeline

#### Visual and UX Parity

- **FR-006**: System MUST use the existing CSS file `apps/web/src/css/aphiria.css` as the source of truth for all styles
- **FR-007**: System MUST preserve exact layout, spacing, typography, colors, code block styling, and navigation behavior from the current site
- **FR-008**: System MUST NOT introduce any CSS framework (e.g., Tailwind, Bootstrap) or redesign any UI elements
- **FR-009**: System MUST maintain Prism.js syntax highlighting with identical token colors and styling
- **FR-010**: System MUST preserve responsive breakpoints and mobile menu behavior (slide-in sidebar at `max-width: 1023px`)

#### Documentation Routing

- **FR-011**: System MUST serve documentation at extension-less URLs: `/docs/[version]/[...slug]` (e.g., `/docs/1.x/routing`)
- **FR-012**: System MUST 301 redirect all `/docs/**/*.html` URLs to their extension-less equivalents (e.g., `/docs/1.x/routing.html` ’ `/docs/1.x/routing`)
- **FR-013**: System MUST preserve query parameters during `.html` redirects (e.g., `/docs/1.x/routing.html?context=library` ’ `/docs/1.x/routing?context=library`)
- **FR-014**: System MUST preserve anchor fragments during `.html` redirects (e.g., `/docs/1.x/routing.html#constraints` ’ `/docs/1.x/routing#constraints`)
- **FR-015**: System MUST redirect `/docs` to `/docs/1.x/introduction` (default version and page)
- **FR-016**: System MUST support versioned documentation routes with `1.x` as the current version, designed to easily add future versions (e.g., `2.x`)

#### Documentation Context Selection

- **FR-017**: System MUST provide a `<select>` element with two options: "framework" and "library"
- **FR-018**: System MUST resolve context in the following precedence order: (1) query parameter `?context=`, (2) cookie value, (3) default to "framework"
- **FR-019**: System MUST set a cookie named `aphiria_docs_context` when context is changed
- **FR-020**: System MUST configure the context cookie with: domain from `COOKIE_DOMAIN` env var (default `.aphiria.com`), path `/`, `SameSite=Lax`, `Secure=true` in production, 1-year expiration
- **FR-021**: System MUST update the URL query string to `?context={selected}` when context changes, using `history.pushState()` (no page reload)
- **FR-022**: System MUST preserve all other query parameters when updating the `context` parameter
- **FR-023**: System MUST toggle DOM visibility when context changes: `.context-framework` ’ `display: revert` when context=framework (else `display: none`), `.context-library` ’ `display: revert` when context=library (else `display: none`)
- **FR-024**: System MUST apply context visibility toggling to ALL page elements: sidebar, document content, TOC, and any other context-scoped UI
- **FR-025**: System MUST trigger a custom event `context-toggled` after visibility changes (for sidebar height recalculation or other dependent UI updates)

#### Documentation Rendering

- **FR-026**: System MUST set document title to `{doc title} | Aphiria` for documentation pages
- **FR-027**: System MUST set document title to exactly "Aphiria - A simple, extensible REST API framework" for the homepage
- **FR-028**: System MUST insert compiled HTML fragments (from `dist/docs/rendered/{version}/{slug}.html`) into an `<article>` element
- **FR-029**: System MUST NOT include `<html>`, `<body>`, or `<article>` tags in the compiled markdown outputonly headings, paragraphs, lists, blockquotes, and other content elements
- **FR-030**: System MUST generate a table of contents (TOC) from h2-h5 headings in the compiled fragment
- **FR-031**: System MUST respect context visibility when generating the TOC (hidden headings excluded)

#### Sidebar Navigation

- **FR-032**: System MUST render a sidebar with curated, ordered documentation sections defined in TypeScript configuration
- **FR-033**: System MUST support version-aware navigation (e.g., `1.x` with ability to add future versions)
- **FR-034**: System MUST support grouping navigation items into named sections
- **FR-035**: System MUST filter sidebar items by context (`framework`, `library`, or global)
- **FR-036**: System MUST highlight the active documentation page with bold font or a `.selected` class
- **FR-037**: System MUST react immediately to context changes by showing/hiding relevant navigation items

#### Documentation Build Artifact

- **FR-038**: System MUST consume a shared build artifact produced by a separate documentation build step
- **FR-039**: System MUST read rendered HTML fragments from `dist/docs/rendered/{version}/{slug}.html`
- **FR-040**: System MUST read metadata from `dist/docs/meta.json` (contains available docs, titles, etc.)
- **FR-041**: System MUST read search index from `dist/docs/search/lexemes.ndjson` (for API consumption, not website rendering)
- **FR-042**: Documentation build artifact MUST be created by a standalone build process (NOT by Next.js)

#### Search Index Artifact Format

- **FR-043**: Search artifact MUST be NDJSON (newline-delimited JSON) format at `dist/docs/search/lexemes.ndjson`
- **FR-044**: Each search record MUST contain: `version`, `context` (global|framework|library), `link`, `html_element_type` (h1|h2|h3|h4|h5|p|li|blockquote), `inner_text`, `h1_inner_text`, `h2_inner_text` (nullable), `h3_inner_text` (nullable), `h4_inner_text` (nullable), `h5_inner_text` (nullable)
- **FR-045**: Search artifact MUST contain ONLY semantic data (NO Postgres-specific data, NO HTML weights, NO tsvectors)
- **FR-046**: Search index extraction MUST parse the compiled HTML fragment DOM, index only specified elements (h1-h5, p, li, blockquote), skip TOC nav blocks, derive context from ancestor classes (`.context-framework`, `.context-library`), and generate links to headings or nearest active heading

#### Build-Time Decoupling

- **FR-047**: System MUST eliminate all build-time coupling between PHP and JavaScript (no PHP calling JS, no JS calling PHP)
- **FR-048**: System MUST share data ONLY via build artifacts (rendered HTML, metadata JSON, search NDJSON)
- **FR-049**: Documentation compilation MUST happen ONCE and produce artifacts consumed by both the website (Next.js) and the API (Postgres import)

#### Testing

- **FR-050**: System MUST include Jest + React Testing Library unit tests for: routing helpers, context precedence resolution, cookie domain handling, DOM toggling logic, sidebar filtering, active link state
- **FR-051**: System MUST include Playwright E2E tests for: `.html` ’ extension-less redirects, default context behavior, context switching without reload, DOM visibility toggling, document title formatting
- **FR-052**: Existing Playwright E2E test suite MUST continue to pass without modification (or with minimal updates for URL structure)

### Key Entities _(include if feature involves data)_

- **Documentation Page**: Represents a single documentation article with attributes: version (e.g., `1.x`), slug (e.g., `routing`), title, compiled HTML fragment, context applicability (global, framework, library, or mixed)

- **Navigation Section**: Represents a grouping of navigation links in the sidebar with attributes: title (e.g., "Getting Started"), order, context filter (framework/library/global), list of child navigation items

- **Navigation Item**: Represents a single link in the sidebar with attributes: label, href, order, context filter, active state (computed based on current page)

- **Search Lexeme Record**: Represents a single searchable text fragment with attributes: version, context, link (canonical URL with anchor), html_element_type, inner_text, heading hierarchy (h1-h5 inner text for context)

- **Context State**: Represents the current documentation view context with attributes: value (framework|library), source (query|cookie|default), cookie settings (domain, expiration, secure, SameSite)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can browse all existing documentation pages using extension-less URLs without encountering any 404 errors or broken links

- **SC-002**: Users clicking legacy `.html` links (from search engines, bookmarks, or external sites) are redirected via 301 to canonical extension-less URLs in under 100ms (server-side redirect)

- **SC-003**: Users can toggle between "framework" and "library" contexts on any documentation page, with the DOM updating instantly (under 50ms) and NO full page reload observable

- **SC-004**: Visual comparison testing (e.g., Percy, Chromatic, or manual pixel diff) shows 100% visual parity with the current production site for: homepage, at least 5 documentation pages (desktop), mobile viewport for 2+ documentation pages

- **SC-005**: Page load times for documentation pages are equal to or faster than the current PHP-rendered site (target: initial page load under 1.5s on 3G, subsequent navigation under 500ms with client-side routing)

- **SC-006**: All existing Playwright E2E tests pass with zero failures or require only URL structure updates (no behavioral regressions)

- **SC-007**: Next.js production build completes successfully and produces a deployable artifact under 100MB (optimized for serverless or container deployment)

- **SC-008**: Developer onboarding time for new contributors is reduced by 30% due to elimination of gulp and simplified modern stack (measured by time to first successful local build)

- **SC-009**: Documentation build artifact generation (separate process) produces valid NDJSON with 100% of documentation content indexed for search

- **SC-010**: Cookie-based context persistence works across 95% of user sessions (measured by successful cookie reads on return visits, accounting for cookie blockers)

## Assumptions

1. **Documentation content source**: The documentation markdown files continue to exist in a separate repository (as referenced by current build: `docs:build` command) and are compiled to HTML fragments by a separate process (not by Next.js).

2. **Prism.js integration**: The current Prism.js setup (version, themes, plugins) can be directly ported to Next.js using the same prismjs npm package and client-side initialization.

3. **Browser support**: Target browsers are modern evergreen browsers (Chrome, Firefox, Safari, Edge) with JavaScript enabled. No IE11 support required.

4. **API endpoint stability**: The search API endpoint (`/api/search`) is provided by the existing PHP API and does not change interface as part of this migration.

5. **Deployment environment**: The Next.js application will be deployed to a Node.js-compatible environment (e.g., Vercel, Docker container on Kubernetes, or AWS Lambda) with environment variable support for `COOKIE_DOMAIN`.

6. **CSS preprocessing**: The existing `aphiria.css` file uses CSS nesting syntax processed by PostCSS (postcss-nested). Next.js will use the same PostCSS configuration to process this CSS.

7. **Static asset handling**: Existing static assets (images, fonts, favicons) in `apps/web/public/` can be directly copied to the Next.js `public/` directory without modification.

8. **Mobile menu behavior**: The current mobile menu toggle logic (adding `.nav-open` class to body, triggering slide-in animation) can be replicated using React state + CSS classes.

9. **Artifact availability at build time**: The documentation build artifact (`dist/docs/`) is available in the filesystem at Next.js build time (either committed to repo or generated in a prior CI/CD step).

10. **TOC generation logic**: Table of contents generation can parse the rendered HTML fragment on the server (using a library like jsdom or cheerio) or client-side to extract h2-h5 headings and build nested navigation.

## Open Questions

None at this time. All requirements are specified based on the current implementation details provided in the input.
