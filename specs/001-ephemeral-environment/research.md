# Research: Pull Request Ephemeral Environments

**Phase**: 0 - Outline & Research
**Date**: 2025-12-19
**Purpose**: Resolve technical unknowns and establish implementation patterns

---

## 1. Preview Database Strategy

### Decision

Use **namespace-isolated PostgreSQL instances** within the existing Kubernetes cluster, with each preview environment getting its own PostgreSQL StatefulSet.

### Rationale

- **Isolation**: Complete data isolation between preview environments (no risk of cross-contamination)
- **Production parity**: Matches production setup more closely than schema-based isolation
- **Simplicity**: No complex schema isolation logic, no multi-tenancy concerns
- **Migration testing**: Each preview can test database migrations independently
- **Resource efficiency**: PostgreSQL containers are lightweight enough for 10 concurrent instances

### Alternatives Considered

| Approach | Pros | Cons | Why Rejected |
|----------|------|------|--------------|
| Shared PostgreSQL + Schema Isolation | Lower resource usage, faster provisioning | Complex tenant isolation, migration conflicts, security risks | Too complex for the benefit; schema conflicts likely |
| Ephemeral RDS Instances | True production parity | Slow provisioning (5-10 min), expensive, requires AWS/DO API integration | Violates 5-minute deployment SLA |
| SQLite per preview | Fastest, simplest | Not production-representative, missing features | Too different from production PostgreSQL |

### Implementation Notes

- Use StatefulSet with PersistentVolumeClaim for data persistence
- Resource limits: 512Mi memory, 0.5 CPU per preview database
- Initialize with seed data or sanitized production snapshot
- Clean up PVCs on preview environment destruction

---

## 2. GitHub Actions Environment Protection

### Decision

Use GitHub's **"environment" protection rules** with required reviewers to gate preview deployments.

### Rationale

- **Native security**: Built-in GitHub feature, no custom approval logic needed
- **Audit trail**: GitHub tracks who approved which deployments
- **Secrets scoping**: Environment-specific secrets inaccessible until approval
- **Fork safety**: Forked PRs cannot access protected environments automatically

### Implementation Pattern

```yaml
# .github/workflows/preview-deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: preview-pr-${{ github.event.pull_request.number }}
      url: https://${{ github.event.pull_request.number }}.pr.aphiria.com
    steps:
      # Deployment steps only run after maintainer approval
```

### Best Practices

- Require approval from CODEOWNERS or specific maintainer group
- Environment secrets: KUBECONFIG, DO_TOKEN, TLS_CERT_SECRET
- Protection rule: Require approval for all deployments to "preview-*" environments
- Approval timeout: 7 days (auto-cancel stale deployment requests)

---

## 3. Kubernetes Namespace Strategy

### Decision

Use **dynamic namespace creation** with naming pattern: `preview-pr-{PR_NUMBER}`.

### Rationale

- **Isolation**: Network policies, resource quotas, RBAC all namespace-scoped
- **Cleanup**: Delete entire namespace to guarantee resource removal
- **Naming**: Predictable, easy to map PR → namespace
- **Scalability**: Kubernetes handles hundreds of namespaces without issue

### Resource Quotas per Namespace

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: preview-limits
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 2Gi
    limits.cpu: "4"
    limits.memory: 4Gi
    persistentvolumeclaims: "3"
