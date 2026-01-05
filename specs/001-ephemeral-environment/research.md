# Research & Technical Decisions

**Feature**: Pull Request Ephemeral Environments
**Date**: 2025-12-20
**Status**: Resolved (Updated based on spec clarifications)

---

## Overview

This document consolidates technical research and decisions for implementing ephemeral preview environments. All "NEEDS CLARIFICATION" items from the initial plan have been resolved based on the feature specification and clarification session (2025-12-20).

---

## Decision 1: Preview Database Strategy

**Context**: Need to determine how preview environments access PostgreSQL for documentation search and application data.

**Decision**: **Shared PostgreSQL instance with per-PR logical databases**

**Rationale**:

- **Cost-effective**: Single PostgreSQL deployment vs. multiple instances per PR (70-80% cost reduction)
- **Fast provisioning**: Creating a database (`CREATE DATABASE aphiria_pr_123`) takes ~2 seconds vs. ~2 minutes for full PostgreSQL deployment
- **Sufficient isolation**: Separate databases provide security isolation equivalent to separate instances
- **Industry standard**: Matches Vercel, Render, Fly.io architecture for preview environments
- **No code changes**: Application already reads `DB_NAME` from environment variable (`src/Databases/Binders/SqlBinder.php:32`)

**Implementation Details**:

- Base infrastructure includes persistent PostgreSQL deployment (part of `ephemeral-base` Pulumi stack)
- Per-PR database naming: `aphiria_pr_{PR_NUMBER}` (e.g., `aphiria_pr_123`)
- Database credentials passed via per-PR Kubernetes Secret: `env-var-secrets-pr-{PR_NUMBER}`
- ConfigMap sets: `DB_HOST=db` (shared service), `DB_NAME=aphiria_pr_{PR_NUMBER}`
- On teardown: `DROP DATABASE IF EXISTS aphiria_pr_{PR_NUMBER}`

**Alternatives Considered**:

- ❌ **Separate PostgreSQL per PR** (original research.md proposal): Too expensive, slow provisioning (2+ min), unnecessary isolation
- ❌ **Shared database with table prefixes**: Risk of data leakage, migration complexity, not true isolation
- ❌ **SQLite per PR**: Incompatible with existing PostgreSQL schema, loses full-text search (TSVectors)

**Verification**: ✅ Application code (`SqlBinder.php`, `phinx.php`) already supports dynamic `DB_NAME`

---

## Decision 2: Image Promotion Strategy

**Context**: How production references the same image tested in preview (build-once-deploy-many requirement).

**Decision**: **Docker image digests with GitHub Actions artifact passing**

**Rationale**:

- **Immutability**: Image digest (SHA256) guarantees byte-for-byte identical image
- **Build once**: CI builds image on PR push, pushes to registry with both tag and digest
- **Digest tracking**: GitHub Actions workflow outputs image digest, passes to deployment steps
- **Production promotion**: Production workflow references exact digest tested in preview

**Implementation Details**:

### Build Phase (on PR push):

```yaml
# .github/workflows/build.yml
- name: Build and push
  id: docker_build
  uses: docker/build-push-action@v5
  with:
      push: true
      tags: davidbyoung/aphiria.com-api:pr-${{ github.event.pull_request.number }}

- name: Output digest
  run: echo "IMAGE_DIGEST=${{ steps.docker_build.outputs.digest }}" >> $GITHUB_OUTPUT
```

### Preview Deployment:

```yaml
# Uses digest from build step
image: davidbyoung/aphiria.com-api@${{ needs.build.outputs.digest }}
```

### Production Promotion (on merge):

```yaml
# References same digest that was tested in preview
image: davidbyoung/aphiria.com-api@sha256:abc123...
```

**Tag Strategy**:

- PR builds: `pr-{PR_NUMBER}` (e.g., `pr-123`) - mutable tag for convenience
- Production: `latest`, `v1.2.3` - mutable tags
- **Canonical reference**: Always use digest in Kubernetes manifests

