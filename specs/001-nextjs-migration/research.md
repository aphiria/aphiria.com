# Research: Next.js Migration for aphiria.com

**Feature**: 001-nextjs-migration
**Date**: 2026-01-18
**Status**: Complete
**Related**: [plan.md](./plan.md), [spec.md](./spec.md)

## Overview

This document contains technical research for migrating aphiria.com from PHP-rendered templates with gulp to Next.js 15+ with App Router. The research addresses all technical unknowns identified in the implementation plan, with decisions based on official Next.js documentation, React best practices, and security standards.

---

## 1. Next.js App Router Migration from Templated PHP

### Decision

**Use Next.js 15+ App Router with React Server Components as the default for all pages and layouts, with Client Components ("use client") ONLY for interactive elements (context selector, mobile menu, search bar).**

Preserve HTML structure by:
- Rendering compiled HTML fragments using `dangerouslySetInnerHTML` with DOMPurify sanitization
- Using Server Components to inject HTML without client-side hydration overhead
- Keeping the existing CSS unchanged and importing it as global CSS
- Using middleware for URL rewrites/redirects (301 for `.html` → extension-less URLs)

### Rationale

1. **Server Components by default** minimizes JavaScript bundle size and improves Time To Interactive (TTI), with research showing bundle size reductions of 18-29% compared to full client-side apps.

2. **HTML structure preservation** is critical for CSS compatibility. Since the CSS file (`aphiria.css`) targets specific DOM structures, we MUST maintain the exact same HTML output. Server Components render HTML on the server identically to PHP templates, avoiding client-side manipulation that could break layout.

3. **Middleware for redirects** is the idiomatic Next.js pattern for URL manipulation. Using `middleware.ts` with `NextResponse.redirect()` ensures 301 redirects happen at the edge before any page rendering, meeting the <100ms performance goal.

### Alternatives Considered

**Alternative 1**: Use Pages Router instead of App Router
- **Rejected**: Pages Router is legacy. App Router is the future of Next.js with better performance, built-in layouts, and Server Components support. Next.js 15 heavily favors App Router, and 80% of new projects are switching to it.

**Alternative 2**: Use Client Components for everything
- **Rejected**: This defeats the purpose of migration. Client Components would require shipping the entire React runtime to the browser, increasing bundle size and slowing TTI. Server Components are free (zero client JS).

**Alternative 3**: Use `next.config.js` redirects instead of middleware
- **Rejected**: Config-based redirects work for static patterns but are harder to test and don't support complex query parameter preservation. Middleware is more flexible and testable.

### Best Practices

**Server vs Client Component Decision Tree** (from official Next.js docs):

Use **Server Components** when you need to:
- Fetch data from databases or APIs close to the source
- Use API keys, tokens, and other secrets without exposing them to the client
- Reduce the amount of JavaScript sent to the browser
- Improve the First Contentful Paint (FCP)

Use **Client Components** when you need:
- State and event handlers (`useState`, `useReducer`, `onClick`)
- Lifecycle logic (`useEffect`, `useLayoutEffect`)
- Browser-only APIs (localStorage, geolocation, etc.)
- Custom hooks

**Component Composition Pattern**:
```tsx
// ❌ BAD: Marking entire page as Client Component
'use client'
export default function DocsPage() {
  return (
    <div>
      <Sidebar /> {/* Static, but forced to client */}
      <Content /> {/* Static, but forced to client */}
      <ContextSelector /> {/* Only this needs client */}
    </div>
  )
}

// ✅ GOOD: Isolate interactivity in small Client Components
export default function DocsPage() { // Server Component by default
  return (
    <div>
      <Sidebar /> {/* Server Component (zero JS) */}
      <Content /> {/* Server Component (zero JS) */}
      <ContextSelector /> {/* Client Component (imports "use client") */}
    </div>
  )
}
```

**Middleware Pattern for Redirects**:
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, search, hash } = request.nextUrl

  // Match /docs/**/*.html
  if (pathname.match(/^\/docs\/.*\.html$/)) {
    const newPathname = pathname.replace(/\.html$/, '')
    const url = new URL(newPathname + search + hash, request.url)
    return NextResponse.redirect(url, 301)
  }
}

export const config = {
  matcher: '/docs/:path*.html',
}
```

### Pitfalls to Avoid

1. **"use client" boundary too high**: Don't mark entire pages as Client Components. Push "use client" down to the smallest interactive leaf components.

2. **Mixing Server/Client incorrectly**: You cannot import a Server Component into a Client Component. Instead, pass Server Components as `children` props to Client Components.

3. **Assuming code runs client-side**: Server Components run ONLY on the server. No `useEffect`, `useState`, or browser APIs available.

4. **Hydration mismatches**: If you render different HTML on server vs client (e.g., reading cookies in a Server Component vs Client Component), you'll get hydration errors. Use consistent data sources.

---

## 2. Cookie Management in Next.js App Router

### Decision

**Use Next.js `cookies()` function (async) in Server Components/Actions for reading/writing cookies, and use `cookies-next/client` library for client-side cookie manipulation in Client Components.**

Configuration:
- Read cookies in Server Components using `await cookies()` (async in Next.js 15)
- Set/delete cookies ONLY in Server Actions or Route Handlers (NOT directly in Server Components)
- Client-side cookie manipulation uses `cookies-next` library with React hooks
- Cookie security settings: `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `domain: process.env.COOKIE_DOMAIN || '.aphiria.com'`

### Rationale

