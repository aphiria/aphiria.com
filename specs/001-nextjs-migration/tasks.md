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
- **Artifacts**: `docs-artifact/` (external build output, NOT created by Next.js)

---

## Phase 0: Documentation Build Pipeline (Pre-Next.js) ⚠️ CRITICAL

**Purpose**: Create standalone documentation build system that compiles markdown → HTML fragments + NDJSON lexemes, replacing gulp build process. This MUST run BEFORE Next.js build during Docker image creation.

**⚠️ CRITICAL**: TypeScript build pipeline must EXACTLY replicate PHP LexemeSeeder DOM walking logic (minus DB insertion). PHP API will consume NDJSON artifact for search indexing.

### Build Artifact Contract

**Output Location**: `docs-artifact/` (consumed by BOTH Next.js and PHP API)

```
docs-artifact/
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

**Directory**: `build-docs/` (TypeScript Node.js scripts)

```
build-docs/
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

- [ ] T001 Create `build-docs/` directory structure with TypeScript configuration (tsconfig.json, strict mode)
- [ ] T002 [P] Install build dependencies: marked (markdown), prismjs + prismjs/components (syntax highlighting), jsdom (DOM parsing), @types/node
- [ ] T003 [P] Create TypeScript interfaces in `build-docs/types/lexeme.ts` matching PHP contracts (LexemeRecord, Context enum: "framework" | "library" | "global")
- [ ] T004 [P] Configure marked with GFM tables extension and `mangle: false, headerIds: true` for ID preservation
- [ ] T005 Create CLI entry point in `build-docs/index.ts` with argument parsing (input: docs/, output: docs-artifact/)

**Markdown Compilation and Syntax Highlighting**

- [ ] T006 Create markdown compiler in `build-docs/lib/markdown-compiler.ts` using marked with raw HTML support (sanitize: false)
- [ ] T007 Implement server-side Prism.js highlighting in `build-docs/lib/syntax-highlighter.ts` replicating `apps/web/src/js/server-side/highlight-code.js` logic
- [ ] T008 [P] Load Prism languages: apacheconf, bash, http, json, markup, nginx, php, xml, yaml (matching current script line 9)
- [ ] T009 Add copy button injection logic to syntax highlighter (skip if `<pre class="no-copy">`)
- [ ] T010 [P] Unit test: markdown with embedded HTML (`<div>`, `<h1>`) renders correctly
- [ ] T011 [P] Unit test: GFM tables compile to `<table>` elements
- [ ] T012 [P] Unit test: Prism.js highlights `<pre><code class="language-php">` blocks

**Lexeme Extraction (LexemeSeeder Replication)**

- [ ] T013 Create lexeme extractor in `build-docs/lib/lexeme-extractor.ts` with DOM parsing setup (jsdom)
- [ ] T014 Implement `processNode()` recursive DOM walker matching LexemeSeeder.php:284-342 (depth-first traversal)
- [ ] T015 Implement heading hierarchy state tracking matching LexemeSeeder.php:299-320 (h1-h5 reset logic)
- [ ] T016 Implement `getContext()` ancestor walk matching LexemeSeeder.php:186-205 (bubble up to find `.context-*` class)
- [ ] T017 Implement `getAllChildNodeTexts()` recursive text extraction matching LexemeSeeder.php:165-178
- [ ] T018 Implement `createIndexEntry()` link generation matching LexemeSeeder.php:120-142 (heading precedence h5>h4>h3>h2>h1)
- [ ] T019 Implement `shouldSkipProcessingNode()` to skip `<nav class="toc-nav">` matching LexemeSeeder.php:350-356
- [ ] T020 Filter nodes to indexable elements only: h1, h2, h3, h4, h5, p, li, blockquote (matching LexemeSeeder.php:24-34)

**Lexeme Extraction Unit Tests**

