# Secrets Management

This document describes all GitHub repository secrets used by CI/CD workflows and their rotation procedures.

**Audience**: Repository maintainers only

---

## Required Secrets

| Secret Name | Purpose | Rotation Schedule | Used By |
|-------------|---------|-------------------|---------|
| `GHCR_TOKEN` | Push Docker images to ghcr.io | Annually | `build-preview-images.yml` |
| `PULUMI_ACCESS_TOKEN` | Manage infrastructure state in Pulumi Cloud | Annually | `preview-deploy.yml`, `preview-cleanup.yml` |
| `WORKFLOW_DISPATCH_TOKEN` | Trigger preview deployment workflow from build workflow | Annually | `build-preview-images.yml` |

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
| Authentication failed (build-preview-images.yml) | Invalid `GHCR_TOKEN` | Rotate token |
| Pulumi login failed | Invalid `PULUMI_ACCESS_TOKEN` | Rotate token |
| workflow_dispatch trigger fails (403 error) | Invalid `WORKFLOW_DISPATCH_TOKEN` | Rotate token |

---

**Last Updated**: 2025-12-23
