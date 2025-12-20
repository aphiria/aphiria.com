# Aphiria.com Pulumi Infrastructure

Shared TypeScript components for managing Aphiria.com infrastructure across all environments.

## Overview

This Pulumi project provides **reusable infrastructure components** that are used across:
- **dev-local** (Minikube): Local development environment
- **preview** (ephemeral-pr-*): PR-based preview environments
- **production** (DigitalOcean): Live production site

**Philosophy**: Write infrastructure code once, parameterize for different environments. This ensures preview environments use the same infrastructure as production ("test what you deploy").

## Project Structure

```
infrastructure/pulumi/
├── index.ts                    # Main entry point (exports all components)
├── package.json                # Dependencies
├── Pulumi.yaml                 # Pulumi project configuration
├── tsconfig.json               # TypeScript configuration
├── components/                 # Shared components (industry standard)
│   ├── types.ts                # TypeScript type definitions
│   ├── helm-charts.ts          # Helm chart deployments (cert-manager, nginx-gateway)
│   ├── database.ts             # PostgreSQL deployment and database creation
│   ├── web-deployment.ts       # Web (nginx) deployment
│   ├── api-deployment.ts       # API (nginx + PHP-FPM) deployment
│   ├── db-migration.ts         # Database migration job (Phinx + LexemeSeeder)
│   ├── http-route.ts           # Gateway API HTTPRoute configuration
│   └── gateway.ts              # Gateway API Gateway with TLS
└── ephemeral/                  # Preview environment Pulumi project
    └── src/
        ├── base-stack.ts       # Persistent preview infrastructure
        └── ephemeral-stack.ts  # Per-PR resources
```

## Shared Components

### 1. Helm Charts (`helm-charts.ts`)

Installs cert-manager and nginx-gateway-fabric with correct dependencies.

```typescript
import { installBaseHelmCharts } from "./components/helm-charts";

const helmCharts = installBaseHelmCharts({
    env: "production",
    provider: k8sProvider, // optional
});
// Returns: { certManager, gatewayAPICRDs, nginxGateway }
```

### 2. PostgreSQL (`database.ts`)

Creates PostgreSQL deployment with optional persistent storage.

```typescript
import { createPostgreSQL } from "./components/database";

const postgres = createPostgreSQL({
    env: "production",
    namespace: "default",
    replicas: 2,
    persistentStorage: true,
    storageSize: "10Gi",
});
// Returns: { deployment, service, pvc }
```

**Environment differences**:
- `dev-local`: 1 replica, hostPath storage (Minikube)
- `preview`: 1 replica, shared instance for all PRs
- `production`: 2 replicas, cloud persistent storage

### 3. Web Deployment (`web-deployment.ts`)

Creates nginx deployment for the static documentation site.

```typescript
import { createWebDeployment } from "./components/web-deployment";

const web = createWebDeployment({
    env: "production",
    namespace: "default",
    replicas: 2,
    image: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123...",
    jsConfigData: {
        apiUri: "https://api.aphiria.com",
        cookieDomain: ".aphiria.com",
    },
    baseUrl: "https://www.aphiria.com",
});
// Returns: { deployment, service, configMap }
```

**js-config ConfigMap**: Required for JavaScript configuration (API URLs, cookie domain).

### 4. API Deployment (`api-deployment.ts`)

Creates nginx + PHP-FPM deployment using initContainer pattern.

```typescript
import { createAPIDeployment } from "./components/api-deployment";

const api = createAPIDeployment({
    env: "production",
    namespace: "default",
    replicas: 2,
    image: "ghcr.io/aphiria/aphiria.com-api@sha256:def456...",
    dbHost: "db",
    dbName: "aphiria",
    dbUser: "aphiria_user",
    dbPassword: pulumi.secret("password123"),
    apiUrl: "https://api.aphiria.com",
    webUrl: "https://www.aphiria.com",
});
// Returns: { deployment, service, secret }
```

**Architecture**:
1. initContainer copies PHP code from API image to shared volume
2. nginx serves static assets and proxies to PHP-FPM
3. PHP-FPM processes PHP requests on port 9000

### 5. Database Migration Job (`db-migration.ts`)

Runs Phinx migrations and LexemeSeeder.

```typescript
import { createDBMigrationJob } from "./components/db-migration";

const migration = createDBMigrationJob({
    namespace: "default",
    image: "ghcr.io/aphiria/aphiria.com-api@sha256:def456...",
    dbHost: "db",
    dbName: "aphiria",
    dbUser: "aphiria_user",
    dbPassword: pulumi.secret("password123"),
    runSeeder: true, // Populates search index
});
// Returns: Job resource
```

**Lifecycle**:
1. Wait for database to be ready (nc -z db 5432)
2. Run migrations: `/app/api/vendor/bin/phinx migrate`
3. Run seeder: `/app/api/vendor/bin/phinx seed:run`
4. Auto-cleanup after completion (ttlSecondsAfterFinished: 0)