```

Limits prevent single preview from consuming excessive cluster resources.

---

## 4. TLS Certificate Management

### Decision

Use **cert-manager with Let's Encrypt** and wildcard certificate for `*.pr.aphiria.com`.

### Rationale

- **Single certificate**: Wildcard covers all preview subdomains
- **No rate limits**: One cert issuance, reused across all previews
- **Fast provisioning**: Certificate already exists, no per-preview wait
- **Existing infrastructure**: cert-manager already in use for production

### Alternatives Considered

| Approach | Pros | Cons | Why Rejected |
|----------|------|------|--------------|
| Per-preview certificates | More granular | Rate limit risk, slow provisioning, complexity | Violates 5-minute SLA, rate limit danger |
| Self-signed certs | No rate limits | Browser warnings, not production-like | Poor UX for stakeholders |
| HTTP only | Fastest | Not secure, not production-like | Violates security best practices |

### Implementation

- Issue wildcard cert `*.pr.aphiria.com` once, store as K8s secret
- All preview Ingresses reference the same wildcard cert
- cert-manager handles automatic renewal (90-day Let's Encrypt lifecycle)

---

## 5. Ingress and Load Balancing

### Decision

Use **Kubernetes Ingress** with path-based routing or host-based routing for `{PR_NUMBER}.pr.aphiria.com`.

### Rationale

- **Existing infrastructure**: Already using Ingress for production
- **DNS simplicity**: Wildcard DNS record `*.pr.aphiria.com` → cluster load balancer
- **No per-preview DNS**: All previews share same wildcard DNS, routing via Ingress rules
- **Ingress controller**: nginx-ingress or similar (already deployed)

### Routing Configuration

Each preview gets an Ingress resource:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: preview-pr-123
  namespace: preview-pr-123
spec:
  tls:
    - hosts:
        - "123.pr.aphiria.com"
      secretName: wildcard-pr-aphiria-com
  rules:
    - host: "123.pr.aphiria.com"
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
```

---

## 6. Deployment Orchestration Tool

### Decision

Use **Kustomize** for generating preview environment manifests (already in repository).

### Rationale

- **Existing tooling**: Repository already uses Kustomize for dev/prod environments
- **Templating**: Generate PR-specific manifests from base templates
- **Native to kubectl**: No additional dependencies (built into kubectl)
- **Simple**: Easier than Helm for this use case (no complex charts needed)

### Alternatives Considered

| Tool | Pros | Cons | Why Rejected |
|------|------|------|--------------|
| Helm | Industry standard, powerful | Overkill for simple templating, extra dependency | Kustomize already in use |
| Raw YAML | No dependencies | No templating, manual sed/envsubst | Error-prone, hard to maintain |

### Structure

```text
infrastructure/kubernetes/base/preview-template/
├── kustomization.yaml       # Base resources
├── deployment.yaml          # Web + API deployments
├── service.yaml             # Services
├── ingress.yaml             # Ingress template
├── postgres-statefulset.yaml
└── namespace.yaml

infrastructure/kubernetes/environments/preview/
└── kustomization.yaml       # Overlay with PR-specific values
```

Generate preview manifests:

```bash
PR_NUMBER=123 envsubst < infrastructure/kubernetes/environments/preview/kustomization.yaml | kubectl apply -f -
```

---

## 7. GitHub Actions Workflow Triggers

### Decision

Use **workflow_run** trigger for deployment updates and **pull_request** event for cleanup.

### Rationale

- **Security**: workflow_run runs in context of base branch, not PR branch (safe for forks)
- **Approval gate**: Deployment workflow targets protected environment
- **Automatic updates**: Triggered after CI passes on PR
- **Cleanup**: pull_request[closed] event triggers teardown

### Workflow Structure

**`.github/workflows/preview-deploy.yml`**
- Trigger: workflow_run (after CI workflow completes successfully)
- Condition: Only for open pull requests
- Action: Deploy or update preview environment
- Approval: Required (environment protection)

**`.github/workflows/preview-cleanup.yml`**
- Trigger: pull_request (types: [closed])
- Action: Delete namespace, cleanup resources
- Approval: Not required (destructive action on isolated resources)

---

## 8. State Management and PR Comments

### Decision

Use **PR comments** for state communication and deployment status updates.

### Rationale

- **Visibility**: Status visible directly in PR conversation
- **No external state**: Avoid managing separate database/state store
- **GitHub API**: Native support for posting/updating comments
- **User-friendly**: Non-technical stakeholders see status without checking logs

