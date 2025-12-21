# GitHub Actions Secrets Setup Guide

This document explains how to configure the required secrets for ephemeral preview environments.

## Understanding Secret Types

**Repository Secrets** vs **Environment Secrets**:

| Type | Access | Security | Use Case |
|------|--------|----------|----------|
| **Repository Secret** | Any workflow | Available to all branches/PRs | Non-sensitive values, public builds |
| **Environment Secret** | Only workflows targeting that environment | Requires approval to access | Sensitive credentials (cluster access, tokens) |

**For open-source repositories like Aphiria**, we use **Environment Secrets** with approval requirements to prevent untrusted PRs from accessing sensitive infrastructure.

---

## Step 1: Create Protected "preview" Environment

Before adding secrets, create the protected environment:

1. Go to: `https://github.com/aphiria/aphiria.com/settings/environments`
2. Click **"New environment"**
3. Name: `preview`
4. Configure protection rules:
   - ✅ Check **"Required reviewers"**
   - Add yourself and any other maintainers who can approve deployments
   - (Optional) Set deployment branches to `*` or specific patterns
5. Click **"Save protection rules"**

This ensures preview deployments **require manual approval**, preventing untrusted PRs from accessing cluster credentials.

---

## Step 2: Add Repository Secret (Public Builds)

The following secret is used for Docker image builds, which run **before** approval on all PRs:

---

### `DOCKER_ACCESS_TOKEN` (Repository Secret)

**Type**: 🌍 **Repository Secret** (accessible to all workflows)

**Purpose**: Authenticate to GitHub Container Registry (ghcr.io) for pushing Docker images

**Why repository secret?**: Image builds run automatically on all PRs **before approval**. This is safe because:
- Only writes to container registry (no cluster access)
- Images are tagged per-PR and isolated
- No sensitive infrastructure accessed