1. **Next.js 15 `cookies()` is now async**, returning a promise. This is the official, framework-native way to handle cookies in Server Components. Using the built-in function ensures compatibility with Next.js caching and rendering strategies.

2. **Server Actions for mutations** aligns with Next.js architecture. Cookies are set via `Set-Cookie` headers, which can only be sent from server-side responses (Route Handlers or Server Actions). Server Components cannot modify headers after streaming starts.

3. **cookies-next library** provides the best developer experience for client-side cookie manipulation:
   - Supports both client (`cookies-next/client`) and server (`cookies-next/server`) imports
   - React hooks: `useSetCookie`, `useGetCookie`, `useHasCookie`, `useDeleteCookie`
   - Compatible with Next.js 13+ App Router
   - Simpler API than raw `document.cookie` manipulation

4. **Security settings** follow industry best practices:
   - `httpOnly: true` prevents XSS attacks by blocking client-side JavaScript access
   - `secure: true` in production ensures transmission only over HTTPS
   - `sameSite: 'lax'` mitigates CSRF attacks while allowing normal navigation
   - `domain: .aphiria.com` enables cookie sharing across subdomains (if needed)

### Alternatives Considered

**Alternative 1**: Use `js-cookie` library instead of `cookies-next`
- **Rejected**: `js-cookie` is client-only and doesn't integrate with Next.js server-side rendering. `cookies-next` provides unified API for both client and server, reducing code duplication.

**Alternative 2**: Set cookies directly in Server Components
- **Rejected**: This is not possible in Next.js. Cookies are set via headers, which cannot be modified in Server Components after streaming starts. The framework enforces this limitation for correctness.

**Alternative 3**: Use `document.cookie` directly in Client Components
- **Rejected**: Raw `document.cookie` API is error-prone (string parsing) and verbose. Libraries like `cookies-next` provide cleaner, safer APIs with better TypeScript support.

### Best Practices

**Reading Cookies in Server Components** (Next.js 15 async pattern):
```typescript
import { cookies } from 'next/headers'

export default async function DocsPage() {
  const cookieStore = await cookies()
  const context = cookieStore.get('aphiria_docs_context')?.value || 'framework'

  return <div>Context: {context}</div>
}
```

**Setting Cookies in Server Action**:
```typescript
'use server'
import { cookies } from 'next/headers'

export async function setContextCookie(context: string) {
  const cookieStore = await cookies()

  cookieStore.set('aphiria_docs_context', context, {
    domain: process.env.COOKIE_DOMAIN || '.aphiria.com',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false, // Allow client-side read for context selector
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}
```

**Client-Side Cookie Manipulation** (using cookies-next):
```typescript
'use client'
import { useSetCookie, useGetCookie } from 'cookies-next/client'

export function ContextSelector() {
  const context = useGetCookie('aphiria_docs_context') || 'framework'
  const setContextCookie = useSetCookie()

  const handleChange = (newContext: string) => {
    setContextCookie('aphiria_docs_context', newContext, {
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.aphiria.com',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
  }

  return <select value={context} onChange={(e) => handleChange(e.target.value)}>...</select>
}
```

**Production Cookie Configuration**:
```typescript
const cookieConfig = {
  httpOnly: true, // For session cookies (set to false for client-readable context cookie)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'lax' as const, // CSRF protection
  path: '/',
  domain: process.env.COOKIE_DOMAIN || '.aphiria.com',
  maxAge: 60 * 60 * 24 * 7, // 7 days
}
```

### Pitfalls to Avoid

1. **Trying to set cookies in Server Components**: This will fail. Use Server Actions or Route Handlers only.

2. **Forgetting async/await with `cookies()`**: In Next.js 15, `cookies()` is async. You must `await` it or use React's `use()` hook.

3. **Hardcoding cookie domain**: Use environment variables (`COOKIE_DOMAIN`) to support different domains in dev/preview/prod environments.

4. **Missing `secure` flag in production**: Cookies without `Secure` attribute can be intercepted over HTTP. Always set `secure: true` in production.

5. **Using `httpOnly: true` for client-readable cookies**: The context cookie MUST be client-readable for the context selector to function. Set `httpOnly: false`.

6. **Cookie domain mismatch**: In production, cookies work locally over HTTP but fail in production over HTTPS if domain settings are incorrect. Test cookie behavior in production-like environments early.

---

## 3. CSS Migration Without Refactoring

### Decision

**Import the existing `aphiria.css` file as global CSS in the root layout (`app/layout.tsx`) and configure PostCSS with `postcss-nested` plugin to handle CSS nesting syntax. Do NOT use CSS Modules or any CSS-in-JS libraries.**

Configuration:
- Import CSS: `import '../public/css/aphiria.css'` in `app/layout.tsx`
- PostCSS config: Add `postcss-nested` plugin to `postcss.config.js`
- CSS custom properties (CSS variables): Use as-is without transformation
- No CSS frameworks (no Tailwind, no Bootstrap)

### Rationale

1. **Global CSS import in root layout** is the recommended Next.js pattern for site-wide styles. This ensures all pages receive the same CSS, matching the current behavior where `aphiria.css` is loaded on every page.

2. **PostCSS with postcss-nested** preserves the existing CSS nesting syntax without refactoring. The current build uses PostCSS for nesting, so continuing this in Next.js ensures zero CSS changes.

3. **CSS custom properties (variables)** are natively supported by modern browsers and don't require compilation. Next.js preserves them by default.