### Comment Format

```markdown
## 🚀 Preview Environment

**Status**: ✅ Ready
**URL**: https://123.pr.aphiria.com
**Last Updated**: 2025-12-19 14:32 UTC
**Commit**: abc1234

---

<details>
<summary>Deployment Details</summary>

- Namespace: `preview-pr-123`
- Database: Ready
- Web: Ready (2/2 replicas)
- API: Ready (2/2 replicas)

</details>
```

GitHub Actions updates comment (upsert) on each deployment event.

---

## 9. Resource Cleanup Strategy

### Decision

Use **namespace deletion** as primary cleanup mechanism with verification step.

### Rationale

- **Atomic**: Delete namespace → Kubernetes cascades deletion to all resources
- **Reliable**: No orphaned resources (pods, services, PVCs all deleted)
- **Simple**: One kubectl command vs. individual resource deletion

### Cleanup Workflow

1. On PR closed event:
   ```bash
   kubectl delete namespace preview-pr-{PR_NUMBER} --wait=true --timeout=5m
   ```

2. Verify PVCs removed:
   ```bash
   kubectl get pvc -n preview-pr-{PR_NUMBER} --no-headers | wc -l  # Should be 0
   ```

3. Update PR comment with deletion status

### Orphan Prevention

- Set `finalizers` on namespace to block deletion until child resources removed
- GitHub Actions workflow waits for deletion to complete (timeout 5 min)
- Alert on failure (Slack/email if namespace deletion times out)

---

## 10. Observability and Debugging

### Decision

- **GitHub Actions logs**: Primary source for deployment debugging
- **PR comments**: High-level status updates
- **Kubernetes events**: Available via `kubectl describe` for deep debugging

### Implementation

- Log all kubectl commands with `-v=6` verbosity in GitHub Actions
- Post deployment failures to PR comments with error excerpt
- Provide kubectl access instructions in PR comment for maintainers

---

## 11. Build-Once-Deploy-Many Strategy (NEW)

### Decision

Use **immutable container images** with digest-based promotion from preview to production.

### Rationale

- **Consistency**: Identical artifact tested in preview deploys to production
- **No rebuild risk**: Production doesn't rebuild images (eliminates build-time variations)
- **Auditability**: Track exact image digest from preview → production
- **Speed**: Production deployment skips build step (faster deployments)
- **Trust**: What you test is what you deploy

### Implementation Pattern

#### Image Build Workflow

**`.github/workflows/build.yml`** (runs on every PR commit):

```yaml
on:
  pull_request:
    branches: [master]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      web_digest: ${{ steps.build-web.outputs.digest }}
      api_digest: ${{ steps.build-api.outputs.digest }}
    steps:
      - name: Build and push web image
        id: build-web
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./infrastructure/docker/runtime/web/Dockerfile
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/web:${{ github.sha }}
            ghcr.io/${{ github.repository }}/web:pr-${{ github.event.pull_request.number }}

      - name: Build and push API image
        id: build-api
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./infrastructure/docker/runtime/api/Dockerfile
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/api:${{ github.sha }}
            ghcr.io/${{ github.repository }}/api:pr-${{ github.event.pull_request.number }}
```

**Key points**:
- Images pushed to GitHub Container Registry (ghcr.io)
- Tagged with both SHA and PR number
- Build outputs digest (immutable identifier)
- Runs automatically (no secrets needed for public registry)

#### Preview Deployment References Image Digest

Preview deployment uses the image digest from build step:

```yaml
# In preview-deploy.yml
jobs:
  deploy-preview:
    needs: build  # Wait for build to complete
    environment: preview-pr-${{ github.event.pull_request.number }}
    steps:
      - name: Deploy to preview
        env:
          WEB_IMAGE: ghcr.io/${{ github.repository }}/web@${{ needs.build.outputs.web_digest }}
          API_IMAGE: ghcr.io/${{ github.repository }}/api@${{ needs.build.outputs.api_digest }}
        run: |
          # Kustomize uses digest, not tag
          kubectl set image deployment/web web=$WEB_IMAGE -n preview-pr-${{ github.event.pull_request.number }}
```

