# Tasks: Next.js Migration for aphiria.com

**Input**: Design documents from `/specs/001-nextjs-migration/`
**Prerequisites**: plan.md (✓), spec.md (✓), research.md (✓)

**Tests**: E2E tests using existing Playwright suite (must pass with zero regressions). Unit tests for critical business logic (context resolution, artifact reading, TOC generation).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `apps/web/` (Next.js application replacing PHP templates)
- **Tests**: `apps/web/tests/` (Jest unit tests), `tests/e2e/` (Playwright E2E tests)
- **Artifacts**: `dist/docs/` (external build output, NOT created by Next.js)

---

## Phase 0: Documentation Build Pipeline (Pre-Next.js) ⚠️ CRITICAL

**Purpose**: Create standalone documentation build system that compiles markdown → HTML fragments + NDJSON lexemes, replacing gulp build process. This MUST run BEFORE Next.js build during Docker image creation.

**⚠️ CRITICAL**: TypeScript build pipeline must EXACTLY replicate PHP LexemeSeeder DOM walking logic (minus DB insertion). PHP API will consume NDJSON artifact for search indexing.

### Build Artifact Contract

**Output Location**: `dist/docs/` (consumed by BOTH Next.js and PHP API)

```
dist/docs/
  rendered/
    1.x/
      introduction.html  # HTML fragment (NOT full document)
      installation.html
      routing.html
      ...
  search/
    lexemes.ndjson      # One JSON object per line (streamable)
  meta.json             # Page metadata (titles, slugs, versions)
```

**NDJSON Lexeme Format** (MUST match PHP IndexEntry expectations):
```json
{"version":"1.x","context":"framework","link":"/docs/1.x/routing#route-groups","html_element_type":"h2","inner_text":"Route Groups","h1_inner_text":"Routing","h2_inner_text":"Route Groups","h3_inner_text":null,"h4_inner_text":null,"h5_inner_text":null}
```

### LexemeSeeder Replication Requirements

**Source**: `/apps/api/database/seeds/LexemeSeeder.php`

1. **DOM Walking Logic** (LexemeSeeder.php:284-342 `processNode()`):
   - Parse HTML fragment: `//body/main/article[1]`
   - Recursively process child nodes depth-first
   - Track heading hierarchy (h1, h2, h3, h4, h5) as mutable state passed by reference
   - Reset hierarchy when encountering parent headings (h1 resets all, h2 resets h3-h5, etc.)
   - Skip `<nav class="toc-nav">` elements entirely (LexemeSeeder.php:350-356)

2. **Indexable Elements** (LexemeSeeder.php:24-34):
   - h1, h2, h3, h4, h5, p, li, blockquote
   - Extract `inner_text` using recursive child text concatenation (LexemeSeeder.php:165-178)
   - Text extraction: concatenate ALL descendant text nodes, recursively

3. **Context Detection** (LexemeSeeder.php:186-205 `getContext()`):
   - Walk up DOM tree from current node to document root
   - Check each ancestor for class attribute containing `context-framework` or `context-library`
   - First match wins, return immediately
   - Default to `global` if no context class found in any ancestor
   - Context MUST be case-sensitive enum: "framework" | "library" | "global"

4. **Link Generation** (LexemeSeeder.php:120-142 `createIndexEntry()`):
   - Base format: `/docs/{version}/{filename}#{id}`
   - If current node is h1: `/docs/{version}/{filename}` (no anchor)
   - If current node is h2-h5: `/docs/{version}/{filename}#{currentNode.id}`
   - If current node is p/li/blockquote: link to nearest parent heading's id
   - Hierarchy precedence: h5 > h4 > h3 > h2 > h1 (deepest first)

5. **Heading Hierarchy Tracking** (LexemeSeeder.php:299-320):
   - Maintain references to current h1, h2, h3, h4, h5 nodes
   - When encountering h1: update h1, reset h2-h5 to null
   - When encountering h2: update h2, reset h3-h5 to null
   - When encountering h3: update h3, reset h4-h5 to null
   - When encountering h4: update h4, reset h5 to null
   - When encountering h5: update h5 only
   - Extract text from each heading using recursive child text extraction

