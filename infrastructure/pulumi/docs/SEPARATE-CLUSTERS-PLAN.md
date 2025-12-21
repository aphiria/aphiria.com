# Plan: Separate Preview and Production Clusters

## Current Architecture (Problem)

**Single DigitalOcean cluster** hosting both:
- Production (aphiria.com, api.aphiria.com)
- Preview environments (*.pr.aphiria.com, *.pr-api.aphiria.com)

**Issues**:
- Resource conflicts (both stacks trying to install cert-manager, nginx-gateway, etc.)
- Production and preview share PostgreSQL instance
- Production and preview share Gateway
- Security: Preview PRs run in same cluster as production data
- No isolation between environments

## Proposed Architecture (Solution)

**Two separate DigitalOcean clusters**:

### Cluster 1: Production Cluster (EXISTING - KEEP)
- **Name**: `aphiria-com-cluster` (**existing cluster, already running**)
- **Purpose**: Production website only
- **Domains**: aphiria.com, *.aphiria.com
- **Nodes**: 2x s-2vcpu-2gb (currently configured)
- **Managed by**: Pulumi production stack
- **Action**: Import into production stack (already exists in DigitalOcean)

### Cluster 2: Preview Cluster (NEW - CREATE)
- **Name**: `aphiria-com-preview-cluster` (**new cluster to create**)
- **Purpose**: All PR preview environments
- **Domains**: *.pr.aphiria.com, *.pr-api.aphiria.com
- **Nodes**: 1x s-2vcpu-2gb (auto-scale 1-3) - smaller/cheaper
- **Managed by**: Pulumi preview-base stack
- **Action**: Create new cluster via Pulumi

## Pulumi Stack Changes

### Current Stacks (3)
1. `local` - Minikube (no changes)
2. `production` - Cluster + Production app (CONFLICT)
3. `preview-base` - Shared preview infra (CONFLICT)
4. `preview-pr-{N}` - Per-PR environments (no changes)

### New Stacks (4)
1. `local` - Minikube (✅ no changes)
2. **`production`** - Production cluster + Production application
3. **`preview-base`** - Preview cluster + Shared preview infrastructure
4. `preview-pr-{N}` - Per-PR environments (✅ no changes)

## Detailed Changes

### 1. Production Stack (`stacks/production.ts`)

**Current**: Cluster code defined but not in Pulumi state + Helm + PostgreSQL + Gateway + Web/API

**New**: Import existing cluster + Full production infrastructure (NO CHANGES TO CLUSTER)

```typescript
// 1. Import existing production cluster (aphiria-com-cluster)
const cluster = new digitalocean.KubernetesCluster("aphiria-com-cluster", {
    name: "aphiria-com-cluster",
    region: digitalocean.Region.NYC3,
    version: "1.34.1-do.0",
    nodePool: {
        name: "worker-pool",
        size: "s-2vcpu-2gb",
    },
    vpcUuid: "976f980d-dc84-11e8-80bc-3cfdfea9fba1",
}, {
    protect: true,
});

// 2-9. Install Helm, PostgreSQL, Gateway, Web, API (same as before)
// Domains: aphiria.com, *.aphiria.com
```

**Action**: Import existing cluster using `pulumi import` or `pulumi up` with existing resources

**Note**: Cluster already exists and is running production. No cluster creation needed.

### 2. Preview-Base Stack (`stacks/preview-base.ts`)

**Current**: References production cluster via StackReference + NO infrastructure

**New**: Create NEW preview cluster + Full preview infrastructure

```typescript
// 1. Create NEW preview cluster (does not exist yet)
const cluster = new digitalocean.KubernetesCluster("aphiria-com-preview-cluster", {
    name: "aphiria-com-preview-cluster",
    region: digitalocean.Region.NYC3,
    version: "1.34.1-do.0",
    nodePool: {
        name: "preview-pool",
        size: "s-2vcpu-2gb",
        nodeCount: 1,
        autoScale: true,
        minNodes: 1,
        maxNodes: 3,
    },
    vpcUuid: "976f980d-dc84-11e8-80bc-3cfdfea9fba1",
}, {
    protect: true,
});

// 2. Create Kubernetes provider
const k8sProvider = new k8s.Provider("preview-k8s", {
    kubeconfig: cluster.kubeConfigs[0].rawConfig,
});

// 3-6. Install Helm, PostgreSQL, Gateway (same pattern as production)
// Domains: *.pr.aphiria.com, *.pr-api.aphiria.com
```

