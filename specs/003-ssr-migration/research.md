# Research Findings: SSR Migration

**Date**: 2026-01-22
**Feature**: SSR Migration (003-ssr-migration)
**Phase**: Phase 0 - Research & Technical Decisions

---

## Research Task 1: Next.js Standalone Build Output Structure

### Decision: Use Next.js 16 `output: "standalone"` mode

**What Gets Generated:**
- `.next/standalone/` directory containing:
  - `server.js` - Minimal Node.js HTTP server entry point
  - Traced `node_modules/` - Only required runtime dependencies
  - Application code - Compiled Next.js application
- `.next/static/` - Built static assets (JS, CSS, hashed files)
- `public/` - User static files (NOT included in standalone by default)

**Startup Command:**
```bash
node server.js
```

**Required Environment Variables:**
- `NODE_ENV=production` - Enables production optimizations
- `PORT=3000` - Port to listen on (default)
- `HOSTNAME=0.0.0.0` - Bind to all interfaces (required for Docker/Kubernetes)
- `NEXT_TELEMETRY_DISABLED=1` - Optional, disables telemetry

**Critical Finding:**
Standalone mode does NOT automatically copy `public/` or `.next/static/` directories. These must be manually copied in the Dockerfile.

**Rationale:**
Next.js standalone mode reduces Docker image size from 500MB-2GB to ~100-200MB by including only traced dependencies and necessary files. Perfect for containerized deployments.

**Alternatives Considered:**
- **Static Export (`output: "export"`)** - Current approach, but lacks SSR capabilities
- **Standard Build (`next start`)** - Includes full node_modules, creates unnecessarily large images

**Sources:**
- Next.js official documentation: https://nextjs.org/docs/app/building-your-application/deploying#docker-image
- Next.js with-docker example: https://github.com/vercel/next.js/tree/canary/examples/with-docker

---

## Research Task 2: Server-Side Cookie Reading in Next.js App Router

### Decision: Use `cookies()` API from `next/headers` in Server Components

**API Usage:**
```typescript
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();  // Async in Next.js 15+
  const theme = cookieStore.get('theme')?.value ?? 'light';
  return <div>Theme: {theme}</div>;
}
```

**TypeScript Types:**
```typescript
interface RequestCookie {
  name: string;
  value: string;
}

interface ReadonlyRequestCookies {
  get(name: string): RequestCookie | undefined;
  getAll(name?: string): RequestCookie[];
  has(name: string): boolean;
  size: number;
}
```

**Critical Finding:**
In Next.js 15+, `cookies()` is **asynchronous** and returns a Promise. Must use `await cookies()`.

**Error Handling Pattern:**
```typescript
const cookieStore = await cookies();
const context = cookieStore.get('context')?.value ?? 'framework';  // Default fallback
```

**Validation Pattern:**
```typescript
const contextCookie = cookieStore.get('context')?.value;
if (contextCookie === 'framework' || contextCookie === 'library') {
  return contextCookie;
}
return 'framework';  // Invalid values default to framework
```

**Rationale:**
Server-side cookie reading eliminates client-side hydration mismatches by resolving context before rendering HTML. This is the primary driver for SSR migration.

**Alternatives Considered:**
- **Client-side cookie reading** - Current approach, causes flicker due to hydration mismatch
- **Middleware cookie reading** - More complex, unnecessary for this use case

**Sources:**
- Next.js cookies() documentation: https://nextjs.org/docs/app/api-reference/functions/cookies
- Server Components data fetching guide

---

## Research Task 3: Next.js Runtime Environment Variables

### Decision: Use direct environment variables, NOT `NEXT_PUBLIC_*` prefix

**Critical Finding:**
`NEXT_PUBLIC_*` variables are **frozen at build time** (inlined into JavaScript bundle). This violates the requirement to use the same Docker image across environments.

**Server-Only Variables (Recommended):**
```typescript
// Server Component or API Route
const apiUri = process.env.API_URI;  // Runtime value, not frozen
const cookieDomain = process.env.COOKIE_DOMAIN;
```

**Client-Accessible Variables (Avoid):**
```typescript
// ❌ BAD: Frozen at build time, can't change per environment
const apiUri = process.env.NEXT_PUBLIC_API_URI;
```

**Solution for Client Components:**
Use Server Components to pass runtime config as props, or create an API route that returns configuration.

**Pattern for Client Components:**
```typescript
// Server Component (page)
export default async function Page() {
  const config = {
    apiUri: process.env.API_URI,
    cookieDomain: process.env.COOKIE_DOMAIN,
  };
  return <ClientComponent config={config} />;
}

// Client Component receives config as prop
"use client";
export function ClientComponent({ config }: { config: RuntimeConfig }) {
  // Use config.apiUri, config.cookieDomain
}
```

**Rationale:**
Runtime environment variables allow the same Docker image to be deployed to local, preview, and production with different configurations injected by Kubernetes.

