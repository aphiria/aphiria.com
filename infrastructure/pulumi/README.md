# Aphiria.com Pulumi Infrastructure

Shared TypeScript components for managing Aphiria.com infrastructure across all environments.

## Overview

This Pulumi project provides **reusable infrastructure components** that are used across:
- **local** (Minikube): Local development environment
- **preview** (ephemeral-pr-*): PR-based preview environments
- **production** (DigitalOcean): Live production site

**Philosophy**: Write infrastructure code once, parameterize for different environments. This ensures preview environments use the same infrastructure as production ("test what you deploy").

## Project Structure

This Pulumi project contains:
- **components/** - Shared infrastructure components
- **stacks/** - Stack programs (local, preview-base, preview-pr-{N})
- **docs/preview/** - Preview environment documentation

## Shared Components

### 1. Kubernetes Cluster (`kubernetes.ts`)

Creates a DigitalOcean managed Kubernetes cluster with auto-scaling.

```typescript
import { createKubernetesCluster } from "./components/kubernetes";

const cluster = createKubernetesCluster({
    name: "aphiria-com-cluster",
    region: "nyc1",
    version: "1.34.1-do.0",
    autoUpgrade: true,
    nodeSize: "s-2vcpu-4gb",
    nodeCount: 2,
    autoScale: true,
    minNodes: 1,
    maxNodes: 5,
});
// Returns: { cluster, clusterId, endpoint, kubeconfig, clusterCaCertificate }
```

**Key Features**:
- Auto-scaling node pool (configurable min/max)
- Automatic Kubernetes version upgrades
- Exports kubeconfig directly (no doctl required!)
- Used by production stack only (preview-base references production's cluster)

### 2. Helm Charts (`helm-charts.ts`)

Installs cert-manager and nginx-gateway-fabric with correct dependencies.

```typescript
import { installBaseHelmCharts } from "./components/helm-charts";

const helmCharts = installBaseHelmCharts({
    env: "production",
    provider: k8sProvider, // optional
});
// Returns: { certManager, gatewayAPICRDs, nginxGateway }
```

### 3. PostgreSQL (`database.ts`)

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
- `local`: 1 replica, hostPath storage (Minikube)
- `preview`: 1 replica, shared instance for all PRs
- `production`: 2 replicas, cloud persistent storage

### 4. Web Deployment (`web-deployment.ts`)

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

### 5. API Deployment (`api-deployment.ts`)

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

### 6. Database Migration Job (`db-migration.ts`)

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

### 7. HTTPRoute (`http-route.ts`)

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

### 8. Gateway (`gateway.ts`)

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

### Example: local Stack

```typescript
// infrastructure/pulumi/stacks/local.ts (or inline in index.ts)
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
const helmCharts = installBaseHelmCharts({ env: "local" });

// 2. Create PostgreSQL
const postgres = createPostgreSQL({
    env: "local",
    namespace: "default",
    replicas: 1,
    persistentStorage: true,
    storageSize: "5Gi",
});

// 3. Create Gateway with self-signed cert
const gateway = createGateway({
    env: "local",
    namespace: "nginx-gateway",
    name: "nginx-gateway",
    tlsMode: "self-signed",
    domains: ["aphiria.com", "*.aphiria.com"],
});

// 4. Create deployments
const web = createWebDeployment({
    env: "local",
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
    env: "local",
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

| Component | local | preview | production |
|-----------|-----------|---------|------------|
| **Kubernetes cluster** | Minikube | DigitalOcean (from production) | DigitalOcean (Pulumi-managed) |
| **PostgreSQL replicas** | 1 | 1 (shared) | 2 |
| **PostgreSQL storage** | hostPath (5Gi) | Dynamic (10Gi) | Dynamic (20Gi) |
| **Web replicas** | 1 | 1 | 2 |
| **API replicas** | 1 | 1 | 2 |
| **TLS mode** | self-signed | letsencrypt-prod | letsencrypt-prod |
| **Image strategy** | latest tag | digest | digest |
| **Namespace** | default | ephemeral-pr-{PR} | default |
| **Domain** | aphiria.com | {PR}.pr.aphiria.com | aphiria.com |
| **Kubeconfig source** | Minikube CLI | Production stack output | Cluster component output |

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

## Local Development (local)

### Prerequisites

1. **Minikube** running: `minikube start`
2. **Pulumi CLI** installed
3. **Pulumi login**: `pulumi login` (uses Pulumi Cloud backend)

### Secret Management for Local Development

The `local` stack uses **traditional Pulumi config** (not ESC) so developers can work without needing Pulumi ESC access.

**How it works:**
- Secrets stored locally using `pulumi config set --secret`
- Encrypted in `Pulumi.local.yaml` using Pulumi Cloud encryption
- **No ESC environment required**
- **No passphrase required** (Pulumi Cloud handles encryption)

**Preview/Production stacks** use ESC for centralized secret management - but local development doesn't require it.

### Setup

```bash
# 1. Install dependencies
cd infrastructure/pulumi
npm install

# 2. Select or initialize local stack
pulumi stack select local  # Or: pulumi stack init local if it doesn't exist

# 3. Configure PostgreSQL credentials
# Local stack uses traditional Pulumi config (no ESC required)
pulumi config set postgresql:user aphiria
pulumi config set --secret postgresql:password postgres  # Or any password you choose
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
pulumi up --stack local
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
pulumi up --stack local --yes
```

### Teardown

```bash
cd infrastructure/pulumi
pulumi destroy --stack local
```

See [DEV-LOCAL-SETUP.md](./DEV-LOCAL-SETUP.md) for detailed troubleshooting.

## Migration from Terraform

This project was migrated from Terraform to Pulumi for better TypeScript integration and developer experience.

| Infrastructure | Terraform | Pulumi |
|----------------|-----------|--------|
| **Kubernetes Cluster** | `terraform/digitalocean.tf` | `components/kubernetes.ts` |
| **Cluster Kubeconfig** | Retrieved via doctl CLI | Exported directly from cluster component |
| **Helm Charts** | `infrastructure/kubernetes/base/helmfile.yml` | `components/helm-charts.ts` |
| **Database** | `infrastructure/kubernetes/base/database/` | `components/database.ts` |
| **Web/API** | `infrastructure/kubernetes/base/{web,api}/` | `components/{web,api}-deployment.ts` |
| **Migrations** | `infrastructure/kubernetes/base/database/jobs.yml` | `components/db-migration.ts` |
| **Gateway/Routes** | `infrastructure/kubernetes/base/gateway-api/` | `components/gateway.ts` + `components/http-route.ts` |

**Key Improvements**:
- **No doctl required**: Kubeconfig comes directly from Pulumi stack outputs
- **Type safety**: Full TypeScript typing for all infrastructure
- **Stack references**: preview-base references production cluster via StackReference
- **Single project**: All stacks (local, preview-base, preview-pr-*, production) in one Pulumi project

**Migration Status**:
- ✅ Phase 0: Shared components created
- ✅ Phase 7: Local stack migrated to Pulumi
- 🚧 Phase 1-6: Preview environments in progress
- ⏳ Phase 8: Production migration pending

Old Kustomize files remain at `infrastructure/kubernetes/` until production migration completes.

## Stack Naming Conventions

| Stack | Purpose | Pulumi Stack Name |
|-------|---------|-------------------|
| local | Minikube local development | `local` |
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