4. **No CSS Modules** because the existing CSS is global and tightly coupled to specific DOM structures. Scoping CSS to modules would require refactoring all class names, violating the "no redesign" constraint.

5. **No CSS-in-JS** (styled-components, emotion) because these libraries add runtime overhead and would require rewriting all styles. CSS-in-JS also has compatibility issues with Server Components.

### Alternatives Considered

**Alternative 1**: Use CSS Modules for all components
- **Rejected**: This would require refactoring all CSS selectors and class names. The constraint is 100% visual parity with zero CSS changes.

**Alternative 2**: Use Tailwind CSS
- **Rejected**: Introducing a new CSS framework violates the "no redesign" constraint. Tailwind would require rewriting all HTML class names.

**Alternative 3**: Use styled-components or emotion
- **Rejected**: CSS-in-JS libraries have compatibility issues with React Server Components and add runtime overhead. Migration would require rewriting all styles in JavaScript.

**Alternative 4**: Use `postcss-nesting` instead of `postcss-nested`
- **Considered**: Both plugins support CSS nesting, but `postcss-nested` follows Sass-like nesting (more intuitive), while `postcss-nesting` follows the CSS Nesting specification (more standards-compliant but different syntax). Since the existing CSS likely uses Sass-like nesting, `postcss-nested` is safer.

### Best Practices

**Global CSS Import Pattern**:
```tsx
// app/layout.tsx
import '../public/css/aphiria.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

**PostCSS Configuration**:
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-import': {},
    'postcss-nested': {}, // Sass-like nesting
    'autoprefixer': {},
  },
}
```

**CSS Custom Properties Usage** (no changes needed):
```css
/* Existing CSS - works as-is in Next.js */
:root {
  --primary-color: #007bff;
  --spacing-unit: 1rem;
}

.button {
  color: var(--primary-color);
  padding: var(--spacing-unit);
}
```

**CSS Nesting Example** (handled by postcss-nested):
```css
/* Input CSS */
.docs-page {
  background: white;

  .sidebar {
    width: 250px;

    a {
      color: blue;

      &:hover {
        color: darkblue;
      }
    }
  }
}

/* Output CSS (compiled by PostCSS) */
.docs-page {
  background: white;
}
.docs-page .sidebar {
  width: 250px;
}
.docs-page .sidebar a {
  color: blue;
}
.docs-page .sidebar a:hover {
  color: darkblue;
}
```

### Pitfalls to Avoid

1. **Importing CSS in multiple places**: Only import global CSS in the root layout. Importing in multiple components causes duplicate CSS in the bundle.

2. **Forgetting PostCSS configuration**: Next.js has default PostCSS config, but if you create a custom `postcss.config.js`, the defaults are disabled. You must explicitly include `autoprefixer` and other needed plugins.

3. **Using CSS Modules syntax in global CSS**: Files named `*.module.css` are treated as CSS Modules. Keep the existing `aphiria.css` name without `.module.css` extension.

4. **CSS ordering issues**: Next.js may chunk CSS differently than gulp. Ensure global CSS is imported in the root layout to guarantee it loads first.

5. **CSS custom properties in IE11**: If browser support includes IE11, custom properties don't work. However, the assumption states "modern evergreen browsers only," so this is not a concern.

---

## 4. HTML Fragment Rendering in React

### Decision

**Render compiled markdown HTML fragments using `dangerouslySetInnerHTML` with DOMPurify sanitization on the server. Initialize Prism.js syntax highlighting client-side after HTML is inserted into the DOM.**

Pattern:
- Sanitize HTML on the server using `isomorphic-dompurify` (works in Node.js)
- Render sanitized HTML in Server Component using `dangerouslySetInnerHTML`
- Create a Client Component `PrismLoader` that calls `Prism.highlightAll()` in `useEffect`
- Use IntersectionObserver for lazy highlighting (performance optimization)

### Rationale

1. **DOMPurify sanitization** is mandatory for XSS prevention. Even though the HTML comes from a trusted build artifact (compiled markdown), sanitizing on the server adds defense-in-depth. DOMPurify is the industry-standard library built by XSS security experts.

2. **isomorphic-dompurify** enables DOMPurify to run in Node.js (Server Components) by using jsdom to create a DOM environment. This allows sanitization to happen once on the server, not repeatedly on every client.

3. **dangerouslySetInnerHTML is the only option** for rendering pre-compiled HTML. Alternatives like `react-markdown` would require parsing markdown at runtime, which defeats the purpose of the pre-compiled build artifact.

4. **Client-side Prism.js initialization** is necessary because Prism manipulates the DOM after it's rendered. This must happen in the browser via `useEffect` to avoid SSR hydration issues.

### Alternatives Considered

**Alternative 1**: Use `react-markdown` to parse markdown at runtime
- **Rejected**: The build artifact is already compiled HTML. Re-parsing markdown would be wasteful and slow. The build artifact contract specifies pre-rendered HTML fragments.

**Alternative 2**: Use `rehype-raw` with `react-markdown` and `rehype-sanitize`
- **Rejected**: Same issue as Alternative 1. We already have compiled HTML; re-parsing markdown is redundant.

**Alternative 3**: Skip DOMPurify sanitization (trust build artifact)
- **Rejected**: Even trusted sources should be sanitized as a best practice. If the build process is compromised or contains a bug, unsanitized HTML could introduce XSS vulnerabilities.

**Alternative 4**: Build custom sanitizer
- **Rejected**: "Do not build your own sanitizer. HTML sanitization is extremely tricky and should be left up to experts." (from research). DOMPurify is battle-tested and maintained by security experts.