**How to create**:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: `Aphiria Preview Environments`
4. Scopes: Select `write:packages`, `read:packages`, `delete:packages`
5. Click "Generate token"
6. Copy the token immediately (you won't be able to see it again)

**How to add as Repository Secret**:
1. Go to `https://github.com/aphiria/aphiria.com/settings/secrets/actions`
2. Click **"New repository secret"**
3. Name: `DOCKER_ACCESS_TOKEN`
4. Value: Paste the token from above
5. Click "Add secret"

---

## Step 3: Add Environment Secrets (Protected Deployments)

The following secrets are used for preview deployments and **require approval** to access:

Add these to the **`preview` environment** (NOT repository secrets):

---

### `POSTGRESQL_ADMIN_PASSWORD` (Environment Secret)

**Purpose**: Admin password for the ephemeral PostgreSQL instance (separate from production)

**Option A - Use existing production password** (if you want consistency):
```bash
# Retrieve from your production cluster
kubectl get secret env-var-secrets -o jsonpath='{.data.DB_PASSWORD}' | base64 -d
```

**Option B - Generate new password** (recommended for isolation):
```bash
# Generate a secure random password
openssl rand -base64 32
```

**Type**: 🔒 **Environment Secret** (`preview` environment)

**How to add as Environment Secret**:
1. Go to `https://github.com/aphiria/aphiria.com/settings/environments`
2. Click on the **`preview`** environment
3. Scroll to **"Environment secrets"**
4. Click **"Add secret"**
5. Name: `POSTGRESQL_ADMIN_PASSWORD`
6. Value: Paste the password from above
7. Click "Add secret"

---

### `POSTGRESQL_ADMIN_USER` (Environment Secret - Optional)

**Type**: 🔒 **Environment Secret** (`preview` environment)

**Purpose**: Admin username for PostgreSQL (defaults to `postgres` if not set)

**Default**: `postgres`

**Only set this if**:
- Your production PostgreSQL uses a different admin username
- You want to use a custom admin user for ephemeral environments

**How to retrieve current username**:
```bash
kubectl get secret env-var-secrets -o jsonpath='{.data.DB_USER}' | base64 -d
```

**How to add as Environment Secret**:
1. Go to `https://github.com/aphiria/aphiria.com/settings/environments`
2. Click on the **`preview`** environment
3. Scroll to **"Environment secrets"**
4. Click **"Add secret"**
5. Name: `POSTGRESQL_ADMIN_USER`
6. Value: The username (e.g., `postgres`)
7. Click "Add secret"

---

### `PULUMI_ACCESS_TOKEN` (Environment Secret)

**Type**: 🔒 **Environment Secret** (`preview` environment)

**Purpose**: Authenticate to Pulumi Cloud for state management

**How to create**:
1. Log in to Pulumi Cloud: https://app.pulumi.com
2. Go to Settings → Access Tokens
3. Click "Create token"
4. Name: `Aphiria Preview Environments`
5. Copy the token

**How to add as Environment Secret**:
1. Go to `https://github.com/aphiria/aphiria.com/settings/environments`
2. Click on the **`preview`** environment
3. Scroll to **"Environment secrets"**
4. Click **"Add secret"**
5. Name: `PULUMI_ACCESS_TOKEN`
6. Value: Paste the Pulumi token
7. Click "Add secret"

---

### `KUBECONFIG` (Environment Secret)

**Type**: 🔒 **Environment Secret** (`preview` environment)

**Purpose**: Kubernetes cluster access for deploying preview environments

**How to create**:
```bash
# Encode your kubeconfig file
cat ~/.kube/config | base64 -w 0
```

**Security note**: This provides **full cluster access**. The `preview` environment protection ensures:
- ✅ Manual approval required before workflows can access this secret
- ✅ Only maintainers can approve deployments
- ✅ Forked PRs cannot trigger privileged deployments

**How to add as Environment Secret**:
1. Go to `https://github.com/aphiria/aphiria.com/settings/environments`
2. Click on the **`preview`** environment
3. Scroll to **"Environment secrets"**
4. Click **"Add secret"**
5. Name: `KUBECONFIG`
6. Value: Paste the base64-encoded kubeconfig
7. Click "Add secret"

---

## Step 4: Verification

After adding all secrets, verify they're configured correctly:

### Repository Secrets

1. Go to `https://github.com/aphiria/aphiria.com/settings/secrets/actions`
2. You should see:
   - ✅ `DOCKER_ACCESS_TOKEN`

### Environment Secrets

1. Go to `https://github.com/aphiria/aphiria.com/settings/environments`
2. Click on **`preview`** environment
3. Under "Environment secrets", you should see:
   - ✅ `POSTGRESQL_ADMIN_PASSWORD`
   - ✅ `PULUMI_ACCESS_TOKEN`
   - ✅ `KUBECONFIG`
   - (Optional) ✅ `POSTGRESQL_ADMIN_USER`

### Environment Protection

1. Still in the **`preview`** environment settings
2. Under "Deployment protection rules", verify:
   - ✅ "Required reviewers" is enabled
   - ✅ At least one maintainer is listed as a required reviewer

---

## Secret Types Summary

Quick reference for which secrets go where:

| Secret | Type | Location | Why |
|--------|------|----------|-----|
| `DOCKER_ACCESS_TOKEN` | 🌍 Repository | `/settings/secrets/actions` | Public builds before approval |
| `POSTGRESQL_ADMIN_PASSWORD` | 🔒 Environment | `/settings/environments/preview` | Requires approval (database access) |
| `POSTGRESQL_ADMIN_USER` | 🔒 Environment | `/settings/environments/preview` | Requires approval (database access) |
| `PULUMI_ACCESS_TOKEN` | 🔒 Environment | `/settings/environments/preview` | Requires approval (infrastructure state) |
| `KUBECONFIG` | 🔒 Environment | `/settings/environments/preview` | Requires approval (cluster access) |

---

## Testing

Once secrets are configured, test the workflows:

1. Open a test PR with a small change
2. Wait for "Build Preview Images" workflow to complete
3. The workflow will automatically trigger "Preview Environment Deploy"
4. You'll receive a notification requesting approval
5. Approve the deployment
6. Verify the preview environment is created
7. Close the PR
8. Verify the "Preview Environment Cleanup" workflow destroys the environment

---

## Troubleshooting

### "Missing required secrets" error

The workflow will fail with a clear error message listing which secrets are missing. Add them following the instructions above.

### Pulumi authentication fails

- Verify `PULUMI_ACCESS_TOKEN` is valid
- Check that you're logged into the correct Pulumi organization
- Ensure the token has not expired

### Kubernetes connection fails

- Verify `KUBECONFIG` is base64-encoded correctly: `echo $KUBECONFIG | base64 -d | head -5`
- Check that the kubeconfig context points to the correct cluster
- Ensure cluster credentials have not expired

### Database connection fails

- Verify `POSTGRESQL_ADMIN_PASSWORD` matches your PostgreSQL instance
- Check that PostgreSQL is running in the cluster: `kubectl get pods -l app=postgresql`
- Verify the base stack has been deployed

---

## Security Best Practices

1. **Rotate credentials regularly**: Update secrets every 90 days
2. **Use minimal permissions**: Grant only necessary access to tokens
3. **Monitor secret usage**: Check GitHub Actions logs for unauthorized access attempts
4. **Enable audit logging**: Track who approves preview deployments
5. **Review forked PRs carefully**: Never approve deployments for untrusted contributors

---

## Next Steps

After configuring secrets:

1. Deploy the base infrastructure: `pulumi up --stack ephemeral-base`
2. Create DNS wildcard records in DigitalOcean
3. Verify cert-manager issues the wildcard TLS certificate
4. Test preview deployment on a test PR
5. Verify cleanup workflow on PR close

See `README.md` for deployment instructions.