**Action**: Create new cluster via `pulumi up --stack preview-base`

### 3. Preview-PR Stack (`stacks/preview-pr.ts`)

**Current**: References preview-base for gateway/postgres

**New**: No changes (still references preview-base)

## DNS Changes

### Current DNS
All in DigitalOcean DNS for `aphiria.com`:
- `aphiria.com` → Production cluster LoadBalancer
- `*.aphiria.com` → Production cluster LoadBalancer
- `*.pr.aphiria.com` → Production cluster LoadBalancer (CONFLICT)

### New DNS
Split across two cluster LoadBalancers:

**Production Cluster LoadBalancer** (e.g., 159.65.123.45):
```
A       aphiria.com                  159.65.123.45
A       *.aphiria.com                159.65.123.45
CNAME   www.aphiria.com              aphiria.com
CNAME   api.aphiria.com              aphiria.com
```

**Preview Cluster LoadBalancer** (e.g., 159.65.67.89):
```
A       *.pr.aphiria.com             159.65.67.89
A       *.pr-api.aphiria.com         159.65.67.89
```

**Action Required**: After deploying both clusters, update DigitalOcean DNS with both LoadBalancer IPs.

## Workflow Changes

### Current: preview-deploy.yml

```yaml
- name: Setup kubeconfig from Pulumi
  run: |
    pulumi stack output kubeconfig --stack production > ~/.kube/config
```

### New: preview-deploy.yml

```yaml
- name: Setup kubeconfig from Pulumi (Preview Cluster)
  run: |
    pulumi stack output kubeconfig --stack preview-base > ~/.kube/config
```

**Change**: Reference `preview-base` stack instead of `production` for kubeconfig

### New: production-deploy.yml (Future)

```yaml
- name: Setup kubeconfig from Pulumi (Production Cluster)
  run: |
    pulumi stack output kubeconfig --stack production > ~/.kube/config

- name: Deploy production
  run: pulumi up --stack production --yes
```

## Migration Steps

### Phase 1: Import Existing Production Cluster ✅ Safe

1. Cluster already exists (`aphiria-com-cluster`) and is running
2. Code already references cluster in `stacks/production.ts`
3. Import cluster into Pulumi state:
   ```bash
   pulumi import digitalocean:index/kubernetesCluster:KubernetesCluster aphiria-com-cluster c0bc903e-71c8-421d-8bce-0a2092731e0f
   ```