### Build Pipeline Architecture

**Directory**: `tools/build-docs/` (TypeScript Node.js scripts)

```
tools/build-docs/
├── index.ts                # CLI entry point
├── lib/
│   ├── markdown-compiler.ts  # marked + GFM tables + raw HTML support
│   ├── syntax-highlighter.ts # Prism.js highlighting (replaces highlight-code.js)
│   ├── lexeme-extractor.ts   # Replicates LexemeSeeder DOM walking
│   ├── ndjson-writer.ts      # Streams lexemes to .ndjson file
│   └── meta-generator.ts     # Creates meta.json
├── types/
│   └── lexeme.ts            # LexemeRecord interface, Context enum
└── tests/
    ├── lexeme-extractor.test.ts
    └── markdown-compiler.test.ts
```

### Phase 0 Tasks

**Setup and Configuration**

- [X] T001 Create `tools/build-docs/` directory structure with TypeScript configuration (tsconfig.json, strict mode)
- [X] T002 [P] Install build dependencies: marked (markdown), prismjs + prismjs/components (syntax highlighting), jsdom (DOM parsing), @types/node
- [X] T003 [P] Create TypeScript interfaces in `tools/build-docs/src/types.ts` matching PHP contracts (LexemeRecord, Context enum: "framework" | "library" | "global")
- [X] T004 [P] Configure marked with GFM tables extension and `mangle: false, headerIds: true` for ID preservation
- [X] T005 Create CLI entry point in `tools/build-docs/index.ts` with argument parsing (input: docs/, output: dist/docs/)

**Markdown Compilation and Syntax Highlighting**

- [X] T006 Create markdown compiler in `tools/build-docs/src/markdown-compiler.ts` using marked with raw HTML support (sanitize: false)
- [X] T007 Implement server-side Prism.js highlighting in `tools/build-docs/src/syntax-highlighter.ts` replicating `apps/web/src/js/server-side/highlight-code.js` logic
- [X] T008 [P] Load Prism languages: apacheconf, bash, http, json, markup, nginx, php, xml, yaml (matching current script line 9)
- [X] T009 Add copy button injection logic to syntax highlighter (skip if `<pre class="no-copy">`)
- [X] T010 [P] Unit test: markdown with embedded HTML (`<div>`, `<h1>`) renders correctly
- [X] T011 [P] Unit test: GFM tables compile to `<table>` elements
- [X] T012 [P] Unit test: Prism.js highlights `<pre><code class="language-php">` blocks

**Lexeme Extraction**

- [X] T013 Create lexeme extractor in `tools/build-docs/src/lexeme-extractor.ts` with DOM parsing setup (jsdom)
- [X] T014 Implement `processNode()` recursive DOM walker (depth-first traversal)
- [X] T015 Implement heading hierarchy state tracking (h1-h5 reset logic: when h1 found, clear h2-h5; when h2 found, clear h3-h5; etc.)
- [X] T016 Implement `getContext()` ancestor walk (bubble up DOM to find `.context-framework` or `.context-library` class, default to `global`)
- [X] T017 Implement `getAllChildNodeTexts()` recursive text extraction (concatenate all descendant text nodes)
- [X] T018 Implement `createLexemeRecord()` link generation (h1 links to `/docs/{version}/{slug}`, h2-h5 link to `#{id}`, other elements link to nearest parent heading)
- [X] T019 Implement `shouldSkipNode()` to skip `<nav class="toc-nav">` elements
- [X] T020 Filter nodes to indexable elements only: h1, h2, h3, h4, h5, p, li, blockquote
- [X] T020.1 Output lexeme records WITHOUT weighting (weighting A/B/C/D will be applied by PHP LexemeSeeder when reading NDJSON)

**Lexeme Extraction Unit Tests**

