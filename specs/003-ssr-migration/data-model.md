# Data Model: SSR Migration

**Feature**: SSR Migration (003-ssr-migration)
**Date**: 2026-01-22
**Phase**: Phase 1 - Design

---

## Overview

This document defines the key entities involved in the SSR migration. These entities represent the data structures and their relationships, independent of implementation details.

---

## Entity 1: Context Preference

### Purpose
Represents a user's choice between "framework" and "library" documentation views.

### Fields

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `value` | enum | The selected context | Must be "framework" OR "library" |
| `source` | enum | Where the value came from | Must be "cookie", "url", or "default" |
| `timestamp` | number | When preference was set (Unix timestamp) | Optional, for tracking |

### Allowed Values

**value:**
- `"framework"` - Full framework documentation view (includes DI, routing, etc.)
- `"library"` - Library-only documentation view (excludes framework-specific features)

**source:**
- `"cookie"` - Read from user's browser cookie
- `"url"` - Specified via `?context=` query parameter
- `"default"` - No preference found, using default value

### Validation Rules

1. **value** must be exactly "framework" or "library" (case-sensitive)
2. Invalid values default to "framework"
3. URL parameter takes precedence over cookie
4. Cookie persists URL parameter choice for future visits

### State Transitions

```
Default State
    ↓
URL Override (optional)
    ↓
Cookie Storage
    ↓
Server-Side Resolution
    ↓
Rendered in HTML
```

### Persistence

- **Storage**: HTTP cookie named `"context"`
- **Lifetime**: 1 year (`maxAge: 60 * 60 * 24 * 365`)
- **Scope**: Entire domain (path: `/`)
- **Security**:
  - `secure: true` in production (HTTPS only)
  - `sameSite: "lax"` (CSRF protection)
  - `httpOnly: false` (client needs to read for updates)

### Relationships

- **Associated with**: User session (via cookie)
- **Used by**: ContextSelector component (client-side updates)
- **Resolved by**: Page Server Components (server-side rendering)

---

## Entity 2: Runtime Configuration

### Purpose
Provides environment-specific settings that change between local, preview, and production deployments without requiring code or Docker image changes.

### Fields

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `apiUri` | string | URL of the API backend | Must be valid HTTP(S) URL |
| `cookieDomain` | string | Domain for setting cookies | Must be valid domain or "localhost" |
| `environment` | enum | Deployment environment identifier | Must be "local", "preview", or "production" |

### Allowed Values

**apiUri:**
- Local: `"http://api.local.aphiria.com"`
- Preview: `"https://api-pr-${prNumber}.aphiria-preview.com"`
- Production: `"https://api.aphiria.com"`

**cookieDomain:**
- Local: `"local.aphiria.com"` or `"localhost"`
- Preview: `"aphiria-preview.com"`
- Production: `"aphiria.com"`

**environment:**
- `"local"` - Development environment (minikube)
- `"preview"` - Preview environment (per-PR deployments)
- `"production"` - Production environment

### Validation Rules

1. **apiUri** must be a well-formed URL (protocol + host)
2. **apiUri** must use `http://` for local, `https://` for preview/production
3. **cookieDomain** must not include protocol or path
4. **cookieDomain** must match the environment (localhost for local, etc.)

### Source

**SSR (Server Components):**
- Read from `process.env.API_URI`
- Read from `process.env.COOKIE_DOMAIN`

**Client Components:**
- Passed as props from parent Server Component
- OR fetched from API route that exposes server config

### Lifecycle

1. **Build Time**: Docker image built without environment-specific values
2. **Deploy Time**: Pulumi injects environment variables into Kubernetes Deployment
3. **Runtime**: Next.js reads `process.env.*` when rendering pages
4. **Request**: Server Component passes config to Client Components as needed

### Relationships

- **Managed by**: Pulumi stack configuration (per environment)
- **Injected via**: Kubernetes environment variables
- **Consumed by**: Server Components, API routes, Client Components (via props)

---

## Entity 3: Environment

### Purpose
Maps deployment environment identifiers to their specific runtime configuration values.

### Fields

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `name` | enum | Environment identifier | Must be "local", "preview", or "production" |
| `apiUri` | string | API endpoint for this environment | Must be valid URL |
| `cookieDomain` | string | Cookie domain for this environment | Must be valid domain |
| `replicas` | number | Number of web pods | Must be >= 1 |
| `resources` | object | CPU/memory limits | Must meet minimum requirements |

### Environment-Specific Values

**Local (Minikube):**
```yaml
name: local
apiUri: http://api.local.aphiria.com
cookieDomain: local.aphiria.com
replicas: 1
resources:
  requests:
    cpu: 100m
    memory: 512Mi
  limits:
    cpu: 500m
    memory: 1Gi
```