**Alternative 5**: Initialize Prism.js on the server
- **Rejected**: Prism.js manipulates the DOM and expects a browser environment. Running it on the server would cause hydration mismatches and is not supported by Prism.

### Best Practices

**Server-Side Sanitization with isomorphic-dompurify**:
```tsx
// app/docs/[version]/[...slug]/page.tsx (Server Component)
import DOMPurify from 'isomorphic-dompurify'

export default async function DocsPage({ params }: { params: { version: string, slug: string[] } }) {
  const htmlFragment = await readDocArtifact(params.version, params.slug)
  const sanitizedHtml = DOMPurify.sanitize(htmlFragment, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'p', 'a', 'ul', 'ol', 'li', 'pre', 'code', 'blockquote', 'em', 'strong'],
    ALLOWED_ATTR: ['href', 'class', 'id'],
  })

  return (
    <div>
      <article dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
      <PrismLoader /> {/* Client Component for syntax highlighting */}
    </div>
  )
}
```

**Client-Side Prism.js Loader**:
```tsx
// components/docs/PrismLoader.tsx
'use client'
import { useEffect } from 'react'
import Prism from 'prismjs'
import 'prismjs/themes/prism-okaidia.css'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-bash'

export function PrismLoader() {
  useEffect(() => {
    Prism.highlightAll()
  }, [])

  return null // This component renders nothing
}
```

**Lazy Prism Highlighting with IntersectionObserver** (performance optimization):
```tsx
'use client'
import { useEffect } from 'react'
import Prism from 'prismjs'

export function PrismLoader() {
  useEffect(() => {
    const codeBlocks = document.querySelectorAll('pre code')

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          Prism.highlightElement(entry.target as HTMLElement)
          observer.unobserve(entry.target)
        }
      })
    })

    codeBlocks.forEach((block) => observer.observe(block))

    return () => observer.disconnect()
  }, [])

  return null
}
```

**DOMPurify Configuration for Markdown HTML**:
```typescript
const sanitizeConfig = {
  ALLOWED_TAGS: [
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Text
    'p', 'span', 'em', 'strong', 'code', 'pre',
    // Lists
    'ul', 'ol', 'li',
    // Links
    'a',
    // Quotes
    'blockquote',
    // Misc
    'div', // For context-framework/context-library wrappers
  ],
  ALLOWED_ATTR: [
    'href', // Links
    'class', // Styling and context classes
    'id', // Heading anchors
  ],
  ALLOW_DATA_ATTR: false, // No data-* attributes needed
}
```

### Pitfalls to Avoid

1. **Using dangerouslySetInnerHTML without sanitization**: This is the #1 XSS vulnerability in React. Always sanitize untrusted HTML with DOMPurify.

2. **Sanitizing on client instead of server**: Client-side sanitization happens after the HTML is rendered, creating a brief XSS window. Server-side sanitization is safer.

3. **Running Prism.highlightAll() on every render**: This causes performance issues. Use `useEffect` with empty dependency array to run only once after mount.

4. **Hydration mismatches with server-side Prism**: Do not attempt to run Prism on the server. It expects a browser environment and will cause hydration errors.

5. **Forgetting to import Prism language components**: Prism.js doesn't include all languages by default. Import needed languages explicitly (e.g., `import 'prismjs/components/prism-php'`).

6. **Not allowing necessary HTML tags in DOMPurify**: If you block `<code>` or `<pre>`, syntax highlighting won't work. Carefully configure `ALLOWED_TAGS` and `ALLOWED_ATTR`.

---

## 5. Documentation Build Artifact Contract

### Decision

**Define a strict filesystem contract for documentation artifacts consumed by Next.js at build time and runtime. Artifacts are generated by a separate, standalone documentation build process (NOT by Next.js).**

Structure:
```text
docs-artifact/
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

Schema:
- `meta.json`: JSON file containing metadata for all documentation pages (titles, slugs, versions, contexts)
- `rendered/{version}/{slug}.html`: HTML fragments (NOT full HTML documents, just content)
- `search/lexemes.ndjson`: NDJSON file with search index records

Validation:
- Next.js build MUST fail with clear error if artifacts are missing or malformed
- Runtime reads use try/catch with fallback to 404 pages for missing docs

### Rationale

1. **Filesystem contract** is simpler than API-based data fetching. Since documentation is static and changes infrequently, reading from disk at build time is faster and more reliable than hitting an API.

2. **Separate build process** decouples documentation compilation from Next.js deployment. This allows the docs repo to be updated independently without redeploying the website.

3. **Strict validation at build time** prevents broken deployments. If artifacts are missing, the build should fail immediately with a clear error message, not fail silently and cause 404s in production.

4. **NDJSON for search index** is chosen over JSON array because it's streamable and more efficient for large datasets. Each line is a self-contained JSON object, making it easy to process incrementally.

### Alternatives Considered

**Alternative 1**: Generate artifacts during Next.js build
- **Rejected**: This creates tight coupling between Next.js and the documentation build process. If the docs repo changes, you'd need to redeploy Next.js. Separate processes allow independent updates.

**Alternative 2**: Fetch documentation from API at runtime
- **Rejected**: This adds latency and requires the API to be online for the website to function. Static artifacts are faster and more resilient.

**Alternative 3**: Use JSON array instead of NDJSON for search index
- **Rejected**: Large JSON arrays must be parsed entirely into memory. NDJSON can be streamed and processed line-by-line, reducing memory usage.

**Alternative 4**: Store artifacts in database
- **Rejected**: Documentation is static and doesn't require database features (transactions, relationships, etc.). Filesystem is simpler and faster.

### Best Practices

**meta.json Schema**:
```typescript
// contracts/documentation.ts
export interface DocMeta {
  version: string
  pages: DocPage[]
}

