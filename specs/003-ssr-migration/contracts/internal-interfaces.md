# Internal Interfaces: SSR Migration

**Feature**: SSR Migration (003-ssr-migration)
**Date**: 2026-01-22
**Phase**: Phase 1 - Design

---

## Overview

This document defines the internal TypeScript interfaces for SSR migration components. These interfaces represent contracts between different parts of the application, ensuring type safety and clear boundaries.

**Note**: These are internal application interfaces, not external API contracts.

---

## Interface 1: ContextResolver

### Purpose
Resolves the user's context preference from multiple sources (cookies, URL parameters, defaults) with proper precedence.

### Interface Definition

```typescript
interface ContextResolver {
  /**
   * Resolves user's context preference from cookies, URL params, or default
   * Called server-side during page rendering
   *
   * Precedence: URL param > Cookie > Default
   *
   * @param cookies - Read-only cookie store from next/headers
   * @param searchParams - URL search parameters
   * @returns Validated context value ("framework" or "library")
   */
  resolveContext(
    cookies: ReadonlyRequestCookies,
    searchParams: URLSearchParams
  ): Promise<Context>;
}
```

### Type Dependencies

```typescript
type Context = "framework" | "library";

// From next/headers
interface ReadonlyRequestCookies {
  get(name: string): RequestCookie | undefined;
  getAll(name?: string): RequestCookie[];
  has(name: string): boolean;
  size: number;
}

interface RequestCookie {
  name: string;
  value: string;
}
```

### Expected Behavior

1. Check URL search params for `?context=` parameter
2. If valid context in URL, return it (and set cookie for persistence)
3. If no URL param, check cookie named `"context"`
4. If valid context in cookie, return it
5. If neither present or invalid, return `"framework"` (default)

### Usage Example

```typescript
// In Server Component
import { cookies } from 'next/headers';

export default async function DocsPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const urlParams = new URLSearchParams(searchParams);

  const context = await contextResolver.resolveContext(cookieStore, urlParams);

  return <DocContent context={context} />;
}
```

---

## Interface 2: RuntimeConfig

### Purpose
Defines the shape of environment-specific configuration that changes between deployments.

### Interface Definition

```typescript
interface RuntimeConfig {
  /**
   * Base URL of the API backend
   * @example "https://api.aphiria.com" (production)
   * @example "http://api.local.aphiria.com" (local)
   */
  apiUri: string;

  /**
   * Domain to use when setting cookies
   * @example "aphiria.com" (production)
   * @example "localhost" (local)
   */
  cookieDomain: string;
}
```

### Validation Rules

```typescript
/**
 * Validates runtime configuration
 * @throws Error if configuration is invalid
 */
function validateRuntimeConfig(config: unknown): asserts config is RuntimeConfig {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Runtime config must be an object');
  }

  const { apiUri, cookieDomain } = config as Record<string, unknown>;

  if (typeof apiUri !== 'string' || !apiUri.startsWith('http')) {
    throw new Error('apiUri must be a valid HTTP(S) URL');
  }

  if (typeof cookieDomain !== 'string' || cookieDomain.length === 0) {
    throw new Error('cookieDomain must be a non-empty string');
  }
}
```

---

## Interface 3: ServerConfigProvider

### Purpose
Provides server-side access to runtime configuration from environment variables.

### Interface Definition

```typescript
interface ServerConfigProvider {
  /**
   * Reads runtime configuration from environment variables
   * Called server-side during Server Component rendering or API routes
   *
   * Environment variables:
   * - API_URI: URL of the API backend
   * - COOKIE_DOMAIN: Domain for setting cookies
   *
   * @returns Runtime configuration with defaults for missing values
   */
  getConfig(): RuntimeConfig;
}
```

### Implementation Contract

```typescript
class ServerConfigProviderImpl implements ServerConfigProvider {
  getConfig(): RuntimeConfig {
    return {
      apiUri: process.env.API_URI || "http://localhost:8080",
      cookieDomain: process.env.COOKIE_DOMAIN || "localhost",
    };
  }
}
```

### Usage Example

```typescript
// In Server Component or API Route
import { serverConfigProvider } from '@/lib/config/server-config';

export default async function Page() {
  const config = serverConfigProvider.getConfig();

  // Pass to Client Component as prop
  return <ClientComponent config={config} />;
}
```

---

## Interface 4: ClientConfigProvider

### Purpose
Provides client-side access to runtime configuration (passed from server).

### Interface Definition

```typescript
interface ClientConfigProvider {
  /**
   * Reads runtime configuration from props passed by Server Component
   * Called client-side during component initialization
   *
   * @param props - Props containing config from server
   * @returns Runtime configuration
   */
  getConfig(props: { config: RuntimeConfig }): RuntimeConfig;
}
```