- [X] T021 [P] Unit test: DOM walking skips `<nav class="toc-nav">` elements completely
- [X] T022 [P] Unit test: context detection walks up DOM tree and finds ancestor `.context-framework` class
- [X] T023 [P] Unit test: context defaults to "global" when no ancestor has context class
- [X] T024 [P] Unit test: link generation for h1 produces `/docs/{version}/{filename}` (no anchor)
- [X] T025 [P] Unit test: link generation for h2-h5 produces `/docs/{version}/{filename}#{id}`
- [X] T026 [P] Unit test: link generation for p/li/blockquote uses nearest parent heading's id (h5>h4>h3>h2>h1 precedence)
- [X] T027 [P] Unit test: heading hierarchy resets correctly (h2 sets h2, nulls h3-h5; h1 sets h1, nulls h2-h5)
- [X] T028 [P] Unit test: recursive text extraction concatenates all descendant text nodes (not just direct children)
- [X] T029 [P] Unit test: only h1/h2/h3/h4/h5/p/li/blockquote elements create lexeme records
- [X] T030 [P] Unit test: NDJSON output format matches spec (all fields: version, context, link, html_element_type, inner_text, h1_inner_text through h5_inner_text)

**Output Generation**

- [X] T031 Create NDJSON writer in `tools/build-docs/src/ndjson-writer.ts` (stream JSON objects with newline separator, NOT array)
- [X] T032 [P] Create meta.json generator in `tools/build-docs/src/meta-generator.ts` (extract titles from h1#doc-title, map slugs to versions)
- [X] T033 [P] Unit test: NDJSON writer produces valid newline-delimited JSON (one object per line, no commas)
- [X] T034 [P] Unit test: meta.json includes all pages with correct version/slug/title mapping

**Integration and Validation**

- [X] T035 Integrate all components: markdown compilation → syntax highlighting → lexeme extraction → NDJSON output
- [X] T036 [P] Add build validation: verify all lexeme records have non-null h1_inner_text
- [X] T037 [P] Add build validation: verify all links start with `/docs/` and match expected format
- [X] T038 [P] Add build validation: verify context enum values are exactly "framework" | "library" | "global"
- [X] T039 [P] Integration test: compile full docs directory, verify output structure (rendered/, search/, meta.json)
- [X] T040 [P] Integration test: compare sample output against current PHP LexemeSeeder output (field-by-field match)

**Docker Build Integration**

- [X] T041 Update `infrastructure/docker/build/Dockerfile` to install Node.js 20+ and TypeScript compiler
- [X] T042 Replace `gulp build` command with `npm run build:docs` (runs tools/build-docs/index.ts) in Dockerfile
- [X] T043 Update Dockerfile to run syntax highlighter on compiled HTML (integrate into build-docs pipeline, NOT separate step)
- [X] T044 [P] Add `dist/docs/` directory COPY to runtime web Dockerfile
- [X] T045 [P] Add `dist/docs/search/lexemes.ndjson` COPY to runtime API Dockerfile (for PHP LexemeSeeder consumption)
- [X] T046 Refactor PHP LexemeSeeder to READ lexemes from `dist/docs/search/lexemes.ndjson` instead of walking DOM (remove DOM parsing, keep weighting logic: A for h1, B for h2, C for h3, D for h4/h5/p/li/blockquote)
- [X] T047 Create new Next.js runtime Dockerfile in `infrastructure/docker/runtime/nextjs/Dockerfile` (Node.js 20+, production build)
- [X] T048 Update Kubernetes deployment manifests to use Next.js runtime image instead of nginx for web service
- [X] T048.1 Remove old gulp-based build system (`gulpfile.js`, `apps/web/gulp/`, `apps/web/resources/`)
- [X] T048.2 Remove PHP view compilation code (if any helpers compiled docs to HTML in `apps/api/`)
- [X] T048.3 Remove any PHP DOM parsing utilities that were used for doc compilation (keep only search-related code)
- [X] T048.4 Update `.gitignore` to remove old gulp artifact paths, add new `dist/docs/` artifacts

**Checkpoint**: Documentation build pipeline complete - artifacts ready for BOTH Next.js (rendering) and PHP API (search indexing). Run `npm run build:docs` to verify output matches expectations.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Next.js project structure and development environment

**Dependencies**: Phase 0 MUST be complete (dist/docs/ must exist for Next.js to consume)

- [X] T097 Create Next.js 15+ project in apps/web/ with TypeScript and App Router
- [X] T098 [P] Configure TypeScript with strict mode in apps/web/tsconfig.json
- [X] T099 [P] Configure ESLint and Prettier in apps/web/.eslintrc.json and apps/web/.prettierrc
- [X] T100 [P] Configure PostCSS with postcss-nested plugin in apps/web/postcss.config.js
- [X] T101 [P] Configure Jest for unit testing in apps/web/jest.config.js
- [X] T102 [P] Install core dependencies: react, next, typescript, cookies-next, isomorphic-dompurify, cheerio, prismjs
- [X] T103 [P] Copy existing CSS file from apps/web/src/css/aphiria.css to apps/web/public/css/aphiria.css
- [X] T104 [P] Copy existing static assets (images, fonts) from current apps/web/public/ to new apps/web/public/
- [X] T105 Create environment variable configuration in apps/web/.env.local with NEXT_PUBLIC_COOKIE_DOMAIN
- [X] T106 Create root layout component in apps/web/src/app/layout.tsx with global CSS import

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Dependencies**: Phase 0 and Phase 1 MUST be complete

- [X] T107 Create TypeScript interfaces for DocumentationPage in apps/web/src/types/documentation.ts
- [X] T108 [P] Create TypeScript interfaces for NavigationSection and NavigationItem in apps/web/src/types/navigation.ts
- [X] T109 [P] Create TypeScript interfaces for ContextState in apps/web/src/types/context.ts
- [X] T110 Implement documentation artifact reader in apps/web/src/lib/docs/artifact-reader.ts (reads meta.json and HTML fragments from dist/docs/)
- [X] T111 [P] Implement sidebar configuration in apps/web/src/lib/docs/sidebar-config.ts (curated navigation structure for version 1.x)
- [X] T112 [P] Create Header component in apps/web/src/components/layout/Header.tsx
- [X] T113 [P] Create Footer component in apps/web/src/components/layout/Footer.tsx
- [X] T114 Implement context resolution logic in apps/web/src/lib/context/resolver.ts (query > cookie > default precedence)
- [X] T115 [P] Create cookie helper functions in apps/web/src/lib/cookies/context-cookie.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Documentation Browsing with Context Selection (Priority: P1) 🎯 MVP

**Goal**: Users can browse documentation pages with instant context switching between "framework" and "library" modes without page reloads, with URL and cookie persistence.

**Independent Test**: Navigate to /docs/1.x/installation, change context dropdown from "framework" to "library", verify URL updates to ?context=library, cookie is set, and DOM elements toggle visibility instantly (<50ms) without page reload.

### Unit Tests for User Story 1

- [X] T116 [P] [US1] Unit test for context resolver (precedence: query > cookie > default) in apps/web/tests/unit/context-resolver.test.ts
- [X] T117 [P] [US1] Unit test for cookie domain handling (env var fallback) in apps/web/tests/unit/context-cookie.test.ts
- [X] T118 [P] [US1] Unit test for sidebar filtering by context in apps/web/tests/unit/sidebar-config.test.ts

### Implementation for User Story 1

- [X] T119 [US1] Create ContextSelector client component in apps/web/src/components/docs/ContextSelector.tsx with useState, useEffect, cookie management, and DOM toggling
- [X] T120 [P] [US1] Create SidebarNav server component in apps/web/src/components/docs/SidebarNav.tsx with context filtering and active link highlighting
- [X] T121 [P] [US1] Create DocumentContent server component in apps/web/src/components/docs/DocumentContent.tsx with DOMPurify sanitization and dangerouslySetInnerHTML rendering
- [X] T122 [US1] Create documentation layout in apps/web/src/app/docs/layout.tsx with sidebar and context selector integration
- [X] T123 [US1] Create dynamic documentation page in apps/web/src/app/docs/[version]/[...slug]/page.tsx with context resolution, HTML fragment loading, and metadata
- [X] T124 [US1] Implement DOM visibility toggling function in apps/web/src/lib/context/toggler.ts (display: revert vs display: none)
- [X] T125 [US1] Add custom event dispatching for context-toggled event in ContextSelector component
- [X] T126 [US1] Create Prism.js client component loader in apps/web/src/components/docs/PrismLoader.tsx with useEffect initialization

### E2E Tests for User Story 1

- [X] T127 [P] [US1] E2E test: default context behavior (no query param, no cookie → defaults to framework) in tests/e2e/tests/context-switching.spec.ts
- [X] T128 [P] [US1] E2E test: query parameter precedence (URL ?context=library overrides cookie) in tests/e2e/tests/context-switching.spec.ts
- [X] T129 [P] [US1] E2E test: context switching without reload (dropdown change updates URL, cookie, and DOM instantly) in tests/e2e/tests/context-switching.spec.ts
- [X] T130 [P] [US1] E2E test: DOM visibility toggling (.context-framework vs .context-library display properties) in tests/e2e/tests/context-switching.spec.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - users can browse docs and switch contexts instantly

---

## Phase 4: User Story 2 - SEO-Friendly Documentation URLs (Priority: P1)

**Goal**: Legacy .html URLs redirect permanently (301) to extension-less equivalents, preserving query parameters and anchor fragments for SEO and backlink compatibility.

**Independent Test**: Request /docs/1.x/routing.html?context=library#constraints, verify 301 redirect to /docs/1.x/routing?context=library#constraints with proper HTTP headers in <100ms.

### Unit Tests for User Story 2

- [X] T083 [P] [US2] Unit test for redirect middleware (extension removal) in apps/web/tests/unit/middleware.test.ts
- [X] T084 [P] [US2] Unit test for query parameter preservation during redirects in apps/web/tests/unit/middleware.test.ts
- [X] T085 [P] [US2] Unit test for anchor fragment preservation in apps/web/tests/unit/middleware.test.ts

### Implementation for User Story 2

- [X] T086 [US2] Create Next.js middleware in apps/web/middleware.ts with .html redirect logic (301 status)
- [X] T087 [US2] Implement redirect helper function in apps/web/src/lib/routing/redirects.ts with query/anchor preservation
- [X] T088 [US2] Configure middleware matcher in apps/web/middleware.ts to scope to /docs/:path*.html patterns only
- [X] T089 [US2] Add /docs redirect to /docs/1.x/introduction in middleware

### E2E Tests for User Story 2

- [X] T090 [P] [US2] E2E test: .html to extension-less redirect in tests/e2e/tests/legacy-redirects.spec.ts
- [X] T091 [P] [US2] E2E test: query parameter preservation during redirect in tests/e2e/tests/legacy-redirects.spec.ts
- [X] T092 [P] [US2] E2E test: anchor fragment preservation during redirect in tests/e2e/tests/legacy-redirects.spec.ts
- [X] T093 [P] [US2] E2E test: complex query params with special characters preserved in tests/e2e/tests/legacy-redirects.spec.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - docs browsing + legacy URL support

---

## Phase 5: User Story 3 - Documentation Page Rendering with TOC and Sidebar (Priority: P1)

**Goal**: Full documentation page layout with main navigation, context-aware sidebar with active highlighting, rendered markdown content, and table of contents generated from headings.

**Independent Test**: Visit /docs/1.x/routing, verify title is "Routing | Aphiria", sidebar highlights "Routing" as active, article contains compiled HTML, and TOC includes h2-h5 headings (excluding hidden context headings).

### Unit Tests for User Story 3

- [X] T094 [P] [US3] Unit test for TOC generation from HTML (heading extraction) in apps/web/tests/unit/toc-generator.test.ts
- [X] T095 [P] [US3] Unit test for TOC context filtering (skip hidden headings) in apps/web/tests/unit/toc-generator.test.ts
- [X] T096 [P] [US3] Unit test for hierarchical TOC nesting (h2 > h3 > h4) in apps/web/tests/unit/toc-generator.test.ts
- [X] T097 [P] [US3] Unit test for sidebar active link detection in apps/web/tests/unit/sidebar-config.test.ts

### Implementation for User Story 3

- [X] T098 [P] [US3] Implement TOC generator in apps/web/src/lib/docs/toc-generator.ts with cheerio HTML parsing
- [X] T099 [P] [US3] Create TableOfContents server component in apps/web/src/components/docs/TableOfContents.tsx with nested list rendering
- [X] T100 [P] [US3] Create MobileMenu client component in apps/web/src/components/layout/MobileMenu.tsx with slide-in animation and gray overlay
- [X] T101 [US3] Update documentation page to include TOC generation and rendering in apps/web/src/app/docs/[version]/[...slug]/page.tsx
- [X] T102 [US3] Add metadata generation for document title ({doc title} | Aphiria) in apps/web/src/app/docs/[version]/[...slug]/page.tsx
- [X] T103 [US3] Implement active link highlighting logic in SidebarNav component (compare current path to href)
- [X] T104 [US3] Add responsive mobile breakpoint handling (<1024px) in sidebar and mobile menu

### E2E Tests for User Story 3

- [X] T105 [P] [US3] E2E test: document title formatting in tests/e2e/tests/docs-rendering.spec.ts
- [X] T106 [P] [US3] E2E test: sidebar active link highlighting in tests/e2e/tests/docs-rendering.spec.ts
- [X] T107 [P] [US3] E2E test: TOC generation from headings in tests/e2e/tests/docs-rendering.spec.ts
- [X] T108 [P] [US3] E2E test: mobile menu toggle behavior in tests/e2e/tests/mobile-nav.spec.ts
- [X] T109 [P] [US3] E2E test: context filtering in sidebar navigation in tests/e2e/tests/docs-rendering.spec.ts

**Checkpoint**: All P1 user stories (1, 2, 3) are now complete and independently functional - core documentation experience is MVP-ready

---

## Phase 6: User Story 4 - Home Page Rendering (Priority: P2)

**Goal**: Homepage displays site slogan, hero code example with Prism syntax highlighting, installation command, and quick links to key documentation pages.

**Independent Test**: Visit /, verify title is "Aphiria - A simple, extensible REST API framework", h1 matches spec, hero code block has .no-copy class, and "Installing" button links to /docs/1.x/installation (extension-less).

### Implementation for User Story 4

- [X] T110 [P] [US4] Create homepage component in apps/web/src/app/page.tsx with hero section, code example, and quick links
- [X] T111 [P] [US4] Add homepage metadata with exact title from spec in apps/web/src/app/page.tsx
- [X] T112 [US4] Configure Prism highlighting for homepage code block (PHP and bash languages)

### E2E Tests for User Story 4

- [X] T113 [P] [US4] E2E test: homepage title and h1 text in tests/e2e/tests/homepage.spec.ts
- [X] T114 [P] [US4] E2E test: hero code block has .no-copy class in tests/e2e/tests/homepage.spec.ts
- [X] T115 [P] [US4] E2E test: quick link buttons navigate to extension-less URLs in tests/e2e/tests/homepage.spec.ts

**Checkpoint**: Homepage is complete - user Stories 1-4 are functional

---

## Phase 7: User Story 5 - Documentation Search (Priority: P3)

**Goal**: Search bar with instant results from API, keyboard navigation (arrow keys, enter), and context-aware result highlighting.

**Independent Test**: Type "routing" in search input, verify API call to /api/search, results dropdown appears, matched text highlighted with <em>, arrow keys select results, Enter navigates to result link.

### Implementation for User Story 5

- [X] T116 [US5] Create SearchBar client component in apps/web/src/components/ui/SearchBar.tsx with fetch, debounce, and keyboard navigation
- [X] T117 [US5] Add search result rendering with heading hierarchy and context grouping
- [X] T118 [US5] Implement keyboard navigation (arrow keys for selection, Enter for navigation)
- [X] T119 [US5] Integrate SearchBar into Header component

### E2E Tests for User Story 5

- [X] T120 [P] [US5] E2E test: search query triggers API call in tests/e2e/tests/search.spec.ts
- [X] T121 [P] [US5] E2E test: results display with context highlighting in tests/e2e/tests/search.spec.ts
- [X] T122 [P] [US5] E2E test: keyboard navigation (arrow keys, Enter) in tests/e2e/tests/search.spec.ts

**Checkpoint**: All user stories complete - full feature parity with current site

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final production readiness

- [X] T123 [P] Create 404 error page in apps/web/src/app/not-found.tsx with navigation back to docs
- [X] T124 [P] Add edge case handling for invalid context cookie values (fallback to default)
- [X] T125 [P] Add debouncing for rapid context switching to prevent race conditions
- [X] T126 [P] Implement build-time artifact validation in apps/web/next.config.js (fail if docs-artifact missing)
- [X] T127 [P] Add loading states for documentation pages (Suspense boundaries)
- [X] T128 [P] Optimize Prism.js with lazy loading (IntersectionObserver for code blocks)
- [X] T129 Run existing Playwright E2E test suite and fix any regressions
- [X] T130 [P] Run ESLint and Prettier, fix all errors and warnings
- [X] T131 Run Jest unit test suite, ensure 100% pass rate
- [X] T132 Run Next.js production build, verify <100MB bundle size
- [X] T133 [P] Update package.json scripts for dev, build, test, lint
- [X] T134 Create developer quickstart documentation in specs/001-nextjs-migration/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Documentation Build Pipeline (Phase 0)**: No dependencies - MUST complete FIRST (builds dist/docs/ consumed by all subsequent phases)
- **Setup (Phase 1)**: Depends on Phase 0 completion (Next.js needs dist/docs/ to exist)
- **Foundational (Phase 2)**: Depends on Phase 0 and Phase 1 completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational
  - User Story 2 (P1): Can start after Foundational (independent of US1)
  - User Story 3 (P1): Depends on US1 (needs ContextSelector and SidebarNav)
  - User Story 4 (P2): Can start after Foundational (independent)
  - User Story 5 (P3): Depends on US1 and US3 (needs Header and search infrastructure)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation + Documentation page structure
- **User Story 2 (P1)**: Foundation only (independent)
- **User Story 3 (P1)**: User Story 1 (needs context selector and sidebar components)
- **User Story 4 (P2)**: Foundation only (independent)
- **User Story 5 (P3)**: User Stories 1 + 3 (needs header and search UI)

### Within Each User Story

- Unit tests can be written first (TDD approach) or alongside implementation
- Models/interfaces before services
- Components before integration into pages
- Core implementation before edge case handling
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: T002, T003, T004, T005, T006, T007, T008 can all run in parallel

**Phase 2 (Foundational)**: T012, T013, T015, T016, T017, T019 can run in parallel after T011, T014, T018 complete

**User Story 1**: T020, T021, T070 (tests), T024, T073 (components) can run in parallel

**User Story 2**: T035, T036, T085 (tests), T042, T043, T044, T093 (E2E) can run in parallel

**User Story 3**: T046, T047, T048, T097 (tests), T050, T051, T100 (components) can run in parallel

**User Story 4**: T062, T063, T065, T066, T115 can run in parallel

**User Story 5**: T072, T073, T122 (tests) can run in parallel

**Phase 8 (Polish)**: T075, T076, T077, T078, T079, T080, T130 can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all unit tests for User Story 1 together:
Task: "Unit test for context resolver in apps/web/tests/unit/context-resolver.test.ts"
Task: "Unit test for cookie domain handling in apps/web/tests/unit/context-cookie.test.ts"
Task: "Unit test for sidebar filtering in apps/web/tests/unit/sidebar-config.test.ts"

# Launch component development in parallel:
Task: "Create SidebarNav component in apps/web/src/components/docs/SidebarNav.tsx"
Task: "Create DocumentContent component in apps/web/src/components/docs/DocumentContent.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 Only)

1. Complete Phase 1: Setup (10 tasks)
2. Complete Phase 2: Foundational (9 tasks) - CRITICAL
3. Complete Phase 3: User Story 1 (15 tasks) - Context switching
4. Complete Phase 4: User Story 2 (8 tasks) - Legacy redirects
5. Complete Phase 5: User Story 3 (12 tasks) - Full page rendering
6. **STOP and VALIDATE**: Test all P1 stories independently
7. Deploy MVP with core documentation experience

**MVP Scope**: 54 tasks for fully functional documentation browsing with context switching, SEO-friendly URLs, and complete page layout.

### Incremental Delivery

1. Setup + Foundational (19 tasks) → Foundation ready
2. Add User Story 1 (15 tasks) → Test independently → Deploy/Demo (context switching works!)
3. Add User Story 2 (8 tasks) → Test independently → Deploy/Demo (legacy URLs work!)
4. Add User Story 3 (12 tasks) → Test independently → Deploy/Demo (full layout complete - MVP ready!)
5. Add User Story 4 (6 tasks) → Homepage complete
6. Add User Story 5 (7 tasks) → Search complete
7. Polish (12 tasks) → Production-ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (19 tasks)
2. Once Foundational is done:
   - Developer A: User Story 1 (context switching)
   - Developer B: User Story 2 (redirects - independent)
   - Developer C: User Story 4 (homepage - independent)
3. After US1 completes:
   - Developer A moves to User Story 3 (depends on US1)
4. After US1 + US3 complete:
   - Any developer: User Story 5 (depends on both)

---

## Task Summary

**Total Tasks**: 134

**By Phase**:
- Phase 0 (Documentation Build Pipeline): 48 tasks (⚠️ CRITICAL - MUST run BEFORE Next.js)
- Phase 1 (Setup): 10 tasks
- Phase 2 (Foundational): 9 tasks
- Phase 3 (User Story 1 - P1): 15 tasks
- Phase 4 (User Story 2 - P1): 8 tasks
- Phase 5 (User Story 3 - P1): 12 tasks
- Phase 6 (User Story 4 - P2): 6 tasks
- Phase 7 (User Story 5 - P3): 7 tasks
- Phase 8 (Polish): 12 tasks
- Additional validation/integration: 7 tasks

**By Story** (implementation tasks only):
- User Story 1: 11 implementation tasks
- User Story 2: 4 implementation tasks
- User Story 3: 7 implementation tasks
- User Story 4: 3 implementation tasks
- User Story 5: 4 implementation tasks

**Parallel Opportunities**: 80+ tasks marked [P] can run in parallel (~60% of total)

**MVP Scope** (P1 stories only): 102 tasks (Phases 0, 1, 2, 3, 4, 5)

**Independent Test Criteria**:
- US1: Context dropdown changes URL, cookie, and DOM visibility without reload
- US2: Legacy .html URLs redirect with 301 status, preserving query params and anchors
- US3: Documentation pages render with correct title, active sidebar link, HTML fragment, and TOC
- US4: Homepage displays with correct title, hero code, and working navigation links
- US5: Search queries return results with keyboard navigation and context highlighting

---

## Notes

- All tasks include exact file paths for implementation
- [P] tasks target different files or have no dependencies
- [Story] labels enable tracking which user story each task delivers
- Unit tests use Jest + React Testing Library
- E2E tests use existing Playwright suite (must maintain zero regressions)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Foundational phase is CRITICAL - blocks all user stories
- MVP = User Stories 1, 2, 3 (P1 priorities only)
- Each story should be independently testable when complete
