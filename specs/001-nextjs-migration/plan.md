# Implementation Plan: Next.js Migration for aphiria.com

**Branch**: `001-nextjs-migration` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-nextjs-migration/spec.md`

## Summary

Migrate aphiria.com from PHP-rendered templating with gulp build pipeline to a modern Next.js application using App Router, while maintaining 100% visual and UX parity. The migration implements server-side documentation rendering, client-side context switching without page reloads, SEO-friendly URL redirects from legacy `.html` paths, and a shared build artifact contract for documentation consumed by both the Next.js website and the PHP API's PostgreSQL full-text search.

**Technical Approach**: Use Next.js 15+ App Router for server-side rendering and routing, React Server Components for static content, Client Components for interactive elements (context selector, mobile menu, search), preserve existing CSS without modification, generate documentation build artifacts separately (outside Next.js), implement middleware for 301 redirects, and maintain cookie-based context persistence across sessions.

## Technical Context

**Language/Version**: TypeScript 5.x + Node.js 20+, React 18+, Next.js 15+
**Primary Dependencies**: Next.js (App Router), React, TypeScript, Prism.js (syntax highlighting), jsdom/cheerio (TOC generation), cookies-next (cookie management)
**Storage**: Filesystem (documentation build artifacts at `dist/docs/`), Browser cookies (context persistence)
**Testing**: Vitest + React Testing Library (unit tests), Playwright (E2E tests, existing suite must pass)
**Target Platform**: Node.js server (Vercel, Docker container, or AWS Lambda)
**Project Type**: Web application (frontend migration, API unchanged)
**Performance Goals**: Initial page load <1.5s on 3G, subsequent navigation <500ms, context switching <50ms, redirect processing <100ms
**Constraints**: 100% visual parity (pixel-perfect CSS preservation), zero E2E test regressions, no redesign or refactoring of UI/UX
**Scale/Scope**: ~30 documentation pages (1.x version), homepage, 2 contexts (framework/library), supports adding future versions

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Core Principle VII: Code Quality & Design Principles

 **PASS** - Single Responsibility:
- Next.js app structure separates concerns (components for UI, lib for business logic, app for routing)
- Context management isolated in dedicated client component
- Artifact readers separated from rendering logic

 **PASS** - Dependency Injection:
- Context resolution logic accepts configuration (cookie domain, default context)
- Page components receive documentation data as props from server components
- No hardcoded paths or configuration values

 **PASS** - Testability-First Design:
- Context resolution logic is pure function (testable without React)
- DOM toggling logic can be tested with React Testing Library
- Artifact readers can be tested with mock filesystem
- Redirect middleware testable with Next.js middleware mocks

 **PASS** - Strong Naming Conventions:
- Components: `ContextSelector`, `DocumentationPage`, `SidebarNav`, `TableOfContents`
- Files: `context-resolver.ts`, `artifact-reader.ts`, `sidebar-config.ts`
- Methods: `resolveContext`, `toggleVisibility`, `generateToc`, `redirectLegacyUrl`
- Properties: `selectedContext`, `sidebarItems`, `activeDocLink`

 **PASS** - Research Over Guessing:
- Phase 0 research covers Next.js App Router patterns, cookie management best practices, CSS migration strategies

  **REVIEW REQUIRED** - No Hacky Solutions:
- Must verify context toggling doesn't use CSS hacks (uses proper display property toggling)
- Must verify redirect logic handles all edge cases (complex query params, anchors)
- Justification: Legacy `.html` redirect requires middleware pattern, but this is idiomatic Next.js

### Core Principle VIII: Frontend & E2E Testing Standards

 **PASS** - TypeScript Quality:
- ESLint and Prettier required in quality gates
- Use `readonly` for sidebar config, artifact paths
- Use interfaces for `DocumentationPage`, `NavigationSection`, `ContextState`
- Strict typing enforced (no `any`)
- CONSTANT_CASE for `DEFAULT_CONTEXT`, `COOKIE_NAME`, `SUPPORTED_VERSIONS`

 **PASS** - E2E Testing (Playwright):
- Page Object Model enforced: all selectors in page objects
- Semantic property names: `contextSelector`, `sidebarActiveLink`, `documentContent`
- Existing Playwright suite must pass (requirement FR-052)
- Smart retry patterns for visibility checks, no `waitForTimeout`

### Core Principle III: Test Coverage (NON-NEGOTIABLE)

 **PASS** - Test coverage required:
- Unit tests: context resolver, artifact reader, TOC generator, sidebar filtering
- Integration tests: redirect middleware, cookie handling, server component rendering
- E2E tests: context switching, legacy URL redirects, mobile menu, search
- No coverage decrease from current levels

### Pre-Deployment Gates

 **PASS** - Quality gates defined:
- TypeScript compilation must succeed
- ESLint + Prettier zero errors/warnings
- Vitest test suite 100% pass
- Playwright E2E suite 100% pass
- Next.js production build succeeds
- Documentation build artifact exists and is valid

## Project Structure

### Documentation (this feature)

```text
specs/001-nextjs-migration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── context-state.ts     # Context state interface
│   ├── documentation.ts     # Documentation page interface
│   └── navigation.ts        # Sidebar navigation interface
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/                # Next.js application (replaces PHP templates + gulp)
 app/                 # Next.js App Router
    layout.tsx           # Root layout with header/footer
    page.tsx             # Homepage route
    docs/
       layout.tsx       # Docs layout with sidebar
       page.tsx         # Redirect /docs  /docs/1.x/introduction
       [version]/
           [...slug]/
               page.tsx # Dynamic documentation pages
    middleware.ts        # Legacy .html redirect handler
 components/          # React components
    layout/
       Header.tsx
       Footer.tsx
       MobileMenu.tsx
    docs/
       ContextSelector.tsx    # Client Component
       SidebarNav.tsx         # Server Component
       TableOfContents.tsx    # Server Component
       DocumentContent.tsx    # Server Component
    ui/
        SearchBar.tsx          # Client Component
        CodeBlock.tsx
 lib/                 # Utility functions and business logic
    context/
       resolver.ts      # Context precedence logic
       toggler.ts       # DOM visibility toggling
    docs/
       artifact-reader.ts   # Read docs-artifact files
       toc-generator.ts     # Parse HTML for TOC
       sidebar-config.ts    # Navigation structure
    routing/
       redirects.ts     # Legacy URL redirect logic
    cookies/
        context-cookie.ts    # Cookie get/set helpers
 public/              # Static assets (copied from current apps/web/public)
    css/
       aphiria.css      # Preserved CSS (source of truth)
    js/
    images/
    fonts/
 tests/               # Vitest unit tests
    unit/
       context-resolver.test.ts
       artifact-reader.test.ts
       toc-generator.test.ts
    integration/
        middleware.test.ts
 e2e/                 # Playwright E2E tests (moved from tests/e2e)
    fixtures/
    pages/
       HomePage.ts
       DocsPage.ts
    tests/
        context-switching.spec.ts
        legacy-redirects.spec.ts
        mobile-nav.spec.ts
 next.config.js       # Next.js configuration
 tsconfig.json        # TypeScript configuration
 vitest.config.ts     # Vitest configuration
 playwright.config.ts # Playwright configuration
 .eslintrc.json       # ESLint rules
 .prettierrc          # Prettier config
 package.json         # Dependencies

