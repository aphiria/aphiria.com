# Secrets Management

This document describes all GitHub repository secrets used by CI/CD workflows and their rotation procedures.

**Audience**: Repository maintainers only

---

## Required Secrets

| Secret Name | Purpose | Rotation Schedule | Used By |
|-------------|---------|-------------------|---------|
| `GHCR_TOKEN` | Push Docker images to ghcr.io | Annually | `build-preview-images.yml` |
| `PULUMI_ACCESS_TOKEN` | Manage infrastructure state in Pulumi Cloud | Annually | `preview-deploy.yml`, `preview-cleanup.yml` |
| `KUBECONFIG` | Access DigitalOcean Kubernetes cluster | When cluster credentials change | `preview-deploy.yml`, `preview-cleanup.yml` |
| `POSTGRESQL_ADMIN_PASSWORD` | Create/manage preview databases | Quarterly | `preview-deploy.yml` |
| `POSTGRESQL_ADMIN_USER` | PostgreSQL username (optional, defaults to `postgres`) | N/A | `preview-deploy.yml` |

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

### KUBECONFIG

**Generate new kubeconfig**:

1. https://cloud.digitalocean.com
2. Kubernetes → Your cluster → "Download Config File"
3. Base64 encode it:
   ```bash
   cat ~/Downloads/your-cluster-kubeconfig.yaml | base64 -w 0
   ```
4. Copy the output

**Update repository secret**:

1. https://github.com/aphiria/aphiria.com/settings/secrets/actions
2. Click `KUBECONFIG` (or "New repository secret")
3. Paste base64-encoded value
4. Save

**Test**: Check "Ensure base stack exists" step in preview-deploy.yml logs

---

### POSTGRESQL_ADMIN_PASSWORD

**Generate new password**:

```bash
openssl rand -base64 32
```

**Update repository secret**:

1. https://github.com/aphiria/aphiria.com/settings/secrets/actions
2. Click `POSTGRESQL_ADMIN_PASSWORD` (or "New repository secret")
3. Paste new password
4. Save

**Update database password** (critical step):

```bash
kubectl config use-context <digitalocean-cluster>
PG_POD=$(kubectl get pods -l app=postgresql -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $PG_POD -- psql -U postgres -c "ALTER USER postgres PASSWORD 'NEW_PASSWORD';"
```

**Test**: Deploy a preview environment, verify database migrations succeed

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
| Authentication failed (build-preview-images.yml) | Invalid `GHCR_TOKEN` | Rotate token |
| Pulumi login failed | Invalid `PULUMI_ACCESS_TOKEN` | Rotate token |
| Unable to connect to cluster | Invalid `KUBECONFIG` | Download fresh kubeconfig from DigitalOcean |
| Database connection errors | Password mismatch | Update secret or database password |

---

**Last Updated**: 2025-12-20