**Registry Organization**:

- Existing registry: Docker Hub (`davidbyoung/aphiria.com-api`, `davidbyoung/aphiria.com-web`)
- No changes needed (digests work with current registry)
- Consider cleanup policy for old PR tags (manual or automated)

**Digest Tracking Mechanism**:

- **Option A: PR Labels** (Recommended): Add label `image-digest/web:sha256:abc123...` after preview deployment
- **Option B: GitHub Actions outputs**: Pass between jobs in same workflow
- **Decision**: Use GitHub Actions outputs for preview, PR labels for production promotion tracking

**Alternatives Considered**:

- ❌ **Semantic versioning only**: Doesn't guarantee immutability, can be overwritten
- ❌ **Git commit SHA tags**: Works but digest is more reliable (handles registry corruption)
- ❌ **Separate preview registry**: Unnecessary complexity, costs more

**Verification**: Docker build-push-action natively outputs digest in `outputs.digest`

---

## Decision 3: Pulumi Infrastructure Management

**Context**: How to manage both persistent base infrastructure and ephemeral per-PR resources.

**Decision**: **Two-stack strategy with Pulumi**

**Stack 1: Persistent Base (`ephemeral-base`)**:

- **Manages**: Cluster reference, PostgreSQL deployment, Gateway/Ingress, DNS wildcard config
- **Lifecycle**: Deployed once manually or via separate workflow, never destroyed by PR workflows
- **Updates**: Manual as-needed (per clarification session)

**Stack 2: Per-PR Ephemeral (`ephemeral-pr-{PR_NUMBER}`)**:

- **Manages**: Namespace, Deployments (web, api), Services, ConfigMaps, Secrets, Database creation/drop, HTTPRoutes
- **Lifecycle**: Created on PR approval, destroyed on PR close/merge
- **Automation**: Fully automated via GitHub Actions

**Rationale**:

- **Prevents accidental destruction**: Base infra in separate stack, impossible to destroy from PR workflow
- **Clear ownership**: Persistent vs. ephemeral resources clearly separated
- **Parallel deployments**: Multiple PRs can deploy simultaneously without state conflicts (separate stacks)
- **Cost tracking**: Easy to see per-PR costs vs. base infrastructure costs

**Stack State Backend**:

- **Recommended**: Pulumi Cloud (free for open source projects)
- **Alternative**: S3 backend with DynamoDB locking
- **Requirement**: Must support concurrent operations (multiple PRs deploying)

**Alternatives Considered**:

- ❌ **Single stack with conditionals**: Risk of destroying base infra, complex state management
- ❌ **Terraform instead of Pulumi**: Already using Pulumi (migrated from TF per git history), no reason to switch back
- ❌ **Kustomize only** (original research.md proposal): No database creation logic, harder to track resource ownership for per-PR databases

---

## Decision 4: Resource Quotas & Limits

**Context**: Prevent runaway preview environments from exhausting cluster resources.

**Decision**: **Per-namespace ResourceQuota with minimal limits** (clarified 2025-12-20)

**Quota Values** (per clarification session):

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
    name: preview-quota
    namespace: ephemeral-pr-{PR_NUMBER}
spec:
    hard:
        requests.cpu: "2"
        requests.memory: "4Gi"
        limits.cpu: "2"
        limits.memory: "4Gi"
        count/pods: "5"