### Implementation Contract

```typescript
class ClientConfigProviderImpl implements ClientConfigProvider {
  getConfig(props: { config: RuntimeConfig }): RuntimeConfig {
    // Validate config received from server
    if (!props.config?.apiUri || !props.config?.cookieDomain) {
      throw new Error('Invalid runtime config received from server');
    }
    return props.config;
  }
}
```

### Usage Example

```typescript
"use client";

interface ClientComponentProps {
  config: RuntimeConfig;
}

export function ClientComponent({ config }: ClientComponentProps) {
  const { apiUri, cookieDomain } = config;

  async function fetchData() {
    const response = await fetch(`${apiUri}/docs/search?q=routing`);
    return response.json();
  }

  // ...
}
```

---

## Interface 5: ContextSelectorProps

### Purpose
Defines the props contract for the ContextSelector Client Component.

### Interface Definition

```typescript
interface ContextSelectorProps {
  /**
   * Initial context value resolved server-side
   * Eliminates hydration mismatch by matching server state
   *
   * This value should come from cookies/URL params resolved on the server
   * to ensure the client-side select matches what the server rendered
   *
   * @example "framework" (default)
   * @example "library" (user preference)
   */
  initialContext: Context;
}
```

### Component Signature

```typescript
"use client";

export function ContextSelector({ initialContext }: ContextSelectorProps): JSX.Element {
  const [context, setContext] = useState<Context>(initialContext);

  // Component implementation...

  return (
    <select value={context} onChange={handleChange}>
      <option value="framework">Framework</option>
      <option value="library">Library</option>
    </select>
  );
}
```

### Server Component Usage

```typescript
// Server Component passes server-resolved value
export default async function DocsPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const context = await resolveContext(cookieStore, searchParams);

  return (
    <Layout>
      <ContextSelector initialContext={context} />
      <DocContent context={context} />
    </Layout>
  );
}
```

---

## Interface 6: DocPageProps

### Purpose
Defines the props contract for documentation page Server Components.

### Interface Definition

```typescript
interface DocPageProps {
  /**
   * Route parameters from Next.js App Router
   * Available as a Promise in Next.js 15+
   */
  params: Promise<{
    /** Documentation version (e.g., "1.x", "2.x") */
    version: string;
    /** Page slug (e.g., "introduction", "routing") */
    slug: string;
  }>;

  /**
   * URL search parameters
   * Available as a Promise or plain object depending on Next.js version
   *
   * @example { context: "library" }
   */
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}
```

### Component Signature

```typescript
export default async function DocsPage({ params, searchParams }: DocPageProps): Promise<JSX.Element> {
  // Await params (Next.js 15 requirement)
  const { version, slug } = await params;

  // Resolve search params
  const urlParams = new URLSearchParams(
    typeof searchParams === 'object' && 'then' in searchParams
      ? await searchParams
      : searchParams
  );

  // ...implementation
}
```

---

## Interface 7: PulumiWebComponentArgs

### Purpose
Defines the configuration interface for Pulumi's web deployment component.

### Interface Definition

```typescript
interface PulumiWebComponentArgs {
  /**
   * Docker image with full digest
   * @example "ghcr.io/aphiria/web@sha256:abc123..."
   */
  image: string;

  /**
   * Number of replica pods to run
   * @minimum 1
   * @example 1 (local/preview), 2 (production)
   */
  replicas: number;

  /**
   * API endpoint URL for this environment
   * Injected as API_URI environment variable
   * @example "https://api.aphiria.com"
   */
  apiUri: string;

  /**
   * Cookie domain for this environment
   * Injected as COOKIE_DOMAIN environment variable
   * @example "aphiria.com"
   */
  cookieDomain: string;

  /**
   * Kubernetes namespace for deployment
   * @example "default", "preview-pr-123", "production"
   */
  namespace: pulumi.Input<string>;

  /**
   * Kubernetes provider for this cluster
   */
  provider: k8s.Provider;

  /**
   * Resource requests and limits for the web container
   */
  resources: {
    requests: {
      cpu: string;      // e.g., "100m"
      memory: string;   // e.g., "256Mi"
    };
    limits: {
      cpu: string;      // e.g., "250m"
      memory: string;   // e.g., "512Mi"
    };
  };
}
```

### Usage in Pulumi

```typescript
import { createWebDeployment } from '@/components/web-deployment';

const web = createWebDeployment({
  image: webImage.imageUri,
  replicas: config.requireNumber("webReplicas"),
  apiUri: apiUrl,
  cookieDomain: config.require("cookieDomain"),
  namespace: namespace.metadata.name,
  provider: cluster.provider,
  resources: {
    requests: { cpu: "100m", memory: "256Mi" },
    limits: { cpu: "250m", memory: "512Mi" },
  },
});
```