4. Or alternatively, skip import for now and deploy other resources (cluster will show as needing creation but won't actually create since it exists)
5. Verify production stack preview shows no changes to cluster
6. Deploy production infrastructure: `pulumi up --stack production`

**Risk**: Very Low - No cluster changes, just importing existing state

**Status**: Code ready, import pending (Pulumi provider API issue)

### Phase 2: Create New Preview Cluster

1. Update `stacks/preview-base.ts` to create new preview cluster
2. Remove StackReference to production cluster
3. Add full infrastructure components (Helm, PostgreSQL, Gateway)
4. Run `pulumi preview --stack preview-base` (should show new cluster creation + infrastructure)
5. Run `pulumi up --stack preview-base` (creates new preview cluster)
6. Get preview LoadBalancer IP from cluster
7. Update DNS: `*.pr.aphiria.com`, `*.pr-api.aphiria.com` → preview LoadBalancer IP
8. Test preview deployment on a PR

**Risk**: Low - New cluster, doesn't affect production

### Phase 3: Update Workflows

1. Update `preview-deploy.yml` to use preview-base kubeconfig instead of production
2. Create `production-deploy.yml` for production deployments (optional - can deploy manually)
3. Test preview workflow on a PR
4. Verify production and preview are completely isolated

**Risk**: Low - Just workflow changes

## Cost Impact

### Current: 1 Cluster
- 1x cluster (`aphiria-com-cluster`): 2 nodes @ s-2vcpu-2gb = ~$24/month
- Total: **~$24/month**

### New: 2 Clusters
- Production (`aphiria-com-cluster`): 2 nodes @ s-2vcpu-2gb = ~$24/month (existing, no change)
- Preview (`aphiria-com-preview-cluster`): 1 node @ s-2vcpu-2gb (auto-scales) = ~$12/month (base)
- Total: **~$36/month**

**Increase**: ~$12/month (~50% increase)

**Tradeoff**:
- ✅ Clean architecture
- ✅ Production isolation
- ✅ No resource conflicts
- ✅ Better security
- ❌ Higher cost

## Security Benefits

**Current (Shared Cluster)**:
- ❌ Preview PRs run in same cluster as production
- ❌ Malicious PR could potentially access production resources
- ❌ Shared PostgreSQL instance

**New (Separate Clusters)**:
- ✅ Complete network isolation between preview and production
- ✅ Preview PRs cannot access production cluster
- ✅ Separate databases, gateways, secrets
- ✅ Can apply different RBAC policies per cluster

## Resource Organization

### Production Cluster Resources
- Namespace: `default`
- Helm: cert-manager, nginx-gateway-fabric
- PostgreSQL: 2 replicas, 20Gi storage
- Gateway: nginx-gateway (aphiria.com, *.aphiria.com)
- Deployments: web (2 replicas), api (2 replicas)

### Preview Cluster Resources
- Namespace: `default` (shared) + per-PR namespaces
- Helm: cert-manager, nginx-gateway-fabric
- PostgreSQL: 1 replica, 20Gi storage (shared, separate DBs per PR)
- Gateway: nginx-gateway (*.pr.aphiria.com, *.pr-api.aphiria.com)
- Deployments: per-PR web/api (1 replica each)

## Rollback Plan

If something goes wrong during migration:

1. **DNS rollback**: Point aphiria.com back to old cluster LoadBalancer
2. **Workflow rollback**: Revert preview-deploy.yml to use production stack
3. **Keep old cluster running** until new setup is verified
4. **Parallel operation**: Run both clusters during migration for safety

## Questions to Answer Before Proceeding

1. **Budget approval**: OK with ~$12/month increase? (Much lower than original ~$36 estimate)
2. **Production cluster**: Keep existing `aphiria-com-cluster` (no changes, no downtime)
3. **Preview cluster naming**: Create new `aphiria-com-preview-cluster`
4. **VPC**: Keep both clusters in same VPC (976f980d-dc84-11e8-80bc-3cfdfea9fba1)? ✅ Yes
5. **DNS cutover**: Only for preview environments (*.pr.aphiria.com) - no production impact

## Next Steps (If Approved)

1. ✅ **Approve this plan**
2. Update spec with new architecture
3. Import existing production cluster into Pulumi state (or skip if import fails)
4. Update `stacks/preview-base.ts` to create new preview cluster
5. Deploy preview-base stack: `pulumi up --stack preview-base` (creates new cluster)
6. Get preview LoadBalancer IP
7. Update DNS for preview: `*.pr.aphiria.com`, `*.pr-api.aphiria.com` → new IP
8. Update `preview-deploy.yml` workflow to use preview-base kubeconfig
9. Test preview deployment on a PR
10. Verify production and preview are isolated
11. Clean up documentation

---

**Recommendation**: Proceed with this plan. The architecture is much cleaner, more secure, and eliminates all resource conflicts. The cost increase is minimal (~$12/month) and there's ZERO risk to production.

**Estimated Implementation Time**: 1-2 hours with testing

**Risk Level**: Very Low (production cluster untouched, only creating new preview infrastructure)

**Reward**: Clean, maintainable, secure architecture with complete isolation

---

**Last Updated**: 2025-12-21
**Status**: Updated - Revised to use existing cluster for production (lower cost, lower risk)
**Key Change**: Keep `aphiria-com-cluster` for production (no changes), create NEW `aphiria-com-preview-cluster`