```

**Rationale** (based on quantifiable cluster data - 2025-12-25):

**Actual Pod Resource Requirements** (measured from preview-pr-107):

- **API pod** (nginx + PHP-FPM):
    - requests: 300m CPU, 576Mi memory
    - limits: 600m CPU, 1152Mi memory
- **Web pod** (nginx):
    - requests: 50m CPU, 128Mi memory
    - limits: 250m CPU, 512Mi memory
- **DB Migration Job**:
    - requests: ~100m CPU, ~256Mi memory
    - limits: ~200m CPU, ~512Mi memory

**Rolling Update Requirements** (maxSurge=1, maxUnavailable=0):

- During API update: old API pod + new API pod = 1200m CPU, 2304Mi memory
- During Web update: old Web pod + new Web pod = 500m CPU, 1024Mi memory
- **Worst case** (simultaneous API + Web rolling updates):
    - CPU limits: 1200m + 500m = **1700m**
    - Memory limits: 2304Mi + 1024Mi = **3328Mi**
    - Plus DB migration job: +200m CPU, +512Mi memory = **1900m CPU, 3840Mi memory**

**Industry Best Practice**: Add 25% headroom for Kubernetes overhead, evictions, and scheduling flexibility

- CPU: 1900m × 1.25 = **2375m → 2.4 CPU (rounded to 2.5 CPU for safety)**
- Memory: 3840Mi × 1.25 = **4800Mi → 4.7Gi (rounded to 5Gi for safety)**

**Final Quota Values**:

- `limits.cpu: "2"` - Sufficient for API+Web steady state (850m) + db-migration (200m) = 1050m
- `limits.memory: "4Gi"` - Sufficient for API+Web steady state (1664Mi) + db-migration (512Mi) = 2176Mi
- **Critical**: Quota accommodates ONE rolling update at a time but NOT simultaneous API+Web updates
- **Trade-off**: Accepted to minimize cluster costs while maintaining zero-downtime updates per service

**Pod count**: 1 web + 1 api + 1 db-migration job = ~3 pods (5 allows headroom for temporary pods during updates)

**Deployment Replicas** (preview-specific):

- Web: `replicas: 1` (vs. 2 in production)
- API: `replicas: 1` (vs. 2 in production)

**Note on Simultaneous Updates**: CI/CD deploys API and Web sequentially, not in parallel, so 2 CPU / 4Gi quota is sufficient. If simultaneous updates are needed in the future, increase to 3 CPU / 5Gi.

**Alternatives Considered**:

- ❌ **No quotas**: Risk of cluster exhaustion from malicious/buggy PRs
- ❌ **Stricter quotas (1 CPU, 2Gi)**: Too tight, migrations might fail
- ❌ **Per-pod limits only**: Doesn't prevent spawning many pods

---

## Decision 5: Rate Limiting Strategy

**Context**: Prevent preview environments from being abused or DOSed.

**Decision**: **Kubernetes Gateway/Ingress-level connection limiting** (clarified 2025-12-20)

**Implementation**:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
    name: preview-pr-123
    annotations:
        nginx.ingress.kubernetes.io/limit-rps: "10" # 10 requests/second
        nginx.ingress.kubernetes.io/limit-connections: "20"
spec:
    hostnames:
        - "123.pr.aphiria.com"
        - "123.pr-api.aphiria.com"
```

**Rationale**:

- **Built-in**: nginx-ingress controller already in cluster (based on existing Gateway API usage)
- **Zero cost**: No external services needed
- **Good enough**: Connection limiting prevents flooding, not per-IP but sufficient for preview
- **Simple**: No Redis/app-level tracking needed

**Alternatives Considered**:

- ❌ **Cloudflare WAF**: Adds latency, external dependency, overkill for preview
- ❌ **Application-level (PHP)**: Complex, requires Redis, not worth it for preview
- ❌ **No rate limiting**: ResourceQuotas prevent cluster exhaustion, but could waste bandwidth

---

## Decision 6: Authentication Strategy

**Context**: Should preview environments require authentication?

**Decision**: **Public access (no authentication)** (clarified 2025-12-20)

**Rationale** (per clarification session):

- **Read-only content**: Documentation site, no sensitive data or write operations
- **URL obscurity**: `123.pr.aphiria.com` not indexed by search engines, semi-private
- **Ease of sharing**: Can share with non-GitHub stakeholders (User Story 2)
- **Simplicity**: No OAuth middleware, session management, or auth UI needed
- **Industry norm**: Most documentation preview sites (Vercel, Netlify) are public