dist/docs/           # EXTERNAL build artifact (created by separate process)
 rendered/
    1.x/
        introduction.html
        installation.html
        routing.html
        ...
 search/
    lexemes.ndjson
 meta.json
```

**Structure Decision**: Web application structure selected because this is a frontend-only migration. The Next.js app lives in `apps/web/` (replacing the current PHP-rendered views). The PHP API in `apps/api/` remains unchanged and continues to consume the shared `dist/docs/` for full-text search. The documentation build process (currently `gulp build-docs`) moves to a standalone script in `tools/build-docs/` that produces `dist/docs/` consumed by both Next.js (for rendering) and PHP (for search indexing).

## Complexity Tracking

> **No violations requiring justification**

All patterns align with constitution requirements:
- Single project structure (web app in `apps/web/`)
- Standard Next.js App Router conventions
- No abstraction layers beyond framework defaults
- Direct dependency injection via React props
- No repository pattern needed (filesystem read-only)

The complexity budget is **well within limits**.

## Phase 0: Research & Technology Decisions

### Research Tasks

**Research required for unknowns in Technical Context:**

1. **Next.js App Router migration from templated PHP**
   - Best practices for migrating server-rendered HTML templates to React Server Components
   - How to preserve exact HTML structure for CSS compatibility
   - Server Component vs Client Component decision criteria
   - Middleware patterns for URL rewrites and redirects

2. **Cookie management in Next.js App Router**
   - Best practices for reading cookies in Server Components
   - Client-side cookie manipulation libraries (cookies-next, js-cookie)
   - Cookie security settings (Secure, SameSite, Domain) in production
   - Environment variable handling for cookie domain configuration

3. **CSS migration without refactoring**
   - Importing existing CSS files into Next.js
   - Preserving CSS custom properties and nested syntax
   - PostCSS configuration for nested CSS (currently used)
   - Global CSS vs CSS modules decision

4. **HTML fragment rendering in React**
   - Safe HTML rendering (`dangerouslySetInnerHTML` vs alternatives)
   - XSS prevention when rendering compiled markdown HTML
   - Preserving Prism.js syntax highlighting in React
   - Client-side vs server-side Prism initialization

5. **Documentation build artifact contract**
   - File structure conventions for versioned documentation
   - Metadata format (JSON schema for meta.json)
   - Error handling when artifacts are missing or malformed
   - Build-time vs runtime artifact validation

6. **Legacy URL redirect patterns**
   - Next.js middleware for 301 redirects
   - Query parameter and anchor preservation
   - Redirect performance optimization
   - Testing redirect logic

7. **Context switching without page reload**
   - Client-side DOM manipulation in React
   - `useEffect` for query string updates via `pushState`
   - Custom events for cross-component communication (context-toggled event)
   - Avoiding hydration mismatches with client-side visibility toggling

8. **Table of Contents generation from HTML**
   - Parsing HTML fragments on the server (jsdom, cheerio, or React)
   - Heading hierarchy extraction (h2-h5 with proper nesting)
   - Active heading detection on scroll (client-side)
   - TOC visibility filtering based on context

**Output**: research.md with decisions, rationales, and alternatives considered

## Phase 1: Design & Contracts

### Data Model

**Entities** (from spec):

1. **DocumentationPage**
   - `version`: string (e.g., "1.x")
   - `slug`: string (e.g., "routing")
   - `title`: string
   - `htmlFragment`: string (compiled HTML)
   - `contexts`: array of "global" | "framework" | "library"

2. **NavigationSection**
   - `title`: string (e.g., "Getting Started")
   - `order`: number
   - `contextFilter`: "global" | "framework" | "library"
   - `items`: NavigationItem[]

3. **NavigationItem**
   - `label`: string
   - `href`: string (e.g., "/docs/1.x/routing")
   - `order`: number
   - `contextFilter`: "global" | "framework" | "library"

4. **SearchLexemeRecord**
   - `version`: string
   - `context`: "global" | "framework" | "library"
   - `link`: string (canonical URL with anchor)
   - `html_element_type`: "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "li" | "blockquote"
   - `inner_text`: string
   - `h1_inner_text`: string
   - `h2_inner_text`: string | null
   - `h3_inner_text`: string | null
   - `h4_inner_text`: string | null
   - `h5_inner_text`: string | null

5. **ContextState**
   - `value`: "framework" | "library"
   - `source`: "query" | "cookie" | "default"
   - `cookieSettings`: CookieSettings

**Output**: data-model.md

### API Contracts

**No new API endpoints** - this is a frontend migration. The existing PHP API (`/api/search`) remains unchanged.

**Contracts to define**:

1. **Context State Interface** (`contracts/context-state.ts`)
   - TypeScript interface for context resolution
   - Cookie configuration schema
   - Context precedence rules

2. **Documentation Artifact Interface** (`contracts/documentation.ts`)
   - TypeScript interface for `meta.json` structure
   - HTML fragment validation schema
   - Version and slug path conventions

3. **Navigation Configuration Interface** (`contracts/navigation.ts`)
   - TypeScript interface for sidebar structure
   - Section and item schemas
   - Context filtering rules

**Output**: contracts/*.ts files

### Quickstart

**For developers onboarding to this migration**:

```bash
# 1. Install dependencies
cd apps/web
npm install

