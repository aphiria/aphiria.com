# Production Cluster Upgrade

## Current Status

- **Production cluster**: `aphiria-com-cluster` (ID: `c0bc903e-71c8-421d-8bce-0a2092731e0f`)
  - Current version: `1.34.1-do.0`
  - Target version: `1.34.1-do.2`

- **Preview cluster**: `aphiria-com-preview-cluster`
  - Version: `1.34.1-do.2` (required for new cluster creation)

## Why Upgrade?

DigitalOcean has deprecated `1.34.1-do.0` and only accepts `1.34.1-do.2` for new cluster creation. To keep preview and production clusters in sync, production needs to be upgraded.

**This is a patch-level change only** - both versions run Kubernetes 1.34.1. The `-do.X` suffix is DigitalOcean's internal patch level.

## Upgrade Steps

### 1. Pre-upgrade checks

```bash
# Verify current version
doctl kubernetes cluster get c0bc903e-71c8-421d-8bce-0a2092731e0f --format Version

# Check cluster health
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running
```

### 2. Perform upgrade

```bash
# Upgrade production cluster
doctl kubernetes cluster upgrade c0bc903e-71c8-421d-8bce-0a2092731e0f --version 1.34.1-do.2
```

**Expected duration**: 15-30 minutes
**Downtime**: Rolling upgrade - minimal to no downtime for properly configured applications

### 3. Monitor upgrade

```bash
# Watch cluster status
doctl kubernetes cluster get c0bc903e-71c8-421d-8bce-0a2092731e0f --format Status,Version

# Watch node upgrades
kubectl get nodes -w
```

### 4. Post-upgrade verification

```bash
# Verify version
doctl kubernetes cluster get c0bc903e-71c8-421d-8bce-0a2092731e0f --format Version

# Check nodes
kubectl get nodes

# Check all pods
kubectl get pods --all-namespaces

# Test application
curl https://aphiria.com
curl https://api.aphiria.com/health  # if health endpoint exists
```

## Rollback Plan

If issues occur:

1. **Node issues**: DigitalOcean manages the rollback - nodes will remain on previous version if upgrade fails
2. **Application issues**: Roll back application deployments (not the cluster):
   ```bash
   kubectl rollout undo deployment/web
   kubectl rollout undo deployment/api
   ```

## Impact Assessment

- **Risk**: Low (patch-level upgrade within same Kubernetes minor version)
- **Downtime**: Minimal (rolling node upgrades)
- **Affected services**: None expected (backward compatible)

## Timeline

**Recommended**: Perform during low-traffic period (e.g., weekend)

## Post-Upgrade

After successful upgrade, verify that:
- [ ] Production cluster version is `1.34.1-do.2`
- [ ] All nodes are healthy
- [ ] All pods are running
- [ ] Website is accessible
- [ ] No errors in application logs

---

**Last updated**: 2025-12-21