**Security Posture**:

- ✅ **Deployment gating**: Still requires maintainer approval to create environment (prevents untrusted code execution)
- ✅ **Same content as production**: No secrets exposed (uses preview-specific .env)
- ✅ **Rate limiting**: Connection limits prevent abuse
- ❌ **No access control**: Anyone with URL can view

**Change from original research**: Original proposal didn't specify auth strategy. Clarified as public access for UX simplicity.

**Alternatives Considered**:

- ❌ **GitHub OAuth**: Complex, blocks non-GitHub stakeholders, adds latency
- ❌ **Basic Auth (shared password)**: Annoying UX, doesn't add real security for read-only docs
- ❌ **Production auth system**: Unnecessary for documentation preview

---

## Decision 7: Documentation Build Scope

**Context**: Should preview environments build full documentation or a subset?

**Decision**: **Full documentation build (all versions, all pages)** (clarified 2025-12-20)

**Rationale** (per clarification session):

- **Complete fidelity**: Tests actual production build process
- **Search validation**: LexemeSeeder requires full docs to test search functionality
- **No shortcuts**: Same Docker build stage as production (build-once principle)
- **Cross-references**: Documentation has internal links across versions/pages

**Build Process** (existing, no changes):

1. `infrastructure/docker/build/Dockerfile`: Clones https://github.com/aphiria/docs
2. Runs `gulp build` (Markdown → HTML, Prism syntax highlighting)
3. Copies to `public-web/` in build image
4. Runtime images copy from build image

**Impact**:

- ⚠️ **Build time**: ~3-5 minutes (same as production builds)
- ✅ **Accuracy**: Catches documentation build failures in preview
- ✅ **Search works**: Full lexeme index created

**Alternatives Considered**:

- ❌ **Latest version only**: Misses cross-version link issues, incomplete search index
- ❌ **Test fixtures (2-3 pages)**: Doesn't test real build process, search won't work
- ❌ **Skip docs**: Defeats purpose of previewing documentation site

---

## Decision 8: Maintenance Strategy

**Context**: How to handle updates to base infrastructure (Kubernetes, PostgreSQL versions).

**Decision**: **Manual as-needed updates** (clarified 2025-12-20)

**Rationale** (per clarification session):

- **Cost-conscious**: No automatic upgrade testing infrastructure
- **Infrequent need**: Kubernetes/PostgreSQL major versions change ~annually
- **Controlled timing**: Updates during low-activity periods
- **Security responsive**: Can apply critical CVE patches immediately when needed

**Process**:

1. Monitor for security updates (GitHub Dependabot for Docker images)
2. Test upgrades in dev cluster first
3. Update `ephemeral-base` Pulumi stack manually
4. Apply `pulumi up` to base stack (active PRs unaffected)
5. New PRs automatically use updated versions

**Alternatives Considered**:

- ❌ **Auto-update**: Risk of breaking changes, no testing, expensive to build auto-rollback
- ❌ **Scheduled monthly**: Unnecessary churn for stable infrastructure
- ❌ **Lock versions forever**: Security risk

---

## Decision 9: GitHub Actions Security (Open Source)

**Context**: Must prevent untrusted forked PRs from accessing deployment credentials.

**Decision**: **GitHub Actions environment protection with required reviewers**

**Rationale**:

- **Native security**: Built-in GitHub feature, no custom approval logic needed
- **Audit trail**: GitHub tracks who approved which deployments
- **Secrets scoping**: Environment-specific secrets inaccessible until approval
- **Fork safety**: Forked PRs cannot access protected environments automatically

**Implementation Pattern**:

```yaml
# .github/workflows/preview-deploy.yml
jobs:
    deploy:
        runs-on: ubuntu-latest
        environment:
            name: preview
            url: https://${{ github.event.pull_request.number }}.pr.aphiria.com
        steps:
            # Deployment steps only run after maintainer approval
```