**Alternatives Considered:**
- **NEXT_PUBLIC_* variables** - Rejected due to build-time freezing
- **ConfigMap with window object** - Current approach, works but adds complexity
- **Server Components passing props** - Selected approach, cleanest pattern

**Sources:**
- Next.js environment variables: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
- 12-factor app configuration principles

---

## Research Task 4: Pulumi Kubernetes Environment Variables

### Decision: Use direct `env` array in Container spec for simple cases, ConfigMap for complex cases

**Direct `env` Array Pattern:**
```typescript
containers: [{
  name: "web",
  image: args.image,
  env: [
    { name: "NODE_ENV", value: "production" },
    { name: "API_URI", value: args.apiUri },
    { name: "COOKIE_DOMAIN", value: args.cookieDomain },
  ],
}]
```

**ConfigMap Pattern (for many variables):**
```typescript
const configMap = new k8s.core.v1.ConfigMap("web-config", {
  metadata: { name: "web-config", namespace: args.namespace },
  data: {
    NODE_ENV: "production",
    API_URI: args.apiUri,
    COOKIE_DOMAIN: args.cookieDomain,
  },
});

containers: [{
  envFrom: [{ configMapRef: { name: configMap.metadata.name } }],
}]
```

**TypeScript Type:**
```typescript
import * as k8s from "@pulumi/kubernetes";

const envVars: k8s.types.input.core.v1.EnvVar[] = [
  { name: "VAR_NAME", value: "value" },
];
```

**Rationale:**
Direct `env` array is simpler for SSR migration (only 3-4 environment variables). ConfigMap is better when you have 6+ variables or need to share config across containers.

**Existing Codebase Pattern:**
Current implementation uses ConfigMap for runtime config (apiUri, cookieDomain). This pattern works well and should be adapted for Node.js environment variables.

**Alternatives Considered:**
- **Secrets for non-sensitive data** - Rejected, Secrets should only contain sensitive data
- **ConfigMap mounted as files** - Current approach for `config.js`, will be replaced with env vars

**Sources:**
- Pulumi Kubernetes Container documentation
- Existing codebase: `infrastructure/pulumi/src/components/api-deployment.ts`

---

## Research Task 5: Node.js Container Resource Limits

### Decision: Request 100m CPU / 256Mi memory, limit 250m CPU / 512Mi memory

**Recommended Configuration:**
```yaml
resources:
  requests:
    cpu: 100m       # 0.1 CPU cores
    memory: 256Mi   # 256 MiB
  limits:
    cpu: 250m       # 0.25 CPU cores
    memory: 512Mi   # 512 MiB
```

**Node.js Memory Configuration:**
```yaml
env:
  - name: NODE_OPTIONS
    value: "--max-old-space-size=409"  # 80% of 512MB limit
```

**Health Checks:**
```yaml
livenessProbe:
  httpGet:
    path: /
    port: 3000
  initialDelaySeconds: 30   # Next.js startup time
  periodSeconds: 15
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

**Comparison to Current nginx Configuration:**
| Resource | nginx (Current) | Next.js SSR (Recommended) | Multiplier |
|----------|----------------|---------------------------|------------|
| CPU Request | 50m | 100m | 2x |
| CPU Limit | 100m | 250m | 2.5x |
| Memory Request | 64Mi | 256Mi | 4x |
| Memory Limit | 128Mi | 512Mi | 4x |
| Liveness Delay | 10s | 30s | 3x |

**Rationale:**
Next.js SSR requires significantly more resources than static nginx serving because it renders React components on every request. Memory is the most critical constraint (4x increase needed).

**Alternatives Considered:**
- **512Mi / 1Gi** - More conservative, may be needed for high traffic
- **Match nginx limits** - Rejected, insufficient for Node.js runtime

**Sources:**
- Next.js production deployment guides
- Kubernetes best practices documentation
- Community case studies (OOM issues, performance benchmarks)

---

## Research Task 6: Docker Multi-Stage Build for Next.js Standalone

### Decision: Use official Next.js multi-stage Dockerfile pattern

**Complete Dockerfile:**
```dockerfile
FROM node:20-alpine AS base

# Stage 1: Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Runtime
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder
COPY --from=builder /app/public ./public

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

**Three Critical Copy Commands:**
1. `public/` → User static files
2. `.next/standalone/` → Server code and dependencies
3. `.next/static/` → Built static assets

**Security:**
- Non-root user (`nextjs:nodejs` with UID/GID 1001)
- File ownership set with `--chown` flag
- Alpine Linux base for minimal attack surface

**Rationale:**
This is the official pattern recommended by Next.js team and Vercel. Multi-stage build keeps final image size minimal (~100-200MB vs 500MB-2GB).

**Alternatives Considered:**
- **Single-stage build** - Rejected, includes dev dependencies in production image
- **Different base image** - `node:20-alpine` selected for size and security

