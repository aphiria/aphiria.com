# Secrets Management

This document describes all GitHub repository secrets used by CI/CD workflows and their rotation procedures.

**Audience**: Repository maintainers only

---

## Required Secrets

### GitHub Repository Secrets

| Secret Name | Purpose | Rotation Schedule | Used By |
|-------------|---------|-------------------|---------|
| `GHCR_TOKEN` | Push Docker images to ghcr.io (CI/CD) | Annually | `build-preview-images.yml` |
| `PULUMI_ACCESS_TOKEN` | Manage infrastructure state in Pulumi Cloud | Annually | `preview-deploy.yml`, `preview-cleanup.yml` |
| `WORKFLOW_DISPATCH_TOKEN` | Trigger preview deployment workflow from build workflow | Annually | `build-preview-images.yml` |

### Pulumi ESC Secrets

These secrets are stored in Pulumi ESC environments (`aphiria.com/Preview` and `aphiria.com/Production`) and used at runtime by infrastructure and Kubernetes clusters.

| Secret Name | Purpose | Rotation Schedule |
|-------------|---------|-------------------|
| `digitalocean:token` | DigitalOcean API access for DNS, cluster management | Annually |
| `ghcr:token` | Pull Docker images from ghcr.io (Kubernetes imagePullSecret) | Annually |
| `ghcr:username` | GitHub username for GHCR authentication | N/A (only update if username changes) |
| `postgresql:user` | PostgreSQL admin user | N/A |
| `postgresql:password` | PostgreSQL admin password | Quarterly |

---

## Rotation Procedures

### GHCR_TOKEN

**Why this is needed**: External contributors' `GITHUB_TOKEN` can't push to your ghcr.io registry. A Personal Access Token ensures all builds work.

**Generate new token**:

1. https://github.com/settings/tokens
2. "Generate new token (classic)"
3. Name: `GHCR Package Write (aphiria.com)`
4. Scopes: `write:packages`, `read:packages`, `delete:packages` (optional)
5. Expiration: No expiration (or 1 year)
6. Copy the token

**Update repository secret**:

1. https://github.com/aphiria/aphiria.com/settings/secrets/actions
2. Click `GHCR_TOKEN` (or "New repository secret")
3. Paste new token value
4. Save

**Test**: Push a commit to any PR, verify "Build Preview Images" workflow succeeds

**Cleanup**: Delete old token at https://github.com/settings/tokens

---

### GHCR_TOKEN (Pulumi ESC - Kubernetes Image Pulling)

**Why this is needed**: Kubernetes clusters need credentials to pull private Docker images from ghcr.io. This token is configured in Pulumi ESC and injected into Kubernetes imagePullSecrets at runtime.

**Note**: This uses the **same token** as the repository secret `GHCR_TOKEN` above, but it must be configured in **both** Pulumi ESC environments (`aphiria.com/Preview` and `aphiria.com/Production`).

**Generate new token** (if not already created):

1. https://github.com/settings/tokens
2. "Generate new token (classic)"
3. Name: `GHCR Package Read/Write (aphiria.com)`
4. Scopes: `read:packages`, `write:packages`
5. Expiration: No expiration (or 1 year)
6. Copy the token

**Configure in Pulumi ESC environments**:

```bash
# Configure for Preview environment
pulumi config set ghcr:token --secret --stack preview-base
# When prompted, paste the GHCR_TOKEN value

pulumi config set ghcr:username <your-github-username> --stack preview-base

# Configure for Production environment (when production stack is created)
pulumi config set ghcr:token --secret --stack production
pulumi config set ghcr:username <your-github-username> --stack production
```

**Alternative: Configure via Pulumi ESC UI**:

1. Navigate to https://app.pulumi.com/[your-org]/settings/environments
2. Select `aphiria.com/Preview` environment
3. Add/update values:
   - `ghcr:token` (mark as secret)
   - `ghcr:username`
4. Repeat for `aphiria.com/Production` environment

**Test**: Deploy a preview environment, verify pods successfully pull images from ghcr.io

```bash
kubectl get pods -n preview-pr-XXX
# Pods should be Running, not ImagePullBackOff
```

**Cleanup**: Delete old token at https://github.com/settings/tokens (ensure new token works first)

---

### WORKFLOW_DISPATCH_TOKEN

**Why this is needed**: The default `GITHUB_TOKEN` cannot trigger workflow_dispatch events (GitHub security policy to prevent infinite loops). A Personal Access Token with `workflow` scope is required to trigger the preview deployment workflow from the build workflow.

**Generate new token**:

1. https://github.com/settings/tokens
2. "Generate new token (classic)"
3. Name: `Workflow Dispatch (aphiria.com)`
4. Scopes: `workflow` (or `public_repo` + `workflow` for public repos)
5. Expiration: No expiration (or 1 year)
6. Copy the token

**Update repository secret**:

1. https://github.com/aphiria/aphiria.com/settings/secrets/actions
2. Click `WORKFLOW_DISPATCH_TOKEN` (or "New repository secret")
3. Paste new token value
4. Save

**Test**: Push a commit to any PR, verify "Build Preview Images" workflow triggers "Deploy Preview Environment" workflow

**Cleanup**: Delete old token at https://github.com/settings/tokens

---

### PULUMI_ACCESS_TOKEN

**Generate new token**:

1. https://app.pulumi.com/settings/tokens
2. "Create token"
3. Name: `GitHub Actions - aphiria.com`
4. Copy the token

**Update repository secret**:

1. https://github.com/aphiria/aphiria.com/settings/secrets/actions
2. Click `PULUMI_ACCESS_TOKEN` (or "New repository secret")
3. Paste new token value
4. Save

**Test**: Trigger preview deployment workflow manually or merge a PR

**Cleanup**: Delete old token at https://app.pulumi.com/settings/tokens

## Emergency Rotation

If a secret is compromised:

1. Revoke the compromised credential immediately
2. Generate a new credential (see procedures above)
3. Update the GitHub repository secret
4. Test workflows still function
5. Audit logs for unauthorized access

---

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| Authentication failed (build-preview-images.yml) | Invalid `GHCR_TOKEN` repository secret | Rotate token |
| ImagePullBackOff / 401 Unauthorized (Kubernetes pods) | Invalid `ghcr:token` in Pulumi ESC | Add/update token in Pulumi ESC environments |
| Pulumi login failed | Invalid `PULUMI_ACCESS_TOKEN` | Rotate token |
| workflow_dispatch trigger fails (403 error) | Invalid `WORKFLOW_DISPATCH_TOKEN` | Rotate token |
| DNS records not created | Invalid `digitalocean:token` in Pulumi ESC | Add/update token in Pulumi ESC environments |

---

**Last Updated**: 2025-12-23