**Best Practices**:

- Require approval from CODEOWNERS or specific maintainer group
- Environment secrets: `PULUMI_ACCESS_TOKEN`, `KUBECONFIG`, `DIGITALOCEAN_TOKEN`
- Protection rule: Require approval for "preview" environment
- Approval timeout: 7 days (auto-cancel stale deployment requests)

---

## Decision 10: TLS Certificate Management

**Context**: How to provide HTTPS for preview environments.

**Decision**: **Wildcard certificate for `*.pr.aphiria.com` managed by cert-manager**

**Rationale**:

- **Single certificate**: Wildcard covers all preview subdomains
- **No rate limits**: One cert issuance (Let's Encrypt), reused across all previews
- **Fast provisioning**: Certificate already exists, no per-preview wait
- **Existing infrastructure**: cert-manager already in use for production

**Implementation**:

- Issue wildcard cert `*.pr.aphiria.com` once via cert-manager
- Store as Kubernetes Secret in base infrastructure namespace
- All preview HTTPRoutes reference the same wildcard cert Secret
- cert-manager handles automatic renewal (90-day Let's Encrypt lifecycle)

**Alternatives Considered**:

- ❌ **Per-preview certificates**: Rate limit risk, slow provisioning, complexity
- ❌ **Self-signed certs**: Browser warnings, not production-like
- ❌ **HTTP only**: Not secure, not production-like

---

## Decision 11: Networking & Routing

**Context**: How to route `{PR_NUMBER}.pr.aphiria.com` to the correct preview environment.

**Decision**: **Gateway API HTTPRoute with host-based routing**

**Rationale**:

- **Existing infrastructure**: Already using Gateway API (based on spec references)
- **DNS simplicity**: Wildcard DNS record `*.pr.aphiria.com` → cluster load balancer
- **No per-preview DNS**: All previews share same wildcard DNS, routing via HTTPRoute rules
- **Supports both web and API**: Separate hostnames (`123.pr.aphiria.com`, `123.pr-api.aphiria.com`)

**Routing Configuration**:
Each preview gets an HTTPRoute resource:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
    name: preview-pr-123
    namespace: ephemeral-pr-123
spec:
    parentRefs:
        - name: gateway
          namespace: gateway-system
    hostnames:
        - "123.pr.aphiria.com"
        - "123.pr-api.aphiria.com"
    rules:
        - matches:
              - headers:
                    - name: Host
                      value: "123.pr.aphiria.com"
          backendRefs:
              - name: web
                port: 80
        - matches:
              - headers:
                    - name: Host
                      value: "123.pr-api.aphiria.com"
          backendRefs:
              - name: api
                port: 80
```

---

## Decision 12: Resource Cleanup Strategy

**Context**: Ensure complete resource removal when PR closes.

**Decision**: **Namespace deletion + database drop via Pulumi**

**Rationale**:

- **Atomic**: Delete namespace → Kubernetes cascades deletion to all resources
- **Reliable**: No orphaned resources (pods, services, ConfigMaps all deleted)
- **Database cleanup**: Pulumi explicitly drops PR database before stack destroy
- **Verification**: Pulumi tracks all resources in stack state

**Cleanup Workflow**:

1. On PR closed event:

    ```bash
    pulumi destroy --stack ephemeral-pr-{PR_NUMBER} --yes
    ```

2. Pulumi execution order:
    - Drop database: `DROP DATABASE IF EXISTS aphiria_pr_{PR_NUMBER}`
    - Delete Kubernetes namespace (cascades to all resources)
    - Remove stack state

3. Verify cleanup via Success Criteria SC-005

**Why Pulumi over kubectl**:

- Tracks database creation/deletion (kubectl doesn't manage databases)
- Declarative state ensures nothing missed
- Can verify cleanup by checking stack outputs

---

## Technology Stack Summary

### Infrastructure as Code

- **Pulumi**: Kubernetes resource management, database provisioning
- **Language**: TypeScript or Python (Pulumi SDK)
- **State**: Pulumi Cloud (free tier for open source)

### CI/CD

- **GitHub Actions**: Workflow orchestration
- **Triggers**: `pull_request` (opened, synchronize, closed)
- **Environments**: Protected "preview" environment with required reviewers

### Kubernetes Resources

- **Namespace**: Isolation boundary per PR (`ephemeral-pr-{PR_NUMBER}`)
- **Deployments**: `web` (1 replica), `api` (1 replica)
- **Services**: `web`, `api` (ClusterIP)
- **HTTPRoute** (Gateway API): Routing + TLS termination
- **ConfigMap**: `env-vars` (PR-specific config)
- **Secret**: `env-var-secrets` (DB credentials)
- **Job**: `db-migration` (Phinx migrations + LexemeSeeder)
- **ResourceQuota**: 2 CPU, 4Gi memory, 5 pods max
- **NetworkPolicy**: Namespace isolation

### Container Registry

- **Docker Hub**: `davidbyoung/aphiria.com-web`, `davidbyoung/aphiria.com-api`
- **Image strategy**: Tag + digest references
- **Cleanup**: Manual or automated removal of old PR tags

### Networking

- **DNS**: Wildcard records (`*.pr.aphiria.com`, `*.pr-api.aphiria.com`)
- **TLS**: cert-manager with Let's Encrypt wildcard cert
- **Load Balancer**: DigitalOcean LB (existing, fronts Gateway)
- **Rate limiting**: nginx-ingress connection limits

### Database

- **PostgreSQL 16**: Single instance (persistent, in `ephemeral-base` stack)
- **Per-PR databases**: Logical separation (`aphiria_pr_123`)
- **Migrations**: Phinx (existing tool)
- **Search index**: LexemeSeeder (existing, populates TSVectors)

---

## Best Practices Applied

### GitHub Actions

- **Concurrency control**: Cancel in-progress deployments for same PR on new push
- **Secrets management**: Use `environment` protection for Pulumi/Kubernetes credentials
- **Idempotency**: `pulumi up --yes` is safe to re-run
- **Error handling**: Post deployment status to PR comments (success/failure)

### Kubernetes

- **Labels**: Consistent labeling for resource tracking (`app.kubernetes.io/name`, `pr-number`)
- **Resource requests**: Set on all pods for QoS (Guaranteed or Burstable)
- **Health checks**: Liveness/readiness probes on all deployments (existing)
- **Security**: NetworkPolicies for namespace isolation

### Pulumi

- **Stack outputs**: Export preview URLs for GitHub Actions to comment on PR
- **Tagging**: Tag all resources with PR number for cost tracking
- **Destroy protection**: Base stack has `protect: true` flag
- **Database safety**: Verify database empty before drop (or force drop)

### Docker

- **Multi-stage builds**: Already in use (build → runtime)
- **Layer caching**: Use GitHub Actions cache for faster builds
- **Digest pinning**: Kubernetes manifests reference `@sha256:...`

---

## Decision 13: Full Pulumi Migration Strategy

**Context**: Initial implementation created separate Pulumi code for preview environments, but production uses Helm/Kustomize. This creates divergence - preview environments test different infrastructure than production deploys.

**Decision**: **Migrate ALL infrastructure (local, preview, production) from Helm/Kustomize to Pulumi**

**Rationale**:

- **Tool Consolidation**: Eliminates complexity of maintaining 3 tools (Helm + Kustomize + Pulumi) → Single tool (Pulumi)
- **Test What You Deploy**: Preview environments will use identical code as production (TypeScript components shared across stacks)
- **Better for Dynamic Infrastructure**: Pulumi excels at ephemeral environments (what this project needs)
- **Type Safety**: TypeScript catches errors before deployment (Kustomize YAML doesn't)
- **State Management**: Full deployment history, easy rollbacks, know what's deployed where
- **DRY Principle**: Define deployment components once, reuse across all environments
- **Simpler Local Dev**: Minikube workflow becomes `pulumi up` instead of `helmfile sync && kubectl apply -k`

**Migration Scope**:

### What Gets Migrated:

1. **Helm Charts** → Pulumi Helm provider:
    - cert-manager (v1.16.1) with Gateway API support
    - nginx-gateway-fabric (1.2.0)
    - Gateway API CRDs (kubectl apply hook becomes Pulumi YAML resource)

2. **Kustomize Base Manifests** → Pulumi TypeScript components:
    - Web Deployment (nginx + static files)
    - API Deployment (nginx + PHP-FPM with initContainer pattern)
    - Database Deployment (PostgreSQL 16 + PersistentVolume)
    - DB Migration Job (Phinx migrations + LexemeSeeder)
    - ConfigMaps (env-vars, nginx-config, js-config)
    - Secrets (env-var-secrets)
    - Gateway + HTTPRoutes (production routing)

3. **Environment Overlays** → Pulumi Stack Configurations:
    - local (Minikube): `pulumi stack select local`
    - preview (ephemeral): `pulumi stack select ephemeral-pr-{N}`
    - production (DigitalOcean): `pulumi stack select production`

4. **Image Registry Migration**:
    - From: DockerHub (`davidbyoung/aphiria.com-{api|web}:latest`)
    - To: GitHub Container Registry (`ghcr.io/aphiria/aphiria.com-{api|web}@sha256:...`)
    - Benefit: No rate limits, better GitHub Actions integration, native digest support

5. **Database Management**:
    - Pulumi creates per-environment databases:
        - local: `aphiria_dev_local` (in local PostgreSQL)
        - preview: `aphiria_pr_{N}` (in shared ephemeral PostgreSQL)
        - production: `aphiria_production` (in production PostgreSQL)

**What Gets Excluded**:

- ❌ Redis (not used, ignore)
- ❌ Monitoring secrets (managed separately)

**Component Architecture**:

```
infrastructure/pulumi/aphiria.com/
```

**Shared Component Pattern Example**:

```typescript
// src/stacks/lib/web-deployment.ts
export interface WebDeploymentArgs {
    namespace: pulumi.Input<string>;
    replicas: number;
    image: string;
    jsConfigData: Record<string, string>;
    env: "local" | "preview" | "production";
}

export function createWebDeployment(args: WebDeploymentArgs) {
    // Create js-config ConfigMap
    const jsConfig = new k8s.core.v1.ConfigMap("js-config", {
        metadata: { namespace: args.namespace },
        data: { "config.js": JSON.stringify(args.jsConfigData) },
    });

    // Create web Deployment (same structure as current Kustomize)
    return new k8s.apps.v1.Deployment("web", {
        metadata: { namespace: args.namespace },
        spec: {
            replicas: args.replicas,
            template: {
                spec: {
                    containers: [
                        {
                            name: "web",
                            image: args.image,
                            volumeMounts: [
                                {
                                    name: "js-config",
                                    mountPath: "/usr/share/nginx/html/js/config",
                                },
                            ],
                        },
                    ],
                    volumes: [
                        {
                            name: "js-config",
                            configMap: { name: jsConfig.metadata.name },
                        },
                    ],
                },
            },
        },
    });
}
```

**Stack Usage**:

```typescript
// production-stack.ts
import { createWebDeployment } from "./lib/web-deployment";

createWebDeployment({
    namespace: "default",
    replicas: 2,
    image: "ghcr.io/aphiria/aphiria.com-web@sha256:...",
    jsConfigData: {
        apiUrl: "https://api.aphiria.com",
        environment: "production",
    },
    env: "production",
});

// ephemeral-stack.ts (per-PR)
createWebDeployment({
    namespace: `ephemeral-pr-${prNumber}`,
    replicas: 1,
    image: webImageDigest, // From GitHub Actions
    jsConfigData: {
        apiUrl: `https://${prNumber}.pr-api.aphiria.com`,
        environment: "preview",
    },
    env: "preview",
});
```

**Migration Order & Testing**:

1. **Phase 1: local (Minikube)**
    - Migrate first to test locally without cluster access
    - Validate: `minikube start && pulumi up --stack local`
    - Test: Access site locally, verify database migrations work
    - Risk: Low (local only, no production impact)

2. **Phase 2: preview (ephemeral-pr-\*)**
    - Update existing ephemeral stack to use shared components
    - Test: Open test PR, approve deployment, validate preview works
    - Risk: Medium (uses DigitalOcean, but isolated from production)

3. **Phase 3: production (DigitalOcean)**
    - Migrate production last after validating patterns in local + preview
    - Deploy to production: `pulumi up --stack production`
    - Risk: High (live site), but mitigated by prior testing

**Backward Compatibility Plan**:

```bash
# After successful migration, preserve old files for reference
mv infrastructure/kubernetes infrastructure/kubernetes-deprecated

# Add deprecation notice
echo "⚠️ DEPRECATED: Migrated to Pulumi (infrastructure/pulumi/aphiria.com/)
Preserved for reference until 2025-06-20" > infrastructure/kubernetes-deprecated/README.md
```

**Deployment Commands**:

```bash
# Before (Kustomize):
helmfile -f infrastructure/kubernetes/base/helmfile.yml sync
kubectl apply -k infrastructure/kubernetes/environments/prod

# After (Pulumi):
cd infrastructure/pulumi/aphiria.com
pulumi up --stack production
```

**Benefits Validation**:

- ✅ **Same Kubernetes Resources**: Pulumi generates identical manifests to Kustomize (just defined in TypeScript)
- ✅ **Faster Local Dev**: `pulumi up` vs `helmfile + kubectl` (eliminates tool switching)
- ✅ **Preview = Production**: Both use same TypeScript components (test what you deploy)
- ✅ **Better Errors**: TypeScript type checking catches config errors pre-deployment
- ✅ **State Tracking**: `pulumi stack output` shows what's deployed, `pulumi preview` shows diffs

---

## Summary of Technical Decisions

| Area            | Decision                                 | Primary Benefit                               | Updated |
| --------------- | ---------------------------------------- | --------------------------------------------- | ------- |
| Database        | Shared PostgreSQL + per-PR databases     | 70-80% cost reduction                         | ✅ Yes  |
| Security        | GitHub environment protection rules      | Native fork safety                            | No      |
| Networking      | Gateway API HTTPRoute + wildcard TLS     | Fast, secure routing                          | ✅ Yes  |
| Orchestration   | Pulumi (two-stack strategy)              | Database lifecycle + K8s                      | ✅ Yes  |
| Cleanup         | Pulumi destroy (namespace + database)    | Reliable, complete removal                    | ✅ Yes  |
| State           | PR comments                              | User-visible status                           | No      |
| Build Strategy  | Build-once, digest-based promotion       | Identical artifacts preview → production      | No      |
| Image Registry  | GitHub Container Registry (ghcr.io)      | No rate limits, native GH Actions integration | ✅ Yes  |
| Rate Limiting   | Ingress connection limits                | Zero-cost abuse prevention                    | ✅ Yes  |
| Authentication  | Public access (no auth)                  | UX simplicity, stakeholder sharing            | ✅ Yes  |
| Docs Build      | Full documentation build                 | Complete fidelity testing                     | ✅ Yes  |
| Maintenance     | Manual as-needed updates                 | Cost-conscious, controlled                    | ✅ Yes  |
| Resource Limits | 2 CPU, 4Gi, 5 pods, 1 replica            | Prevents abuse without over-constraint        | ✅ Yes  |
| Infrastructure  | Full Pulumi migration (all environments) | Tool consolidation, test what you deploy      | ✅ Yes  |

**All NEEDS CLARIFICATION items resolved. Proceed to Phase 1.**