**Sources:**
- Next.js Docker documentation: https://nextjs.org/docs/app/building-your-application/deploying#docker-image
- Official example: https://github.com/vercel/next.js/tree/canary/examples/with-docker

---

## Research Task 7: Vitest Testing for Next.js SSR

### Decision: Continue using Vitest for utilities and Client Components, use E2E for async Server Components

**Key Finding:**
Vitest does NOT officially support async React Server Components. Next.js team recommends E2E tests (Playwright) for async Server Components.

**Testing Strategy:**
1. **Client Components** (`"use client"`) - Vitest + React Testing Library (current approach)
2. **Server-side utilities** - Vitest with mocked `next/headers` APIs
3. **Async Server Components** - Playwright E2E tests
4. **Page routes** - Excluded from coverage, tested via E2E

**Mock Pattern for `cookies()`:**
```typescript
import { vi } from "vitest";

const mockGet = vi.fn();
const mockCookies = vi.fn().mockResolvedValue({ get: mockGet });

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

// Import AFTER mock
const { getContextCookie } = await import("@/lib/cookies/context-cookie.server");

describe("getContextCookie", () => {
  it("returns context from cookie", async () => {
    mockGet.mockReturnValue({ value: "framework" });
    expect(await getContextCookie()).toBe("framework");
  });
});
```

**Coverage Strategy:**
- Maintain 100% coverage for utilities and Client Components
- Exclude `page.tsx` and `layout.tsx` from coverage (tested via E2E)
- Extract business logic into testable utility functions

**Rationale:**
Current testing approach already follows Next.js recommendations. No significant changes needed beyond mocking `cookies()` for server-side utilities.

**Alternatives Considered:**
- **Testing async Server Components with Vitest** - Not officially supported, fragile
- **Testing page routes directly** - Unnecessary, E2E tests provide better coverage

**Sources:**
- Next.js testing with Vitest: https://nextjs.org/docs/app/guides/testing/vitest
- React Testing Library Server Components discussion

---

## Research Task 8: Playwright E2E Compatibility with SSR

### Decision: Existing Playwright tests should work without modification

**Key Finding:**
Playwright tests the **final rendered output in the browser**, not the rendering method. Both SSG and SSR ultimately produce HTML that the browser renders. Tests typically don't care about the difference.

**Hydration Timing Considerations:**
SSR pages go through hydration:
1. Server sends static HTML (fast)
2. Browser displays HTML (Playwright sees elements)
3. JavaScript loads and hydrates (event handlers attach)
4. Page becomes fully interactive

**Why Current Tests Already Handle This:**
- Auto-waiting performs actionability checks before actions
- Smart assertions (`.toBeVisible()`, `.toHaveText()`) retry automatically
- No hard-coded `waitForTimeout` usage
- Navigation uses `waitUntil: "load"` (correct for SSR)

**Expected Outcome:**
Tests should pass without changes. Your test patterns already follow 2025 best practices for SSR testing.

**Potential Issues (Low Probability):**
1. **Hydration timing** - Clicks before event handlers attached
   - **Solution:** Add `body.hydrated` class after hydration, wait for it in tests (only if needed)
2. **Server startup** - Tests run before SSR server ready
   - **Solution:** Already handled via `SITE_BASE_URL` environment variable

**Rationale:**
Well-written Playwright tests using modern patterns (auto-waiting, smart assertions, Page Object Model) automatically handle SSR via built-in retry mechanisms.

**Alternatives Considered:**
- **Rewrite tests for SSR** - Not necessary, existing patterns are correct
- **Add hydration-specific waits** - Only needed if flakiness observed

**Sources:**
- Playwright documentation on auto-waiting
- GitHub issues discussing SSR testing patterns
- Next.js testing guides

---

## Summary of Key Decisions

| Research Area | Decision | Impact |
|---------------|----------|--------|
| **Build Output** | Use `output: "standalone"` | Reduces image size to ~100-200MB |
| **Cookie Reading** | Use `await cookies()` in Server Components | Eliminates hydration flicker |
| **Environment Variables** | Use direct env vars, NOT `NEXT_PUBLIC_*` | Enables runtime configuration |
| **Pulumi Config** | Use `env` array in Container spec | Simple, explicit configuration |
| **Resource Limits** | 100m/256Mi requests, 250m/512Mi limits | 2-4x increase vs nginx |
| **Docker Build** | Multi-stage with 3 copy commands | Official Next.js pattern |
| **Unit Testing** | Vitest for utilities, E2E for async components | Maintains 100% coverage |
| **E2E Testing** | No changes needed | Auto-waiting handles SSR |

---

## Implementation Readiness

All research tasks complete. Ready to proceed to Phase 1 (Design & Contracts).

**Next Steps:**
1. Generate data model for entities (Context Preference, Runtime Configuration, Environment)
2. Document internal interfaces (ContextResolver, ConfigProvider)
3. Create quickstart guide for developers
4. Update agent context with Next.js standalone patterns

**No blockers identified.**