#### Production Promotion References Same Digest

When PR merges, production deployment uses the digest that was tested in preview:

```yaml
# In production-deploy.yml (triggered on merge to master)
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    steps:
      - name: Get image digest from merged PR
        id: get-digest
        run: |
          # Read digest from PR metadata or GitHub API
          WEB_DIGEST=$(gh api repos/${{ github.repository }}/pulls/${{ github.event.pull_request.number }} \
            --jq '.labels[] | select(.name | startswith("image-digest/web:")) | .name | split(":")[1]')
          echo "web_digest=$WEB_DIGEST" >> $GITHUB_OUTPUT

      - name: Deploy to production
        env:
          WEB_IMAGE: ghcr.io/${{ github.repository }}/web@${{ steps.get-digest.outputs.web_digest }}
          API_IMAGE: ghcr.io/${{ github.repository }}/api@${{ steps.get-digest.outputs.api_digest }}
        run: |
          kubectl set image deployment/web web=$WEB_IMAGE -n production
```

### Digest Tracking Mechanism

**Option A: PR Labels** (Recommended)
- After preview deployment, add PR label: `image-digest/web:sha256:abc123...`
- Production workflow reads labels from merged PR
- Simple, visible in GitHub UI
- No external state storage

**Option B: Git Commit Annotations**
- Store digest in git notes or commit metadata
- Requires git notes push/pull
- More complex, less visible

**Option C: Artifact Metadata**
- Store digest in GitHub Actions artifact
- Download artifact in production workflow
- Requires artifact retention

**Decision**: Use PR labels (Option A) for visibility and simplicity.

### Environment-Specific Configuration

**Runtime configuration** (not baked into images):

```yaml
# Preview environment ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: preview-pr-123
data:
  ENV: "preview"
  BASE_URL: "https://123.pr.aphiria.com"
  DATABASE_HOST: "postgres.preview-pr-123.svc.cluster.local"

---
# Production environment ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  ENV: "production"
  BASE_URL: "https://www.aphiria.com"
  DATABASE_HOST: "postgres.production.svc.cluster.local"
```

Same image, different config at runtime.

### Registry Organization

```
ghcr.io/aphiria/aphiria.com/
├── web:
│   ├── sha256:abc123...  (digest - immutable)
│   ├── latest            (tag - mutable, points to production)
│   ├── master            (tag - latest merged to master)
│   ├── pr-123            (tag - latest build from PR 123)
│   └── abc1234def...     (tag - git SHA)
└── api:
    └── (same structure)
```

**Deployment targets digest, not tags**: `web@sha256:abc123...` ensures immutability.

---

## Summary of Technical Decisions

| Area | Decision | Primary Benefit |
|------|----------|-----------------|
| Database | Namespace-isolated PostgreSQL StatefulSets | Complete isolation, production parity |
| Security | GitHub environment protection rules | Native fork safety, secrets scoping |
| Networking | Ingress + wildcard TLS cert | No rate limits, fast provisioning |
| Orchestration | Kustomize | Already in use, simple templating |
| Cleanup | Namespace deletion | Atomic, reliable resource removal |
| State | PR comments | User-visible, no external dependencies |
| **Build Strategy** | **Build-once, digest-based promotion** | **Identical artifacts preview → production** |
| **Image Registry** | **GitHub Container Registry (ghcr.io)** | **Native GitHub integration, free for public repos** |
| **Promotion Tracking** | **PR labels with image digests** | **Simple, visible, no external state** |

All NEEDS CLARIFICATION items from Technical Context resolved. Proceed to Phase 1.