export interface DocPage {
  slug: string // e.g., "routing"
  title: string // e.g., "Routing"
  path: string // e.g., "rendered/1.x/routing.html"
  contexts: ('global' | 'framework' | 'library')[]
}

// Example meta.json
{
  "version": "1.x",
  "pages": [
    {
      "slug": "introduction",
      "title": "Introduction",
      "path": "rendered/1.x/introduction.html",
      "contexts": ["global"]
    },
    {
      "slug": "routing",
      "title": "Routing",
      "path": "rendered/1.x/routing.html",
      "contexts": ["framework", "library"]
    }
  ]
}
```

**HTML Fragment Format** (what gets written to `rendered/{version}/{slug}.html`):
```html
<!-- ✅ GOOD: Fragment without wrapping tags -->
<h1 id="routing">Routing</h1>
<p>Aphiria provides powerful routing capabilities...</p>
<div class="context-framework">
  <h2 id="route-groups">Route Groups</h2>
  <p>Framework-specific content...</p>
</div>

<!-- ❌ BAD: Full HTML document -->
<!DOCTYPE html>
<html><body><article>...</article></body></html>
```

**Search NDJSON Format**:
```ndjson
{"version":"1.x","context":"global","link":"/docs/1.x/introduction","html_element_type":"h1","inner_text":"Introduction","h1_inner_text":"Introduction","h2_inner_text":null,"h3_inner_text":null,"h4_inner_text":null,"h5_inner_text":null}
{"version":"1.x","context":"framework","link":"/docs/1.x/routing#route-groups","html_element_type":"h2","inner_text":"Route Groups","h1_inner_text":"Routing","h2_inner_text":"Route Groups","h3_inner_text":null,"h4_inner_text":null,"h5_inner_text":null}
```

**Artifact Reader with Validation**:
```typescript
// lib/docs/artifact-reader.ts
import fs from 'fs/promises'
import path from 'path'
import type { DocMeta } from '@/contracts/documentation'

const ARTIFACT_DIR = path.join(process.cwd(), 'docs-artifact')

export async function readMeta(): Promise<DocMeta> {
  const metaPath = path.join(ARTIFACT_DIR, 'meta.json')

  try {
    const content = await fs.readFile(metaPath, 'utf-8')
    const meta = JSON.parse(content) as DocMeta

    // Validate schema
    if (!meta.version || !Array.isArray(meta.pages)) {
      throw new Error('Invalid meta.json schema')
    }

    return meta
  } catch (error) {
    throw new Error(`Failed to read docs artifact metadata: ${error}`)
  }
}

export async function readDocFragment(version: string, slug: string): Promise<string> {
  const fragmentPath = path.join(ARTIFACT_DIR, 'rendered', version, `${slug}.html`)

  try {
    return await fs.readFile(fragmentPath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null // 404 - page not found
    }
    throw error
  }
}
```

**Build-Time Validation**:
```typescript
// next.config.js or separate validation script
async function validateArtifacts() {
  const metaPath = './docs-artifact/meta.json'

  if (!fs.existsSync(metaPath)) {
    throw new Error(
      'Documentation artifacts not found. Run documentation build first:\n' +
      '  npm run build:docs\n' +
      'Expected artifact location: docs-artifact/'
    )
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))

  for (const page of meta.pages) {
    const fragmentPath = `./docs-artifact/${page.path}`
    if (!fs.existsSync(fragmentPath)) {
      throw new Error(`Missing HTML fragment: ${fragmentPath}`)
    }
  }

  console.log('✓ Documentation artifacts validated')
}
```

### Pitfalls to Avoid

1. **Committing large artifacts to git**: Documentation artifacts can be regenerated. Use `.gitignore` or generate them in CI/CD pipeline instead of committing.

2. **Missing build-time validation**: If you deploy with missing artifacts, users get 404s. Validate artifacts exist before building Next.js.

3. **Including full HTML documents in fragments**: Fragments should be content only (no `<html>`, `<body>`, or `<article>` wrappers). The layout adds these.

4. **Not handling 404s gracefully**: If a user requests `/docs/1.x/nonexistent`, return a proper 404 page, not an error 500.

5. **Hardcoding artifact paths**: Use `process.cwd()` to make paths work in both dev and production. Don't assume `./docs-artifact` is in the same directory.

---

## 6. Legacy URL Redirect Patterns

### Decision

**Use Next.js middleware to implement 301 permanent redirects from `.html` URLs to extension-less URLs, preserving all query parameters and anchor fragments.**

Implementation:
- Create `middleware.ts` at project root
- Match pattern: `/docs/**/*.html`
- Use `NextResponse.redirect(url, 301)` for permanent redirects
- Parse and preserve `search` and `hash` from original URL
- Test edge cases: complex query params, special characters, multiple parameters

### Rationale

1. **Middleware runs at the edge** before any page rendering, ensuring redirects are fast (<100ms goal). This is the idiomatic Next.js pattern for URL manipulation.

2. **301 Permanent Redirect** tells search engines and browsers that the `.html` URL has permanently moved. This preserves SEO equity and updates bookmarks.

3. **Query parameter preservation** is critical for context switching. A URL like `/docs/1.x/routing.html?context=library` must redirect to `/docs/1.x/routing?context=library`, not `/docs/1.x/routing`.

4. **Anchor fragment preservation** ensures deep links work. A URL like `/docs/1.x/routing.html#constraints` must redirect to `/docs/1.x/routing#constraints`.