# 2. Ensure documentation artifact exists
# (Normally built by separate docs build process)
# For local dev, run: npm run build:docs

# 3. Run development server
npm run dev
# Visit: http://localhost:3000

# 4. Run tests
npm test                # Vitest unit tests
npm run test:e2e        # Playwright E2E tests

# 5. Build for production
npm run build
npm start
```

**Output**: quickstart.md

### Agent Context Update

After Phase 1 design artifacts are complete, update agent context:

```bash
bash .specify/scripts/bash/update-agent-context.sh claude
```

This adds:
- Next.js 15+ (App Router)
- React 18+
- TypeScript 5.x
- Prism.js (syntax highlighting)
- cookies-next (cookie management)
- jsdom/cheerio (TOC generation)

**Output**: Updated `.specify/memory/agent-claude.md`

## Post-Phase 1 Constitution Re-Check

_To be completed after Phase 1 artifacts are generated_

- [ ] Verify data model follows single responsibility (each interface has one clear purpose)
- [ ] Verify contract interfaces use semantic naming
- [ ] Verify no tight coupling between contracts (each interface standalone)
- [ ] Verify quickstart includes testing commands
- [ ] Verify research decisions avoid anti-patterns

## Next Steps

After completing this plan:

1. Review research.md to ensure all technical unknowns are resolved
2. Review data-model.md for entity accuracy
3. Review contracts/*.ts for interface correctness
4. Execute `/speckit.tasks` to generate actionable implementation tasks
5. Begin implementation following tasks.md

## Acceptance Criteria

This plan is complete when:

- [x] Technical Context filled with no NEEDS CLARIFICATION markers
- [x] Constitution Check passes with no unjustified violations
- [ ] Phase 0: research.md exists with all 8 research areas addressed
- [ ] Phase 1: data-model.md exists with all 5 entities defined
- [ ] Phase 1: contracts/ directory exists with 3 TypeScript interface files
- [ ] Phase 1: quickstart.md exists with developer onboarding steps
- [ ] Phase 1: Agent context updated with new technologies
- [ ] Post-Phase 1 constitution re-check passes