### 6. HTTPRoute (`http-route.ts`)

Creates Gateway API routes for traffic routing.

```typescript
import { createHTTPRoute } from "./components/http-route";

const webRoute = createHTTPRoute({
    namespace: "default",
    name: "web",
    hostname: "www.aphiria.com",
    serviceName: "web",
    servicePort: 80,
    gatewayName: "nginx-gateway",
    gatewayNamespace: "nginx-gateway",
    enableRateLimiting: true, // Optional: 10 req/s per IP
});
```

**Additional utilities**:
- `createHTTPSRedirectRoute()`: HTTP → HTTPS redirect
- `createWWWRedirectRoute()`: aphiria.com → www.aphiria.com redirect

### 7. Gateway (`gateway.ts`)

Creates Kubernetes Gateway with TLS support.

```typescript
import { createGateway } from "./components/gateway";

const gateway = createGateway({
    env: "production",
    namespace: "nginx-gateway",
    name: "nginx-gateway",
    tlsMode: "letsencrypt-prod", // or "letsencrypt-staging" or "self-signed"
    domains: ["aphiria.com", "*.aphiria.com"],
});
// Returns: { gateway, certificate }
```

**TLS Modes**:
- `self-signed`: Local development (Minikube)
- `letsencrypt-staging`: Testing Let's Encrypt integration
- `letsencrypt-prod`: Production (real certificates)