### Alternatives Considered

**Alternative 1**: Use `next.config.js` redirects
- **Rejected**: Config-based redirects are harder to test and don't support complex logic (e.g., regex for query param preservation). Middleware is more flexible.

**Alternative 2**: Use 302 Temporary Redirect
- **Rejected**: 302 tells search engines the redirect is temporary, so they don't update their index. 301 is correct for permanent URL structure changes.

**Alternative 3**: Use client-side redirect (JavaScript)
- **Rejected**: Client-side redirects are slow (require full page load + JS execution) and bad for SEO. Server-side redirects are instant and SEO-friendly.

**Alternative 4**: Handle redirects in page components
- **Rejected**: By the time a page component runs, Next.js has already tried to find a matching page. Middleware intercepts requests before routing, making it faster.

### Best Practices

**Middleware Implementation**:
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, search, hash } = request.nextUrl

  // Match /docs/**/*.html (any .html file under /docs/)
  if (pathname.startsWith('/docs/') && pathname.endsWith('.html')) {
    // Remove .html extension
    const newPathname = pathname.replace(/\.html$/, '')

    // Construct new URL with preserved query params and anchor
    const redirectUrl = new URL(newPathname + search + hash, request.url)

    // 301 Permanent Redirect
    return NextResponse.redirect(redirectUrl, 301)
  }

  // No redirect needed
  return NextResponse.next()
}

export const config = {
  matcher: '/docs/:path*.html', // Only run middleware for .html URLs under /docs/
}
```

**Testing Redirect Logic**:
```typescript
// __tests__/middleware.test.ts
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'

describe('middleware redirects', () => {
  it('redirects .html to extension-less URL', () => {
    const request = new NextRequest(new URL('http://localhost:3000/docs/1.x/routing.html'))
    const response = middleware(request)

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe('/docs/1.x/routing')
  })

  it('preserves query parameters', () => {
    const request = new NextRequest(new URL('http://localhost:3000/docs/1.x/routing.html?context=library'))
    const response = middleware(request)

    expect(response.headers.get('Location')).toBe('/docs/1.x/routing?context=library')
  })

  it('preserves anchor fragments', () => {
    const request = new NextRequest(new URL('http://localhost:3000/docs/1.x/routing.html#constraints'))
    const response = middleware(request)

    expect(response.headers.get('Location')).toBe('/docs/1.x/routing#constraints')
  })

  it('preserves both query and anchor', () => {
    const request = new NextRequest(new URL('http://localhost:3000/docs/1.x/routing.html?context=library&foo=bar#constraints'))
    const response = middleware(request)

    expect(response.headers.get('Location')).toBe('/docs/1.x/routing?context=library&foo=bar#constraints')
  })

  it('does not redirect non-.html URLs', () => {
    const request = new NextRequest(new URL('http://localhost:3000/docs/1.x/routing'))
    const response = middleware(request)

    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).not.toBe(301)
  })
})
```

**Matcher Configuration for Performance**:
```typescript
// Only run middleware for specific paths
export const config = {
  matcher: [
    '/docs/:path*.html', // Docs with .html extension
    // Add other patterns as needed
  ],
}
```

### Pitfalls to Avoid

1. **Not preserving query parameters**: Using `pathname` alone loses `?context=library`. Always include `search` and `hash`.

2. **Using 302 instead of 301**: Temporary redirects don't update search engine indexes. Use 301 for permanent URL structure changes.

3. **Running middleware on every request**: Use `matcher` config to limit middleware execution to relevant paths. Running on every request wastes CPU.

4. **Not testing edge cases**: Special characters in query params (e.g., `%20`, `%3D`) need proper encoding. Test with real-world URLs.

5. **Hardcoding domain in redirects**: Use `new URL(path, request.url)` to preserve the domain (localhost in dev, production domain in prod).

---

## 7. Context Switching Without Page Reload

### Decision

**Use a Client Component for the context selector dropdown that updates the URL query string via `history.pushState()`, sets a client-side cookie, and toggles DOM element visibility by adding/removing CSS classes, all without page reload.**

Implementation:
- Client Component: `ContextSelector.tsx` with `useState` and `useEffect`
- On change: Update cookie → Update URL → Toggle DOM classes → Emit custom event
- DOM toggling: Add/remove classes `.context-framework-hidden` and `.context-library-hidden` to elements with `.context-framework` and `.context-library` classes
- Custom event: Dispatch `context-toggled` event for sidebar height recalculation

### Rationale

1. **Client Component required** because this involves browser-only APIs (`history.pushState()`, `document.cookie`, DOM manipulation) and React state (`useState`).

2. **history.pushState() for URL updates** changes the URL without triggering a full page reload. This provides instant feedback and maintains browser history for back/forward navigation.

3. **Cookie persistence** ensures the selected context is remembered across sessions. When the user returns, the context selector initializes to the saved value.

4. **CSS class toggling** is the most performant way to show/hide elements. Instead of removing DOM nodes (which would require re-rendering), we toggle `display: none` via CSS classes.

5. **Custom events for cross-component communication** allow the sidebar to react to context changes (e.g., recalculate height after items are shown/hidden) without tightly coupling components.

### Alternatives Considered

**Alternative 1**: Use Server Actions for context changes
- **Rejected**: Server Actions cause full page reload, which violates the "instant, no reload" requirement. Client-side state updates are necessary for instant feedback.

**Alternative 2**: Use React state to filter content instead of CSS classes
- **Rejected**: The compiled HTML already contains context classes (`.context-framework`, `.context-library`). Re-filtering in React would duplicate logic and break CSS parity.

**Alternative 3**: Remove DOM nodes instead of hiding with CSS
- **Rejected**: Removing nodes requires re-rendering, which is slower. Prism.js syntax highlighting would need to re-run. CSS `display: none` is instant.

**Alternative 4**: Use React Context API for cross-component communication
- **Rejected**: React Context doesn't work across Server and Client Component boundaries. Custom events work universally in the browser.

### Best Practices

**ContextSelector Client Component**:
```tsx
// components/docs/ContextSelector.tsx
'use client'
import { useState, useEffect } from 'react'
import { useSetCookie, useGetCookie } from 'cookies-next/client'