- [ ] T021 [P] Unit test: DOM walking skips `<nav class="toc-nav">` elements completely
- [ ] T022 [P] Unit test: context detection walks up DOM tree and finds ancestor `.context-framework` class
- [ ] T023 [P] Unit test: context defaults to "global" when no ancestor has context class
- [ ] T024 [P] Unit test: link generation for h1 produces `/docs/{version}/{filename}` (no anchor)
- [ ] T025 [P] Unit test: link generation for h2-h5 produces `/docs/{version}/{filename}#{id}`
- [ ] T026 [P] Unit test: link generation for p/li/blockquote uses nearest parent heading's id (h5>h4>h3>h2>h1 precedence)
- [ ] T027 [P] Unit test: heading hierarchy resets correctly (h2 sets h2, nulls h3-h5; h1 sets h1, nulls h2-h5)
- [ ] T028 [P] Unit test: recursive text extraction concatenates all descendant text nodes (not just direct children)
- [ ] T029 [P] Unit test: only h1/h2/h3/h4/h5/p/li/blockquote elements create lexeme records
- [ ] T030 [P] Unit test: NDJSON output format matches spec (all fields: version, context, link, html_element_type, inner_text, h1_inner_text through h5_inner_text)

**Output Generation**

- [ ] T031 Create NDJSON writer in `build-docs/lib/ndjson-writer.ts` (stream JSON objects with newline separator, NOT array)
- [ ] T032 [P] Create meta.json generator in `build-docs/lib/meta-generator.ts` (extract titles from h1#doc-title, map slugs to versions)
- [ ] T033 [P] Unit test: NDJSON writer produces valid newline-delimited JSON (one object per line, no commas)
- [ ] T034 [P] Unit test: meta.json includes all pages with correct version/slug/title mapping

**Integration and Validation**

- [ ] T035 Integrate all components: markdown compilation → syntax highlighting → lexeme extraction → NDJSON output
- [ ] T036 [P] Add build validation: verify all lexeme records have non-null h1_inner_text
- [ ] T037 [P] Add build validation: verify all links start with `/docs/` and match expected format
- [ ] T038 [P] Add build validation: verify context enum values are exactly "framework" | "library" | "global"
- [ ] T039 [P] Integration test: compile full docs directory, verify output structure (rendered/, search/, meta.json)
- [ ] T040 [P] Integration test: compare sample output against current PHP LexemeSeeder output (field-by-field match)

**Docker Build Integration**

- [ ] T041 Update `infrastructure/docker/build/Dockerfile` to install Node.js 20+ and TypeScript compiler
- [ ] T042 Replace `gulp build` command with `npm run build:docs` (runs build-docs/index.ts) in Dockerfile
- [ ] T043 Update Dockerfile to run syntax highlighter on compiled HTML (integrate into build-docs pipeline, NOT separate step)
- [ ] T044 [P] Add `docs-artifact/` directory COPY to runtime web Dockerfile
- [ ] T045 [P] Add `docs-artifact/search/lexemes.ndjson` COPY to runtime API Dockerfile (for PHP LexemeSeeder consumption)
- [ ] T046 Update PHP LexemeSeeder to READ lexemes from NDJSON artifact instead of walking DOM (change from extraction to import)
- [ ] T047 Create new Next.js runtime Dockerfile in `infrastructure/docker/runtime/nextjs/Dockerfile` (Node.js 20+, production build)
- [ ] T048 Update Kubernetes deployment manifests to use Next.js runtime image instead of nginx for web service

**Checkpoint**: Documentation build pipeline complete - artifacts ready for BOTH Next.js (rendering) and PHP API (search indexing). Run `npm run build:docs` to verify output matches expectations.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Next.js project structure and development environment

**Dependencies**: Phase 0 MUST be complete (docs-artifact/ must exist for Next.js to consume)

- [ ] T097 Create Next.js 15+ project in apps/web/ with TypeScript and App Router
- [ ] T098 [P] Configure TypeScript with strict mode in apps/web/tsconfig.json
- [ ] T099 [P] Configure ESLint and Prettier in apps/web/.eslintrc.json and apps/web/.prettierrc
- [ ] T100 [P] Configure PostCSS with postcss-nested plugin in apps/web/postcss.config.js
- [ ] T101 [P] Configure Jest for unit testing in apps/web/jest.config.js
- [ ] T102 [P] Install core dependencies: react, next, typescript, cookies-next, isomorphic-dompurify, cheerio, prismjs
- [ ] T103 [P] Copy existing CSS file from apps/web/src/css/aphiria.css to apps/web/public/css/aphiria.css
- [ ] T104 [P] Copy existing static assets (images, fonts) from current apps/web/public/ to new apps/web/public/
- [ ] T105 Create environment variable configuration in apps/web/.env.local with NEXT_PUBLIC_COOKIE_DOMAIN
- [ ] T106 Create root layout component in apps/web/app/layout.tsx with global CSS import

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Dependencies**: Phase 0 and Phase 1 MUST be complete

- [ ] T107 Create TypeScript interfaces for DocumentationPage in apps/web/types/documentation.ts
- [ ] T108 [P] Create TypeScript interfaces for NavigationSection and NavigationItem in apps/web/types/navigation.ts
- [ ] T109 [P] Create TypeScript interfaces for ContextState in apps/web/types/context.ts
- [ ] T110 Implement documentation artifact reader in apps/web/lib/docs/artifact-reader.ts (reads meta.json and HTML fragments from docs-artifact/)
- [ ] T111 [P] Implement sidebar configuration in apps/web/lib/docs/sidebar-config.ts (curated navigation structure for version 1.x)
- [ ] T112 [P] Create Header component in apps/web/components/layout/Header.tsx
- [ ] T113 [P] Create Footer component in apps/web/components/layout/Footer.tsx
- [ ] T114 Implement context resolution logic in apps/web/lib/context/resolver.ts (query > cookie > default precedence)
- [ ] T115 [P] Create cookie helper functions in apps/web/lib/cookies/context-cookie.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Documentation Browsing with Context Selection (Priority: P1) 🎯 MVP

**Goal**: Users can browse documentation pages with instant context switching between "framework" and "library" modes without page reloads, with URL and cookie persistence.

**Independent Test**: Navigate to /docs/1.x/installation, change context dropdown from "framework" to "library", verify URL updates to ?context=library, cookie is set, and DOM elements toggle visibility instantly (<50ms) without page reload.

### Unit Tests for User Story 1

- [ ] T116 [P] [US1] Unit test for context resolver (precedence: query > cookie > default) in apps/web/tests/unit/context-resolver.test.ts
- [ ] T117 [P] [US1] Unit test for cookie domain handling (env var fallback) in apps/web/tests/unit/context-cookie.test.ts
- [ ] T118 [P] [US1] Unit test for sidebar filtering by context in apps/web/tests/unit/sidebar-config.test.ts

### Implementation for User Story 1

- [ ] T119 [US1] Create ContextSelector client component in apps/web/components/docs/ContextSelector.tsx with useState, useEffect, cookie management, and DOM toggling
- [ ] T120 [P] [US1] Create SidebarNav server component in apps/web/components/docs/SidebarNav.tsx with context filtering and active link highlighting
- [ ] T121 [P] [US1] Create DocumentContent server component in apps/web/components/docs/DocumentContent.tsx with DOMPurify sanitization and dangerouslySetInnerHTML rendering
- [ ] T122 [US1] Create documentation layout in apps/web/app/docs/layout.tsx with sidebar and context selector integration
- [ ] T123 [US1] Create dynamic documentation page in apps/web/app/docs/[version]/[...slug]/page.tsx with context resolution, HTML fragment loading, and metadata
- [ ] T124 [US1] Implement DOM visibility toggling function in apps/web/lib/context/toggler.ts (display: revert vs display: none)
- [ ] T125 [US1] Add custom event dispatching for context-toggled event in ContextSelector component
- [ ] T126 [US1] Create Prism.js client component loader in apps/web/components/docs/PrismLoader.tsx with useEffect initialization

### E2E Tests for User Story 1

- [ ] T127 [P] [US1] E2E test: default context behavior (no query param, no cookie → defaults to framework) in tests/e2e/tests/context-switching.spec.ts
- [ ] T128 [P] [US1] E2E test: query parameter precedence (URL ?context=library overrides cookie) in tests/e2e/tests/context-switching.spec.ts
- [ ] T129 [P] [US1] E2E test: context switching without reload (dropdown change updates URL, cookie, and DOM instantly) in tests/e2e/tests/context-switching.spec.ts
- [ ] T130 [P] [US1] E2E test: DOM visibility toggling (.context-framework vs .context-library display properties) in tests/e2e/tests/context-switching.spec.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - users can browse docs and switch contexts instantly

---

## Phase 4: User Story 2 - SEO-Friendly Documentation URLs (Priority: P1)

**Goal**: Legacy .html URLs redirect permanently (301) to extension-less equivalents, preserving query parameters and anchor fragments for SEO and backlink compatibility.

**Independent Test**: Request /docs/1.x/routing.html?context=library#constraints, verify 301 redirect to /docs/1.x/routing?context=library#constraints with proper HTTP headers in <100ms.

### Unit Tests for User Story 2

- [ ] T083 [P] [US2] Unit test for redirect middleware (extension removal) in apps/web/tests/unit/middleware.test.ts
- [ ] T084 [P] [US2] Unit test for query parameter preservation during redirects in apps/web/tests/unit/middleware.test.ts
- [ ] T085 [P] [US2] Unit test for anchor fragment preservation in apps/web/tests/unit/middleware.test.ts

### Implementation for User Story 2

- [ ] T086 [US2] Create Next.js middleware in apps/web/middleware.ts with .html redirect logic (301 status)
- [ ] T087 [US2] Implement redirect helper function in apps/web/lib/routing/redirects.ts with query/anchor preservation
- [ ] T088 [US2] Configure middleware matcher in apps/web/middleware.ts to scope to /docs/:path*.html patterns only
- [ ] T089 [US2] Add /docs redirect to /docs/1.x/introduction in middleware

### E2E Tests for User Story 2

- [ ] T090 [P] [US2] E2E test: .html to extension-less redirect in tests/e2e/tests/legacy-redirects.spec.ts
- [ ] T091 [P] [US2] E2E test: query parameter preservation during redirect in tests/e2e/tests/legacy-redirects.spec.ts
- [ ] T092 [P] [US2] E2E test: anchor fragment preservation during redirect in tests/e2e/tests/legacy-redirects.spec.ts
- [ ] T093 [P] [US2] E2E test: complex query params with special characters preserved in tests/e2e/tests/legacy-redirects.spec.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - docs browsing + legacy URL support

---

## Phase 5: User Story 3 - Documentation Page Rendering with TOC and Sidebar (Priority: P1)

**Goal**: Full documentation page layout with main navigation, context-aware sidebar with active highlighting, rendered markdown content, and table of contents generated from headings.

**Independent Test**: Visit /docs/1.x/routing, verify title is "Routing | Aphiria", sidebar highlights "Routing" as active, article contains compiled HTML, and TOC includes h2-h5 headings (excluding hidden context headings).

### Unit Tests for User Story 3

- [ ] T094 [P] [US3] Unit test for TOC generation from HTML (heading extraction) in apps/web/tests/unit/toc-generator.test.ts
- [ ] T095 [P] [US3] Unit test for TOC context filtering (skip hidden headings) in apps/web/tests/unit/toc-generator.test.ts
- [ ] T096 [P] [US3] Unit test for hierarchical TOC nesting (h2 > h3 > h4) in apps/web/tests/unit/toc-generator.test.ts
- [ ] T097 [P] [US3] Unit test for sidebar active link detection in apps/web/tests/unit/sidebar-config.test.ts

### Implementation for User Story 3

- [ ] T098 [P] [US3] Implement TOC generator in apps/web/lib/docs/toc-generator.ts with cheerio HTML parsing
- [ ] T099 [P] [US3] Create TableOfContents server component in apps/web/components/docs/TableOfContents.tsx with nested list rendering
- [ ] T100 [P] [US3] Create MobileMenu client component in apps/web/components/layout/MobileMenu.tsx with slide-in animation and gray overlay
- [ ] T101 [US3] Update documentation page to include TOC generation and rendering in apps/web/app/docs/[version]/[...slug]/page.tsx
- [ ] T102 [US3] Add metadata generation for document title ({doc title} | Aphiria) in apps/web/app/docs/[version]/[...slug]/page.tsx
- [ ] T103 [US3] Implement active link highlighting logic in SidebarNav component (compare current path to href)
- [ ] T104 [US3] Add responsive mobile breakpoint handling (<1024px) in sidebar and mobile menu

### E2E Tests for User Story 3

- [ ] T105 [P] [US3] E2E test: document title formatting in tests/e2e/tests/docs-rendering.spec.ts
- [ ] T106 [P] [US3] E2E test: sidebar active link highlighting in tests/e2e/tests/docs-rendering.spec.ts
- [ ] T107 [P] [US3] E2E test: TOC generation from headings in tests/e2e/tests/docs-rendering.spec.ts
- [ ] T108 [P] [US3] E2E test: mobile menu toggle behavior in tests/e2e/tests/mobile-nav.spec.ts
- [ ] T109 [P] [US3] E2E test: context filtering in sidebar navigation in tests/e2e/tests/docs-rendering.spec.ts

**Checkpoint**: All P1 user stories (1, 2, 3) are now complete and independently functional - core documentation experience is MVP-ready

---

## Phase 6: User Story 4 - Home Page Rendering (Priority: P2)

**Goal**: Homepage displays site slogan, hero code example with Prism syntax highlighting, installation command, and quick links to key documentation pages.

**Independent Test**: Visit /, verify title is "Aphiria - A simple, extensible REST API framework", h1 matches spec, hero code block has .no-copy class, and "Installing" button links to /docs/1.x/installation (extension-less).

### Implementation for User Story 4

- [ ] T110 [P] [US4] Create homepage component in apps/web/app/page.tsx with hero section, code example, and quick links
- [ ] T111 [P] [US4] Add homepage metadata with exact title from spec in apps/web/app/page.tsx
- [ ] T112 [US4] Configure Prism highlighting for homepage code block (PHP and bash languages)

### E2E Tests for User Story 4

- [ ] T113 [P] [US4] E2E test: homepage title and h1 text in tests/e2e/tests/homepage.spec.ts
- [ ] T114 [P] [US4] E2E test: hero code block has .no-copy class in tests/e2e/tests/homepage.spec.ts
- [ ] T115 [P] [US4] E2E test: quick link buttons navigate to extension-less URLs in tests/e2e/tests/homepage.spec.ts

**Checkpoint**: Homepage is complete - user Stories 1-4 are functional

---

## Phase 7: User Story 5 - Documentation Search (Priority: P3)

**Goal**: Search bar with instant results from API, keyboard navigation (arrow keys, enter), and context-aware result highlighting.

**Independent Test**: Type "routing" in search input, verify API call to /api/search, results dropdown appears, matched text highlighted with <em>, arrow keys select results, Enter navigates to result link.

### Implementation for User Story 5

- [ ] T116 [US5] Create SearchBar client component in apps/web/components/ui/SearchBar.tsx with fetch, debounce, and keyboard navigation
- [ ] T117 [US5] Add search result rendering with heading hierarchy and context grouping
- [ ] T118 [US5] Implement keyboard navigation (arrow keys for selection, Enter for navigation)
- [ ] T119 [US5] Integrate SearchBar into Header component

### E2E Tests for User Story 5

- [ ] T120 [P] [US5] E2E test: search query triggers API call in tests/e2e/tests/search.spec.ts
- [ ] T121 [P] [US5] E2E test: results display with context highlighting in tests/e2e/tests/search.spec.ts
- [ ] T122 [P] [US5] E2E test: keyboard navigation (arrow keys, Enter) in tests/e2e/tests/search.spec.ts

**Checkpoint**: All user stories complete - full feature parity with current site

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final production readiness

- [ ] T123 [P] Create 404 error page in apps/web/app/not-found.tsx with navigation back to docs
- [ ] T124 [P] Add edge case handling for invalid context cookie values (fallback to default)
- [ ] T125 [P] Add debouncing for rapid context switching to prevent race conditions
- [ ] T126 [P] Implement build-time artifact validation in apps/web/next.config.js (fail if docs-artifact missing)
- [ ] T127 [P] Add loading states for documentation pages (Suspense boundaries)
- [ ] T128 [P] Optimize Prism.js with lazy loading (IntersectionObserver for code blocks)
- [ ] T129 Run existing Playwright E2E test suite and fix any regressions
- [ ] T130 [P] Run ESLint and Prettier, fix all errors and warnings
- [ ] T131 Run Jest unit test suite, ensure 100% pass rate
- [ ] T132 Run Next.js production build, verify <100MB bundle size
- [ ] T133 [P] Update package.json scripts for dev, build, test, lint
- [ ] T134 Create developer quickstart documentation in specs/001-nextjs-migration/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Documentation Build Pipeline (Phase 0)**: No dependencies - MUST complete FIRST (builds docs-artifact/ consumed by all subsequent phases)
- **Setup (Phase 1)**: Depends on Phase 0 completion (Next.js needs docs-artifact/ to exist)
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
Task: "Create SidebarNav component in apps/web/components/docs/SidebarNav.tsx"
Task: "Create DocumentContent component in apps/web/components/docs/DocumentContent.tsx"
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