**Listeners**: Separate listeners for root domain vs. subdomains (wildcards don't match root).

## Usage in Stack Programs

### Example: dev-local Stack

```typescript
// infrastructure/pulumi/stacks/dev-local.ts (or inline in index.ts)
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {
    installBaseHelmCharts,
    createPostgreSQL,
    createGateway,
    createWebDeployment,
    createAPIDeployment,
    createDBMigrationJob,
    createHTTPRoute,
} from "./components";

// 1. Install Helm charts
const helmCharts = installBaseHelmCharts({ env: "dev-local" });

// 2. Create PostgreSQL
const postgres = createPostgreSQL({
    env: "dev-local",
    namespace: "default",
    replicas: 1,
    persistentStorage: true,
    storageSize: "5Gi",
});

// 3. Create Gateway with self-signed cert
const gateway = createGateway({
    env: "dev-local",
    namespace: "nginx-gateway",
    name: "nginx-gateway",
    tlsMode: "self-signed",
    domains: ["aphiria.com", "*.aphiria.com"],
});

// 4. Create deployments
const web = createWebDeployment({
    env: "dev-local",
    namespace: "default",
    replicas: 1,
    image: "davidbyoung/aphiria.com-web:latest",
    jsConfigData: {
        apiUri: "https://api.aphiria.com",
        cookieDomain: ".aphiria.com",
    },
    baseUrl: "https://www.aphiria.com",
});

const api = createAPIDeployment({
    env: "dev-local",
    namespace: "default",
    replicas: 1,
    image: "davidbyoung/aphiria.com-api:latest",
    dbHost: "db",
    dbName: "aphiria",
    dbUser: "aphiria",
    dbPassword: pulumi.secret("password"),
    apiUrl: "https://api.aphiria.com",
    webUrl: "https://www.aphiria.com",
});

// 5. Run migrations
const migration = createDBMigrationJob({
    namespace: "default",
    image: "davidbyoung/aphiria.com-api:latest",
    dbHost: "db",
    dbName: "aphiria",
    dbUser: "aphiria",
    dbPassword: pulumi.secret("password"),
    runSeeder: true,
});

// 6. Create routes
const webRoute = createHTTPRoute({
    namespace: "default",
    name: "web",
    hostname: "www.aphiria.com",
    serviceName: "web",
    servicePort: 80,
    gatewayName: "nginx-gateway",
    gatewayNamespace: "nginx-gateway",
});

const apiRoute = createHTTPRoute({
    namespace: "default",
    name: "api",
    hostname: "api.aphiria.com",
    serviceName: "api",
    servicePort: 80,
    gatewayName: "nginx-gateway",
    gatewayNamespace: "nginx-gateway",
});

// Export URLs
export const webUrl = "https://www.aphiria.com";
export const apiUrl = "https://api.aphiria.com";
```

## Environment-Specific Configuration

| Component | dev-local | preview | production |
|-----------|-----------|---------|------------|
| **PostgreSQL replicas** | 1 | 1 (shared) | 2 |
| **PostgreSQL storage** | hostPath (5Gi) | Dynamic (10Gi) | Dynamic (20Gi) |
| **Web replicas** | 1 | 1 | 2 |
| **API replicas** | 1 | 1 | 2 |
| **TLS mode** | self-signed | letsencrypt-prod | letsencrypt-prod |
| **Image strategy** | latest tag | digest | digest |
| **Namespace** | default | ephemeral-pr-{PR} | default |
| **Domain** | aphiria.com | {PR}.pr.aphiria.com | aphiria.com |

## Development

### Install Dependencies

```bash
cd infrastructure/pulumi
npm install
```

### Type Checking

```bash
npm run tsc
```

### Linting

```bash
npm run lint
```

## Local Development (dev-local)

### Prerequisites

1. **Minikube** running: `minikube start`
2. **Pulumi CLI** installed
3. **Local backend** configured: `pulumi login --local`

### Setup

```bash
# 1. Install dependencies
cd infrastructure/pulumi
npm install

# 2. Initialize dev-local stack (with passphrase for secrets)
export PULUMI_CONFIG_PASSPHRASE="your-passphrase"
pulumi stack init dev-local

# 3. Configure secrets
pulumi config set --secret dbPassword password
```

### Build and Load Docker Images

```bash
# Set Docker to use Minikube's daemon
eval $(minikube -p minikube docker-env)

# Build images
docker build -t aphiria.com-build -f ./infrastructure/docker/build/Dockerfile .
docker build -t davidbyoung/aphiria.com-api:latest -f ./infrastructure/docker/runtime/api/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build
docker build -t davidbyoung/aphiria.com-web:latest -f ./infrastructure/docker/runtime/web/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build
```

### Deploy

```bash
cd infrastructure/pulumi
export PULUMI_CONFIG_PASSPHRASE="your-passphrase"
pulumi up --stack dev-local
```

This deploys:
- cert-manager and nginx-gateway-fabric (Helm)
- PostgreSQL with persistent storage
- Gateway with self-signed TLS
- Web and API deployments
- Database migrations and seeders
- HTTP routes

### Verify

Add to `/etc/hosts`:
```
127.0.0.1 aphiria.com www.aphiria.com api.aphiria.com
```

Access:
- https://www.aphiria.com (web)
- https://api.aphiria.com/docs (API)

**Note**: Accept self-signed certificate warnings.

### Update Workflow

```bash
# Rebuild images
eval $(minikube -p minikube docker-env)
docker build -t davidbyoung/aphiria.com-api:latest -f ./infrastructure/docker/runtime/api/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build
docker build -t davidbyoung/aphiria.com-web:latest -f ./infrastructure/docker/runtime/web/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build

# Update deployment
cd infrastructure/pulumi
export PULUMI_CONFIG_PASSPHRASE="your-passphrase"
pulumi up --stack dev-local --yes
```

### Teardown

```bash
cd infrastructure/pulumi
export PULUMI_CONFIG_PASSPHRASE="your-passphrase"
pulumi destroy --stack dev-local
```

See [DEV-LOCAL-SETUP.md](./DEV-LOCAL-SETUP.md) for detailed troubleshooting.

## Migration from Kustomize

This project replaces the old Helm/Kustomize infrastructure:

| Old (Kustomize) | New (Pulumi) |
|-----------------|--------------|
| `infrastructure/kubernetes/base/helmfile.yml` | `components/helm-charts.ts` |
| `infrastructure/kubernetes/base/database/` | `components/database.ts` |
| `infrastructure/kubernetes/base/web/` | `components/web-deployment.ts` |
| `infrastructure/kubernetes/base/api/` | `components/api-deployment.ts` |
| `infrastructure/kubernetes/base/database/jobs.yml` | `components/db-migration.ts` |
| `infrastructure/kubernetes/base/gateway-api/` | `components/gateway.ts` + `components/http-route.ts` |

**Migration Order**:
1. Phase 0 (complete): Shared components created
2. Phase 7 (next): Migrate dev-local to Pulumi
3. Phase 1-6: Implement preview environments
4. Phase 8 (last): Migrate production to Pulumi

Old Kustomize files remain at `infrastructure/kubernetes/` until Phase 8 completes successfully.

## Stack Naming Conventions

| Stack | Purpose | Pulumi Stack Name |
|-------|---------|-------------------|
| dev-local | Minikube local development | `dev-local` |
| preview base | Shared preview infrastructure | `ephemeral-base` |
| preview per-PR | Ephemeral preview environment | `ephemeral-pr-{PR_NUMBER}` |
| production | Live site | `production` |

## Related Documentation

- **Spec**: `../../specs/001-ephemeral-environment/spec.md`
- **Research**: `../../specs/001-ephemeral-environment/research.md`
- **Tasks**: `../../specs/001-ephemeral-environment/tasks.md`
- **Data Model**: `../../specs/001-ephemeral-environment/data-model.md`

## Support

For questions or issues, see the main project README or open a GitHub issue.

---

**Last Updated**: 2025-12-20
**Pulumi Version**: 3.x
**TypeScript Version**: 5.x