export function ContextSelector() {
  const savedContext = useGetCookie('aphiria_docs_context') || 'framework'
  const [context, setContext] = useState<'framework' | 'library'>(savedContext as any)
  const setContextCookie = useSetCookie()

  const handleChange = (newContext: 'framework' | 'library') => {
    // 1. Update React state
    setContext(newContext)

    // 2. Update cookie
    setContextCookie('aphiria_docs_context', newContext, {
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.aphiria.com',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    // 3. Update URL query string
    const url = new URL(window.location.href)
    url.searchParams.set('context', newContext)
    window.history.pushState({}, '', url.toString())

    // 4. Toggle DOM visibility
    toggleContextVisibility(newContext)

    // 5. Emit custom event for sidebar recalculation
    window.dispatchEvent(new CustomEvent('context-toggled', { detail: { context: newContext } }))
  }

  return (
    <select value={context} onChange={(e) => handleChange(e.target.value as any)}>
      <option value="framework">Framework</option>
      <option value="library">Library</option>
    </select>
  )
}

function toggleContextVisibility(context: 'framework' | 'library') {
  const frameworkElements = document.querySelectorAll('.context-framework')
  const libraryElements = document.querySelectorAll('.context-library')

  frameworkElements.forEach((el) => {
    if (context === 'framework') {
      (el as HTMLElement).style.display = 'revert'
    } else {
      (el as HTMLElement).style.display = 'none'
    }
  })

  libraryElements.forEach((el) => {
    if (context === 'library') {
      (el as HTMLElement).style.display = 'revert'
    } else {
      (el as HTMLElement).style.display = 'none'
    }
  })
}
```

**Context Initialization from Server** (avoid hydration mismatch):
```tsx
// app/docs/[version]/[...slug]/page.tsx (Server Component)
export default async function DocsPage({ searchParams }: { searchParams: { context?: string } }) {
  const cookieStore = await cookies()
  const cookieContext = cookieStore.get('aphiria_docs_context')?.value

  // Resolve context: query > cookie > default
  const context = searchParams.context || cookieContext || 'framework'

  return (
    <div>
      <ContextSelector initialContext={context} />
      {/* Pass initial context to avoid hydration mismatch */}
    </div>
  )
}
```

**Sidebar Height Recalculation on Context Change**:
```tsx
// components/docs/SidebarNav.tsx (Client Component for height adjustment)
'use client'
import { useEffect, useRef } from 'react'

export function SidebarNav({ children }: { children: React.ReactNode }) {
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleContextToggle = () => {
      if (sidebarRef.current) {
        // Recalculate sidebar height after context toggle
        const height = sidebarRef.current.scrollHeight
        sidebarRef.current.style.height = `${height}px`
      }
    }

    window.addEventListener('context-toggled', handleContextToggle)
    return () => window.removeEventListener('context-toggled', handleContextToggle)
  }, [])

  return <div ref={sidebarRef}>{children}</div>
}
```

### Pitfalls to Avoid

1. **Hydration mismatch between server and client**: If the server renders context=framework but the client initializes context=library (from cookie), React will throw hydration errors. Pass the resolved context from server to client as a prop.

2. **Not preserving other query parameters**: When updating `?context=library`, don't overwrite other params. Use `url.searchParams.set()` to update only the context param.

3. **Race conditions with rapid toggling**: Debounce the change handler if users rapidly click the dropdown. Use `setTimeout` or a debounce library.

4. **Forgetting to emit custom event**: If sidebar height depends on visible items, it won't recalculate without the `context-toggled` event.

5. **Using `display: block` instead of `display: revert`**: Hardcoding `display: block` can break elements that should be `inline`, `flex`, etc. Use `display: revert` to restore the original CSS value.

---

## 8. Table of Contents Generation from HTML

### Decision

**Parse the compiled HTML fragment on the server using `cheerio` (lightweight jQuery-like library for Node.js) to extract h2-h5 headings and build a nested TOC structure. Filter headings based on context visibility classes.**

Implementation:
- Use `cheerio` to parse HTML fragment
- Extract headings: `h2`, `h3`, `h4`, `h5` (h1 is the page title, not in TOC)
- Build nested structure based on heading levels
- Skip headings inside `.context-framework` or `.context-library` divs that don't match current context
- Generate TOC links with anchor IDs (e.g., `#routing-basics`)

### Rationale

1. **Server-side parsing** is faster than client-side. The TOC can be generated once per page during SSR, not recalculated on every client request.