---

## Interface 8: ContainerEnvironmentVariables

### Purpose
Defines the environment variables injected into the web container.

### Interface Definition

```typescript
interface ContainerEnvironmentVariables {
  /**
   * Node.js environment mode
   * @constant "production"
   */
  NODE_ENV: "production";

  /**
   * Port for Next.js server to listen on
   * @default 3000
   */
  PORT: string;

  /**
   * Hostname/IP to bind to
   * Must be "0.0.0.0" for Kubernetes
   * @constant "0.0.0.0"
   */
  HOSTNAME: "0.0.0.0";

  /**
   * API backend URL (server-side only)
   * Different per environment
   */
  API_URI: string;

  /**
   * Cookie domain (server-side only)
   * Different per environment
   */
  COOKIE_DOMAIN: string;

  /**
   * Node.js memory configuration
   * Set to 80% of Kubernetes memory limit
   * @example "--max-old-space-size=409" (for 512Mi limit)
   */
  NODE_OPTIONS?: string;
}
```

### Kubernetes Configuration

```yaml
env:
  - name: NODE_ENV
    value: "production"
  - name: PORT
    value: "3000"
  - name: HOSTNAME
    value: "0.0.0.0"
  - name: API_URI
    value: "https://api.aphiria.com"
  - name: COOKIE_DOMAIN
    value: "aphiria.com"
  - name: NODE_OPTIONS
    value: "--max-old-space-size=409"
```

---

## Type Utilities

### Context Type Guard

```typescript
/**
 * Type guard to validate context values
 */
function isValidContext(value: unknown): value is Context {
  return value === "framework" || value === "library";
}

/**
 * Safely parse context from untrusted input
 */
function parseContext(value: unknown): Context {
  if (isValidContext(value)) {
    return value;
  }
  console.warn(`Invalid context value: ${value}, defaulting to "framework"`);
  return "framework";
}
```

### Runtime Config Type Guard

```typescript
/**
 * Type guard to validate runtime config
 */
function isRuntimeConfig(value: unknown): value is RuntimeConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const config = value as Record<string, unknown>;

  return (
    typeof config.apiUri === 'string' &&
    config.apiUri.startsWith('http') &&
    typeof config.cookieDomain === 'string' &&
    config.cookieDomain.length > 0
  );
}
```

---

## Module Boundaries

### Server-Only Modules

These interfaces/functions can ONLY be used in Server Components, API Routes, or server-side utilities:

- `ServerConfigProvider`
- `ContextResolver`
- `cookies()` from `next/headers`
- `process.env.*` access

### Client-Only Modules

These interfaces/functions can ONLY be used in Client Components:

- `ClientConfigProvider` (when receiving config via props)
- `useState`, `useEffect` hooks
- Browser APIs (`window`, `document`)

### Shared Modules

These interfaces can be used in both server and client:

- `RuntimeConfig` (type definition)
- `Context` (type definition)
- Type guards (`isValidContext`, `isRuntimeConfig`)

---

## Interface Versioning

All interfaces follow semantic versioning:

- **MAJOR**: Breaking changes (rename fields, change types)
- **MINOR**: Backward-compatible additions (new optional fields)
- **PATCH**: Documentation updates, clarifications

Current version: **1.0.0** (initial SSR migration)

---

## Testing Contracts

### Server-Side Tests

```typescript
// Mock next/headers
const mockGet = vi.fn();
const mockCookies = vi.fn().mockResolvedValue({ get: mockGet });

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

// Test ContextResolver
describe("ContextResolver", () => {
  it("resolves context from cookie", async () => {
    mockGet.mockReturnValue({ value: "library" });
    const context = await contextResolver.resolveContext(cookieStore, new URLSearchParams());
    expect(context).toBe("library");
  });
});
```

### Client-Side Tests

```typescript
// Mock runtime config prop
const mockConfig: RuntimeConfig = {
  apiUri: "http://localhost:8080",
  cookieDomain: "localhost",
};

describe("ClientComponent", () => {
  it("uses provided runtime config", () => {
    render(<ClientComponent config={mockConfig} />);
    // Assertions...
  });
});
```

---

## Summary

These interfaces define clear contracts between:

1. **Server and Client**: RuntimeConfig passed as props
2. **Components and Utilities**: ContextResolver, ConfigProvider
3. **Application and Infrastructure**: PulumiWebComponentArgs
4. **TypeScript and Runtime**: Type guards for validation

All interfaces are designed to be:
- **Type-safe**: Full TypeScript type checking
- **Testable**: Can be mocked and tested in isolation
- **Documented**: Clear purpose and usage examples
- **Versioned**: Changes tracked via semantic versioning
