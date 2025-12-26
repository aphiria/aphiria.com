# Secrets Management

This document describes all GitHub repository secrets used by CI/CD workflows and their rotation procedures.

**Audience**: Repository maintainers only

---

## Required Secrets

### GitHub Repository Secrets

| Secret Name | Purpose | Rotation Schedule | Used By |
|-------------|---------|-------------------|---------|
| `PULUMI_ACCESS_TOKEN` | Manage infrastructure state in Pulumi Cloud | Annually | `preview-deploy.yml`, `preview-cleanup.yml` |
| `WORKFLOW_DISPATCH_TOKEN` | Trigger preview deployment workflow from build workflow | Annually | `build-preview-images.yml` |

**Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions for pushing Docker images to ghcr.io. No manual secret configuration required.

### Pulumi ESC Secrets

These secrets are stored in Pulumi ESC environments (`aphiria.com/Preview` and `aphiria.com/Production`) and used at runtime by infrastructure and Kubernetes clusters.

| Secret Name | Purpose | Rotation Schedule |
|-------------|---------|-------------------|
| `digitalocean:token` | DigitalOcean API access for cluster management (Kubernetes cluster creation) | Annually |
| `certmanager:digitaloceanDnsToken` | DigitalOcean API access for DNS management (cert-manager DNS-01 ACME challenges for wildcard TLS) | Annually |
| `ghcr:token` | Pull Docker images from ghcr.io (Kubernetes imagePullSecret) | Annually |
| `ghcr:username` | GitHub username for GHCR authentication | N/A (only update if username changes) |
| `postgresql:user` | PostgreSQL admin user | N/A |
| `postgresql:password` | PostgreSQL admin password | Quarterly |

---

## Rotation Procedures

### GHCR Token (Pulumi ESC - Kubernetes Image Pulling)

**Why this is needed**: Kubernetes clusters need credentials to pull private Docker images from ghcr.io. This token is configured in Pulumi ESC and injected into Kubernetes imagePullSecrets at runtime.

**Generate new token**:

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

---

### certmanager:digitaloceanDnsToken

**Why this is needed**: cert-manager requires DigitalOcean DNS API access to create TXT records for ACME DNS-01 challenges when provisioning wildcard TLS certificates (`*.pr.aphiria.com`, `*.pr-api.aphiria.com`). Wildcard certificates cannot use HTTP-01 validation and must use DNS-01.

**Generate new token**:

1. https://cloud.digitalocean.com/account/api/tokens
2. Click "Generate New Token"
3. Token name: `cert-manager DNS-01 (aphiria.com)`
4. **Scopes** (REQUIRED - select these exact scopes):
   - Under **"Scopes"** dropdown, select **"Custom Scopes"**
   - Expand **"domain"** section
   - ✅ Enable **"domain:read"** (allows cert-manager to query existing DNS records)
   - ✅ Enable **"domain:create"** (allows cert-manager to create TXT records for ACME challenge)
   - ✅ Enable **"domain:delete"** (allows cert-manager to cleanup TXT records after validation)
   - Leave all other scopes disabled (droplet, kubernetes, etc. are not needed)
5. Expiration: No expiration (or set custom expiration date)
6. Click "Generate Token"
7. Copy the token (starts with `dop_v1_`)

**Alternative: If Custom Scopes not available, use Full Access**:
   - Select **"Full Access"** (read + write to all resources)
   - Note: This grants broader permissions than needed, but is acceptable for cert-manager use case

**Configure in Pulumi ESC**:

```bash
# Navigate to Pulumi directory
cd infrastructure/pulumi

# Configure for Preview environment
pulumi env set aphiria.com/Preview certmanager:digitaloceanDnsToken "dop_v1_YOUR_TOKEN_HERE" --secret

# Verify it's set
pulumi env get aphiria.com/Preview
# Should show: certmanager:digitaloceanDnsToken: [secret]

# Configure for Production environment (when ready)
pulumi env set aphiria.com/Production certmanager:digitaloceanDnsToken "dop_v1_YOUR_TOKEN_HERE" --secret
```

**Test**:

1. Deploy preview-base stack:
   ```bash
   cd infrastructure/pulumi
   pulumi up --stack preview-base
   ```

2. Verify cert-manager can access DNS API:
   ```bash
   # Get kubeconfig
   pulumi stack output kubeconfig --stack preview-base --show-secrets > /tmp/preview-kubeconfig.yaml

   # Check Secret exists
   kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml get secret -n cert-manager digitalocean-dns-token

   # Check Certificate status (should transition to Ready within 2-5 minutes)
   kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml get certificate -n nginx-gateway

   # Check cert-manager logs if issues
   kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml logs -n cert-manager -l app=cert-manager --tail=50
   ```

3. Expected result: Certificate shows `READY: True`, wildcard cert Secret created

**Security Notes**:
- Minimum required scopes: `domain:read`, `domain:create`, `domain:delete`
- This token grants DNS write access to your entire `aphiria.com` domain
- Store securely in Pulumi ESC (never commit to git)
- Rotate annually or if compromised

**Cleanup**: Delete old token at https://cloud.digitalocean.com/account/api/tokens

---

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
| Authentication failed (build-preview-images.yml) | `GITHUB_TOKEN` permissions issue | Verify `packages: write` permission in workflow |
| ImagePullBackOff / 401 Unauthorized (Kubernetes pods) | Invalid `ghcr:token` in Pulumi ESC | Add/update token in Pulumi ESC environments |
| Pulumi login failed | Invalid `PULUMI_ACCESS_TOKEN` | Rotate token |
| workflow_dispatch trigger fails (403 error) | Invalid `WORKFLOW_DISPATCH_TOKEN` | Rotate token |
| DNS records not created | Invalid `digitalocean:token` in Pulumi ESC | Add/update token in Pulumi ESC environments |

---

**Last Updated**: 2025-12-23