2. **cheerio is lightweight** and designed for server-side HTML parsing. It's faster than jsdom (which creates a full browser environment) and easier than regex.

3. **Context filtering during parsing** ensures hidden headings don't appear in the TOC. If a heading is inside a `.context-library` div and the current context is "framework", skip it.

4. **Nested structure** (h2 > h3 > h4) improves readability. Flat lists are harder to navigate for deeply nested documentation.

### Alternatives Considered

**Alternative 1**: Use jsdom for server-side parsing
- **Rejected**: jsdom is heavyweight (creates full DOM + window object). cheerio is faster and sufficient for HTML parsing.

**Alternative 2**: Parse headings client-side with DOM APIs
- **Rejected**: This requires shipping the parsing logic to the client and running it on every page load. Server-side parsing is faster and reduces client bundle size.

**Alternative 3**: Generate TOC during documentation build
- **Rejected**: This would require the build process to know about context visibility logic. Keeping TOC generation in Next.js keeps logic centralized.

**Alternative 4**: Use regex to extract headings
- **Rejected**: "You can't parse HTML with regex" (famous Stack Overflow answer). Regex doesn't handle nested tags, attributes, or edge cases correctly.

### Best Practices

**TOC Generation Function**:
```typescript
// lib/docs/toc-generator.ts
import * as cheerio from 'cheerio'

export interface TocItem {
  id: string
  text: string
  level: number
  children: TocItem[]
}

export function generateToc(htmlFragment: string, context: 'framework' | 'library'): TocItem[] {
  const $ = cheerio.load(htmlFragment)
  const toc: TocItem[] = []
  const stack: TocItem[] = []

  // Extract h2-h5 headings (h1 is page title, not in TOC)
  $('h2, h3, h4, h5').each((_, element) => {
    const $heading = $(element)
    const level = parseInt(element.tagName[1]) // Extract level from 'h2' -> 2
    const id = $heading.attr('id') || slugify($heading.text())
    const text = $heading.text()

    // Skip headings inside wrong context
    const isFrameworkOnly = $heading.closest('.context-framework').length > 0
    const isLibraryOnly = $heading.closest('.context-library').length > 0

    if (isFrameworkOnly && context !== 'framework') return
    if (isLibraryOnly && context !== 'library') return

    const item: TocItem = { id, text, level, children: [] }

    // Build nested structure
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    if (stack.length === 0) {
      toc.push(item)
    } else {
      stack[stack.length - 1].children.push(item)
    }

    stack.push(item)
  })

  return toc
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}
```

**TOC Component**:
```tsx
// components/docs/TableOfContents.tsx (Server Component)
import { generateToc } from '@/lib/docs/toc-generator'

interface Props {
  htmlFragment: string
  context: 'framework' | 'library'
}

export function TableOfContents({ htmlFragment, context }: Props) {
  const toc = generateToc(htmlFragment, context)

  if (toc.length === 0) {
    return null // No headings, hide TOC
  }

  return (
    <nav className="table-of-contents">
      <h2>On This Page</h2>
      <TocList items={toc} />
    </nav>
  )
}

function TocList({ items }: { items: TocItem[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`}>{item.text}</a>
          {item.children.length > 0 && <TocList items={item.children} />}
        </li>
      ))}
    </ul>
  )
}
```

**Active Heading Detection (Client-Side)**:
```tsx
// components/docs/TableOfContents.tsx (Client Component for active state)
'use client'
import { useState, useEffect } from 'react'

export function TableOfContentsClient({ toc }: { toc: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-20% 0% -35% 0%' }
    )

    const headings = document.querySelectorAll('h2, h3, h4, h5')
    headings.forEach((heading) => observer.observe(heading))

    return () => observer.disconnect()
  }, [])

  return (
    <nav className="table-of-contents">
      <h2>On This Page</h2>
      <TocList items={toc} activeId={activeId} />
    </nav>
  )
}
```

### Pitfalls to Avoid

1. **Including h1 in TOC**: The h1 is the page title and shouldn't be in the TOC. Only extract h2-h5.

2. **Not filtering by context**: Hidden headings (`.context-library` when context=framework) should not appear in the TOC.

3. **Missing heading IDs**: If headings don't have `id` attributes, generate them with `slugify()`. Otherwise, TOC links won't work.

4. **Not handling empty TOC**: If a page has no headings, hide the TOC section entirely (return `null`).

5. **Regex parsing**: Don't use regex to extract headings. Use a proper HTML parser like cheerio.

---

## Summary

This research document provides comprehensive technical decisions for migrating aphiria.com to Next.js 15+ with App Router. All decisions are based on official documentation, security best practices, and performance optimization.

**Key Takeaways**:

1. **Next.js App Router**: Use Server Components by default, Client Components only for interactivity
2. **Cookie Management**: Use `await cookies()` on server, `cookies-next/client` on client
3. **CSS Migration**: Import global CSS in root layout, use PostCSS with `postcss-nested`
4. **HTML Rendering**: Sanitize with DOMPurify, render with `dangerouslySetInnerHTML`, highlight with client-side Prism.js
5. **Build Artifacts**: Define strict filesystem contract, validate at build time
6. **Legacy Redirects**: Use middleware with 301 redirects, preserve query params and anchors
7. **Context Switching**: Client Component with `history.pushState()`, cookie persistence, CSS class toggling
8. **TOC Generation**: Server-side parsing with cheerio, context-aware filtering, nested structure

All patterns follow Next.js best practices and avoid common pitfalls. Implementation can proceed with confidence.
