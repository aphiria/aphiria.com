# Secrets Management

This document describes the secrets management strategy for aphiria.com, including GitHub repository secrets, Pulumi ESC environments, and rotation procedures.

**Audience**: Repository maintainers only

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Required Secrets](#required-secrets)
3. [Rotation Procedures](#rotation-procedures)
4. [Emergency Rotation](#emergency-rotation)
5. [Troubleshooting](#troubleshooting)

## Architecture Overview

### Three-Tier Secrets Management

This project uses a **three-tier secrets architecture**:

```
GitHub Secrets (CI/CD) → Pulumi ESC (Infrastructure Config) → Kubernetes Secrets (Runtime)
```

1. **GitHub Secrets**: CI/CD workflow authentication
   - `PULUMI_ACCESS_TOKEN` - Authenticate to Pulumi Cloud
   - `WORKFLOW_DISPATCH_TOKEN` - Trigger workflows from other workflows

2. **Pulumi ESC Environments**: Infrastructure configuration secrets
   - Environment: `aphiria.com/Preview` (preview-base, preview-pr-*)
   - Environment: `aphiria.com/Production` (production)
   - Stores: DigitalOcean tokens, GHCR credentials, PostgreSQL passwords, cert-manager DNS tokens

3. **Kubernetes Secrets**: Application runtime secrets
   - Created by Pulumi components
   - Populated from Pulumi ESC values
   - Scoped to namespaces (preview-pr-123, default)

**Data Flow Example**:
```
postgresql:password (Pulumi ESC)
  ↓ (accessed by Pulumi TypeScript)
db-env-var-secrets (Kubernetes Secret)
  ↓ (mounted as env var)
PostgreSQL container
```

### Why Pulumi ESC?

**Benefits**:
- ✅ Centralized infrastructure secret management
- ✅ Automatic injection into Pulumi stacks (`pulumi config env add`)
- ✅ Encrypted at rest in Pulumi Cloud
- ✅ Environment composition (Preview and Production can inherit from base)
- ✅ Secret versioning and audit logs

**Free Tier Limitations**:
- 5 environments max
- 1 team member
- Current usage: 2 environments (`aphiria.com/Preview`, `aphiria.com/Production`)

## Required Secrets

### GitHub Repository Secrets

| Secret Name | Purpose | Rotation Schedule | Used By |
|-------------|---------|-------------------|---------|
| `PULUMI_ACCESS_TOKEN` | Manage infrastructure state in Pulumi Cloud | Annually | `preview-deploy.yml`, `preview-cleanup.yml` |
| `WORKFLOW_DISPATCH_TOKEN` | Trigger preview deployment workflow from build workflow | Annually | `build-preview-images.yml` |

**Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions for pushing Docker images to ghcr.io. No manual secret configuration required.

### Pulumi ESC Environments

These secrets are stored in Pulumi ESC and automatically injected into Pulumi stacks when you run `pulumi config env add <environment>`.

**Environments**:
- `aphiria.com/Preview` - Used by preview-base and preview-pr-* stacks
- `aphiria.com/Production` - Used by production stack

| Secret Name | Purpose | Rotation Schedule | Environment |
|-------------|---------|-------------------|-------------|
| `digitalocean:token` | DigitalOcean API access for cluster management | Annually | Both |
| `certmanager:digitaloceanDnsToken` | DNS API access for cert-manager wildcard TLS (DNS-01 challenges) | Annually | Both |
| `ghcr:token` | Pull private Docker images from ghcr.io (Kubernetes imagePullSecrets) | Annually | Both |
| `ghcr:username` | GitHub username for GHCR authentication | N/A | Both |
| `postgresql:user` | PostgreSQL admin user | N/A | Both |
| `postgresql:password` | PostgreSQL admin password | Quarterly | Both |
| `grafana:githubClientId` | GitHub OAuth App Client ID for Grafana authentication | When OAuth app is rotated | Both |
| `grafana:githubClientSecret` | GitHub OAuth App Client Secret for Grafana authentication | Annually | Both |
| `grafana:githubOrg` | GitHub organization for access control (e.g., "aphiria") | N/A | Both |
| `grafana:adminUser` | GitHub username with Grafana admin privileges | N/A | Both |
| `grafana:smtpHost` | SMTP server hostname for alert emails | When SMTP provider changes | Both (unused in preview) |
| `grafana:smtpPort` | SMTP server port (typically 587) | N/A | Both (unused in preview) |
| `grafana:smtpUser` | SMTP authentication username | When SMTP credentials rotate | Both (unused in preview) |
| `grafana:smtpPassword` | SMTP authentication password | Quarterly | Both (unused in preview) |
| `grafana:smtpFromAddress` | Email "From" address for alerts | N/A | Both (unused in preview) |
| `grafana:alertEmail` | Email address to receive Grafana alerts | N/A | Both (unused in preview) |

**How Pulumi ESC works**:
1. Secrets are stored in Pulumi Cloud at https://app.pulumi.com/[org]/settings/environments
2. Stack config files reference the environment: `pulumi config env add aphiria.com/Preview`
3. When you run `pulumi up`, Pulumi automatically injects ESC secrets as stack config
4. TypeScript code accesses them: `new pulumi.Config("postgresql").requireSecret("password")`
5. Values are passed to Kubernetes resources (Secrets, ConfigMaps, Deployments)

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

**Option 1: Via Pulumi ESC UI (Recommended)**:

1. Navigate to https://app.pulumi.com/[your-org]/settings/environments
2. Select `aphiria.com/Preview` environment
3. Click "Edit"
4. Update the `pulumiConfig` section:
   ```yaml
   values:
     pulumiConfig:
       "ghcr:token":
         fn::secret: "ghp_YOUR_NEW_TOKEN_HERE"
       "ghcr:username": "your-github-username"
   ```
5. Save
6. Repeat for `aphiria.com/Production` environment

**Option 2: Via Pulumi CLI**:

```bash
# Configure for Preview environment
pulumi env set aphiria.com/Preview pulumiConfig."ghcr:token" "ghp_YOUR_TOKEN" --secret
pulumi env set aphiria.com/Preview pulumiConfig."ghcr:username" "your-github-username"

# Configure for Production environment
pulumi env set aphiria.com/Production pulumiConfig."ghcr:token" "ghp_YOUR_TOKEN" --secret
pulumi env set aphiria.com/Production pulumiConfig."ghcr:username" "your-github-username"
```

**Cleanup**: Delete old token at https://github.com/settings/tokens (ensure new token works first)

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

**Cleanup**: Delete old token at https://github.com/settings/tokens

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

**Cleanup**: Delete old token at https://app.pulumi.com/settings/tokens

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
pulumi env set aphiria.com/Preview pulumiConfig."certmanager:digitaloceanDnsToken" "dop_v1_YOUR_TOKEN_HERE" --secret

# Verify it's set
pulumi env get aphiria.com/Preview
# Should show: certmanager:digitaloceanDnsToken: [secret]

# Configure for Production environment
pulumi env set aphiria.com/Production pulumiConfig."certmanager:digitaloceanDnsToken" "dop_v1_YOUR_TOKEN_HERE" --secret
```

**Alternative: Via Pulumi ESC UI**:
1. Navigate to https://app.pulumi.com/[your-org]/settings/environments
2. Edit `aphiria.com/Preview` and `aphiria.com/Production`
3. Update `pulumiConfig."certmanager:digitaloceanDnsToken"` with new token (mark as secret)

**Security Notes**:
- Minimum required scopes: `domain:read`, `domain:create`, `domain:delete`
- This token grants DNS write access to your entire `aphiria.com` domain
- Store securely in Pulumi ESC (never commit to git)
- Rotate annually or if compromised

**Cleanup**: Delete old token at https://cloud.digitalocean.com/account/api/tokens

### grafana:githubClientId and grafana:githubClientSecret

**Why this is needed**: Grafana uses GitHub OAuth for authentication, restricting access to members of the `aphiria` GitHub organization. This eliminates the need for separate username/password management.

**Generate new OAuth App**:

1. Navigate to https://github.com/organizations/aphiria/settings/applications
2. Click "New OAuth App"
3. Application name: `Grafana - aphiria.com`
4. Homepage URL: `https://grafana.aphiria.com`
5. Authorization callback URL: `https://grafana.aphiria.com/login/github`
6. Click "Register application"
7. Copy the **Client ID** (visible immediately)
8. Click "Generate a new client secret"
9. Copy the **Client Secret** (only shown once)

**Configure in Pulumi ESC**:

```bash
# Navigate to Pulumi directory
cd infrastructure/pulumi

# Configure for Preview environment
pulumi env set aphiria.com/Preview pulumiConfig."grafana:githubClientId" "YOUR_CLIENT_ID" --secret
pulumi env set aphiria.com/Preview pulumiConfig."grafana:githubClientSecret" "YOUR_CLIENT_SECRET" --secret

# Configure for Production environment
pulumi env set aphiria.com/Production pulumiConfig."grafana:githubClientId" "YOUR_CLIENT_ID" --secret
pulumi env set aphiria.com/Production pulumiConfig."grafana:githubClientSecret" "YOUR_CLIENT_SECRET" --secret
```

**Alternative: Via Pulumi ESC UI**:
1. Navigate to https://app.pulumi.com/[your-org]/settings/environments
2. Edit `aphiria.com/Preview` and `aphiria.com/Production`
3. Update `pulumiConfig."grafana:githubClientId"` and `pulumiConfig."grafana:githubClientSecret"` (mark as secret)

**Security Notes**:
- Callback URL must match exactly (including `https://` and domain)
- For preview environments, the callback URL pattern is `https://{PR}.pr-grafana.aphiria.com/login/github` (wildcard not supported, each PR gets unique Grafana instance)
- Client secret only shown once - store securely in Pulumi ESC
- Rotate annually or if compromised

**Cleanup**: Delete old OAuth App at https://github.com/organizations/aphiria/settings/applications

### grafana:githubOrg and grafana:adminUser

**Why this is needed**: `githubOrg` restricts Grafana access to organization members only. `adminUser` grants one GitHub user full admin privileges (manage dashboards, users, data sources).

**Configure in Pulumi ESC**:

```bash
# Navigate to Pulumi directory
cd infrastructure/pulumi

# Configure for Preview environment
pulumi env set aphiria.com/Preview pulumiConfig."grafana:githubOrg" "aphiria"
pulumi env set aphiria.com/Preview pulumiConfig."grafana:adminUser" "your-github-username"

# Configure for Production environment
pulumi env set aphiria.com/Production pulumiConfig."grafana:githubOrg" "aphiria"
pulumi env set aphiria.com/Production pulumiConfig."grafana:adminUser" "your-github-username"
```

**Security Notes**:
- Organization name is case-sensitive (must match GitHub exactly)
- Admin user must be a member of the specified organization
- These are not secrets (plain text values)

### grafana:smtpHost, grafana:smtpPort, grafana:smtpUser, grafana:smtpPassword

**Why this is needed**: Grafana sends email alerts when metrics exceed thresholds (e.g., high CPU usage, pod crashes). Uses Google Workspace SMTP with app-specific password for production monitoring.

**Note**: SMTP is configured in preview environments but alerts are disabled (preview uses short-lived infrastructure).

**Generate Google Workspace App Password**:

1. Navigate to https://myaccount.google.com/apppasswords
2. Sign in with your `admin@aphiria.com` Google Workspace account
3. App name: `Grafana Alerts - aphiria.com`
4. Click "Create"
5. Copy the 16-character app password (shown once)
   - Google displays it with spaces (e.g., `abcd efgh ijkl mnop`)
   - Remove all spaces when using it (e.g., `abcdefghijklmnop`)

**Configure in Pulumi ESC**:

```bash
# Navigate to Pulumi directory
cd infrastructure/pulumi

# Configure for Preview environment (SMTP configured but unused)
pulumi env set aphiria.com/Preview pulumiConfig."grafana:smtpHost" "smtp.gmail.com" --secret
pulumi env set aphiria.com/Preview pulumiConfig."grafana:smtpPort" "587"
pulumi env set aphiria.com/Preview pulumiConfig."grafana:smtpUser" "admin@aphiria.com" --secret
pulumi env set aphiria.com/Preview pulumiConfig."grafana:smtpPassword" "YOUR_APP_PASSWORD" --secret
pulumi env set aphiria.com/Preview pulumiConfig."grafana:smtpFromAddress" "admin@aphiria.com"
pulumi env set aphiria.com/Preview pulumiConfig."grafana:alertEmail" "admin@aphiria.com"

# Configure for Production environment
pulumi env set aphiria.com/Production pulumiConfig."grafana:smtpHost" "smtp.gmail.com" --secret
pulumi env set aphiria.com/Production pulumiConfig."grafana:smtpPort" "587"
pulumi env set aphiria.com/Production pulumiConfig."grafana:smtpUser" "admin@aphiria.com" --secret
pulumi env set aphiria.com/Production pulumiConfig."grafana:smtpPassword" "YOUR_APP_PASSWORD" --secret
pulumi env set aphiria.com/Production pulumiConfig."grafana:smtpFromAddress" "admin@aphiria.com"
pulumi env set aphiria.com/Production pulumiConfig."grafana:alertEmail" "admin@aphiria.com"
```

**Alternative: Via Pulumi ESC UI**:
1. Navigate to https://app.pulumi.com/[your-org]/settings/environments
2. Edit `aphiria.com/Preview` and `aphiria.com/Production`
3. Update SMTP configuration values (mark `smtpHost`, `smtpUser`, `smtpPassword` as secret)

**Security Notes**:
- Use Google Workspace app password (not main account password)
- App passwords bypass 2FA (revoke immediately if compromised)
- SMTP port 587 uses STARTTLS encryption
- Gmail SMTP rate limits: 100 emails/day for free accounts, 2000/day for Workspace
- Rotate app password quarterly or if compromised

**Cleanup**: Revoke old app password at https://myaccount.google.com/apppasswords

## Emergency Rotation

If a secret is compromised:

1. Revoke the compromised credential immediately
2. Generate a new credential (see procedures above)
3. Update the GitHub repository secret
4. Test workflows still function
5. Audit logs for unauthorized access

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| Authentication failed (build-preview-images.yml) | `GITHUB_TOKEN` permissions issue | Verify `packages: write` permission in workflow |
| ImagePullBackOff / 401 Unauthorized (Kubernetes pods) | Invalid `ghcr:token` in Pulumi ESC | Add/update token in Pulumi ESC environments |
| Pulumi login failed | Invalid `PULUMI_ACCESS_TOKEN` | Rotate token |
| workflow_dispatch trigger fails (403 error) | Invalid `WORKFLOW_DISPATCH_TOKEN` | Rotate token |
| DNS records not created | Invalid `digitalocean:token` in Pulumi ESC | Add/update token in Pulumi ESC environments |

**Last Updated**: 2025-12-23