**Preview (Per-PR):**
```yaml
name: preview
apiUri: https://api-pr-${prNumber}.aphiria-preview.com
cookieDomain: aphiria-preview.com
replicas: 1
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 250m
    memory: 512Mi
```

**Production:**
```yaml
name: production
apiUri: https://api.aphiria.com
cookieDomain: aphiria.com
replicas: 2
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 250m
    memory: 512Mi
```

### Validation Rules

1. **apiUri** must match environment naming convention
2. **cookieDomain** must be appropriate for security (no `localhost` in production)
3. **replicas** must be at least 1 (production should be >= 2 for availability)
4. **resources.limits** must be >= **resources.requests**

### Source

- **Defined in**: Pulumi stack configuration files
- **Applied via**: Pulumi deployment to Kubernetes
- **Accessed at runtime**: Via environment variables in containers

### Relationships

- **Defines**: Runtime Configuration values
- **Managed by**: Pulumi infrastructure code
- **Applied to**: Kubernetes Deployment resources

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User Request                                                 │
│   ?context=library ──────────┐                              │
│   Cookie: context=framework ─┼─────────────┐                │
│                               │             │                │
│                               ↓             ↓                │
│                         Server Component Rendering           │
│                               │             │                │
│                      ┌────────┴─────┬──────┴────────┐       │
│                      │              │               │       │
│                      ↓              ↓               ↓       │
│              Read Cookie    Read URL Param   Read env vars  │
│               (via cookies())  (searchParams)  (process.env)│
│                      │              │               │       │
│                      └──────┬───────┘               │       │
│                             ↓                       ↓       │
│                     Resolve Context          Runtime Config │
│                             │                       │       │
│                             │                       │       │
│                             └───────┬───────────────┘       │
│                                     ↓                       │
│                            Render HTML with:                │
│                            - Correct context                │
│                            - API endpoint                   │
│                            - Cookie domain                  │
│                                     │                       │
│                                     ↓                       │
│                            Send to Browser                  │
│                                     │                       │
│                                     ↓                       │
│                            React Hydrates                   │
│                            (matches server HTML)            │
│                                     │                       │
│                                     ↓                       │
│                            Client Interactions              │
│                            (ContextSelector updates)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Entity Relationships

```
Environment (Pulumi)
    │
    ├─ defines ──→ Runtime Configuration (env vars)
    │                     │
    │                     └─ used by ──→ Server Component
    │                                          │
    │                                          ├─ reads ──→ Context Preference (cookie)
    │                                          │
    │                                          └─ renders ──→ HTML (correct context + config)
    │                                                              │
    │                                                              └─ hydrates ──→ Client Component
    │                                                                                    │
    └───────────────────────────────────────────────────────────────────────────────────┘
                                                                                         │
                                                                                         └─ updates ──→ Context Preference (cookie)
```

---

## State Management

### Server-Side (SSR)
1. **Input**: HTTP request (cookies, query params, environment variables)
2. **Processing**: Resolve context preference, load runtime config
3. **Output**: Pre-rendered HTML with correct state

### Client-Side (After Hydration)
1. **Initial State**: Matches server-rendered HTML (no flicker)
2. **User Interaction**: ContextSelector changes selection
3. **State Update**: Updates cookie, triggers visibility toggle
4. **URL Update**: Reflects change in URL (via `window.history.replaceState`)

### Persistence Layer

| Data | Storage Location | Lifetime | Scope |
|------|-----------------|----------|-------|
| Context Preference | Browser cookie | 1 year | Domain-wide |
| Runtime Configuration | Kubernetes env vars | Until pod restart | Per-environment |
| Environment Settings | Pulumi config | Until redeployment | Infrastructure |

---

## Constraints

1. **Context values** are limited to exactly two options: "framework" and "library"
2. **Cookie domain** must match deployment environment for security
3. **API URI** must be accessible from browser (CORS configured)
4. **Environment variables** must be set before container starts (no dynamic updates)
5. **Same Docker image** must work across all three environments (no rebuild required)

---

## Assumptions

1. Users have cookies enabled (fallback to default if disabled)
2. Kubernetes can inject environment variables reliably
3. Environment names (local/preview/production) won't change
4. Cookie lifetime of 1 year is acceptable
5. Context preference doesn't need to sync across devices

---

## Migration Notes

### Current State (SSG)
- Context resolved client-side only (causes flicker)
- Runtime config via ConfigMap-mounted `window.__RUNTIME_CONFIG__`
- No server-side cookie reading

### Target State (SSR)
- Context resolved server-side (no flicker)
- Runtime config via environment variables
- Server-side cookie reading with `cookies()` API

### Backward Compatibility
- Existing cookies continue to work (same name, format)
- URL query parameters continue to override cookies
- Default value remains "framework"
