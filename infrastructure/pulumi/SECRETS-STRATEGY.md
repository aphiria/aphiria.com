# Secrets Management Strategy

## Current Secrets Inventory

### Dev-Local (Minikube)
- `dbPassword` - PostgreSQL password (currently: `password`)
- No external services, so minimal secrets needed

### Preview Environments (Per-PR)
- `dbPassword` - PostgreSQL password (per-PR database)
- `PULUMI_CONFIG_PASSPHRASE` - Pulumi stack encryption (GitHub Actions)
- DigitalOcean Spaces credentials (for Pulumi backend):
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`

### Production
- `dbPassword` - PostgreSQL password
- TLS certificates (Let's Encrypt via cert-manager - auto-managed)
- Kubernetes cluster kubeconfig (exported from Pulumi production stack - no manual management)
- `PULUMI_CONFIG_PASSPHRASE` - Pulumi stack encryption

### GitHub Actions Secrets (Required)
- `PULUMI_ACCESS_TOKEN` - Authenticate to Pulumi Cloud for state management
- `PULUMI_CONFIG_PASSPHRASE` - Encrypt Pulumi stack state (optional - deprecated in favor of Pulumi Cloud encryption)
- ~~`DIGITALOCEAN_TOKEN`~~ - ❌ **REMOVED** - Cluster managed by Pulumi, kubeconfig retrieved from stack output
- ~~`KUBECONFIG`~~ - ❌ **REMOVED** - Retrieved dynamically from Pulumi production stack

---

## Strategy Comparison

### Option 1: GitHub Secrets Only (Current - Recommended)

**Pros:**
- ✅ Already configured and working
- ✅ Zero additional cost
- ✅ Native GitHub Actions integration
- ✅ Per-repository and per-environment scoping
- ✅ Audit logs included
- ✅ Simple RBAC (GitHub teams)
- ✅ No additional dependencies

**Cons:**
- ❌ No centralized secret management across repos (not an issue for single-repo projects)
- ❌ Manual rotation (but this is acceptable for this scale)
- ❌ No secret versioning (use Pulumi config for versioned non-sensitive values)

**Best for:** Single repository, small team, cost-conscious projects

---

### Option 2: Pulumi ESC Free Tier

**Pulumi ESC Free Tier Limits:**
- 5 environments max
- 1 team member
- Community support only

**Pros:**
- ✅ Centralized secret management
- ✅ Secret versioning
- ✅ Dynamic credentials (e.g., temporary AWS keys)
- ✅ Native Pulumi integration
- ✅ Environment composition (inherit from base environments)
- ✅ Free tier exists

**Cons:**
- ❌ Only 5 environments (local, ephemeral-base, production = 3 base + 2 ephemeral PRs max)
- ❌ Limited to 1 team member on free tier (blocking collaboration)
- ❌ Additional tool to learn and maintain
- ❌ Requires migration effort
- ❌ Dependency on Pulumi Cloud service availability
- ❌ Still need GitHub Secrets for `PULUMI_ACCESS_TOKEN` to use ESC in Actions

**Best for:** Multi-repo Pulumi projects, teams already using Pulumi Cloud

---

### Option 3: Hybrid Approach

**Strategy:**
- **GitHub Secrets**: For GitHub Actions workflows (PULUMI_CONFIG_PASSPHRASE, cloud credentials)
- **Pulumi Config**: For non-sensitive configuration (image names, replica counts, domains)
- **Kubernetes Secrets**: For runtime secrets (database passwords, API keys) - created by Pulumi

**Pros:**
- ✅ Each tool used for its strength
- ✅ No additional cost
- ✅ Clear separation of concerns
- ✅ Runtime secrets scoped to Kubernetes namespaces

**Cons:**
- ❌ Secrets spread across multiple systems (but this is standard practice)

**Best for:** Most Kubernetes + Pulumi projects (industry standard)

---

## Recommendation: Option 3 (Hybrid - Current Implementation)

**Rationale:**
1. **Free tier limitations**: Pulumi ESC free tier (5 environments, 1 team member) is too restrictive for ephemeral preview environments
2. **Cost**: GitHub Secrets are free and unlimited for your use case
3. **Simplicity**: No additional tools or services to manage
4. **Industry standard**: Hybrid approach is the norm for Kubernetes projects

**Implementation:**

### 1. GitHub Secrets (CI/CD Authentication)
Store in GitHub Settings → Secrets and variables → Actions:

```yaml
# Required for all workflows
PULUMI_ACCESS_TOKEN: "<pulumi-cloud-token>"  # Access Pulumi Cloud for state management
DIGITALOCEAN_ACCESS_TOKEN: "<digitalocean-api-token>"  # For creating/managing Kubernetes clusters

# Optional (if using self-managed backend instead of Pulumi Cloud)
PULUMI_CONFIG_PASSPHRASE: "<strong-passphrase>"  # For encrypting stack configs locally
AWS_ACCESS_KEY_ID: "<do-spaces-key>"             # For self-managed Pulumi backend
AWS_SECRET_ACCESS_KEY: "<do-spaces-secret>"      # For self-managed Pulumi backend

# REMOVED - No longer needed
# KUBECONFIG - Retrieved dynamically from Pulumi preview-base/production stacks
```

**Access:** Scoped per environment (production secrets only accessible to production workflows)

**Note**:
- With Pulumi Cloud (recommended), you need `PULUMI_ACCESS_TOKEN` and `DIGITALOCEAN_ACCESS_TOKEN`
- The self-managed backend secrets are only required if using DigitalOcean Spaces for Pulumi state
- `DIGITALOCEAN_ACCESS_TOKEN` is required for Pulumi to create and manage DigitalOcean Kubernetes clusters

### DigitalOcean Access Token Setup

**Create at**: https://cloud.digitalocean.com/account/api/tokens

**Required Scopes**:
- **Read** and **Write** access (full access token)

**Permissions needed**:
- `kubernetes` - Create, read, update, delete Kubernetes clusters
- `vpc` - Access VPC for cluster networking
- `load_balancer` - Manage LoadBalancers for cluster ingress

**Token Type**: Personal Access Token (not App-specific)

**Expiration**: Set to "No expiry" or use a long expiration (1+ year) with calendar reminder for rotation

**Storage**: Add to GitHub repository secrets as `DIGITALOCEAN_ACCESS_TOKEN`

### 2. Pulumi Config (Non-Sensitive Configuration)
Store in stack config files (checked into git):

```bash
# Example: infrastructure/pulumi/Pulumi.production.yml
pulumi config set imageRegistry ghcr.io/aphiria
pulumi config set domain aphiria.com
pulumi config set replicas 2
```

### 3. Pulumi Secrets (Sensitive Runtime Config)
Store in stack config files (encrypted at rest):

```bash
# Example: database password
pulumi config set --secret dbPassword <random-password>
```

**Encryption:** Uses PULUMI_CONFIG_PASSPHRASE (stored in GitHub Secrets)

### 4. Kubernetes Secrets (Runtime Application Secrets)
Created by Pulumi, scoped to namespaces:

```typescript
// Example: API deployment creates Secret with DB credentials
const secret = new k8s.core.v1.Secret("env-var-secrets", {
    metadata: { namespace: "default" },
    stringData: {
        DB_PASSWORD: args.dbPassword, // From Pulumi secret
        // Other runtime secrets
    },
});
```

**Access:** Mounted as environment variables in pods, scoped to namespace

---

## Security Best Practices

### 1. Principle of Least Privilege
- ✅ GitHub Secrets scoped per environment (production secrets not accessible to preview)
- ✅ Kubernetes Secrets scoped to namespaces (preview namespaces isolated)
- ✅ RBAC on DigitalOcean Spaces (Pulumi backend read/write only)

### 2. Secret Rotation
- **Database passwords**: Rotate quarterly, update Pulumi config + Kubernetes Secrets
- **DigitalOcean credentials**: Rotate semi-annually
- **PULUMI_CONFIG_PASSPHRASE**: Rotate annually (requires re-encrypting all stack configs)

**Rotation procedure:**
1. Generate new secret value
2. Update GitHub Secret
3. Update Pulumi config: `pulumi config set --secret dbPassword <new-value>`
4. Deploy: `pulumi up` (triggers Kubernetes Secret update)
5. Restart affected pods: `kubectl rollout restart deployment/api`

### 3. Access Control
- **GitHub Secrets**: Restricted to repository admins
- **Pulumi stacks**: Encrypted with passphrase (only admins have passphrase)
- **Kubernetes cluster**: DigitalOcean RBAC + kubeconfig restricted to admins

### 4. Audit Logging
- ✅ GitHub Actions logs show secret access (redacted values)
- ✅ DigitalOcean audit logs for API access
- ✅ Kubernetes audit logs for Secret access (if enabled)

---

## Migration Path (If Switching to Pulumi ESC Later)

If your project grows beyond free tier limits and you want to use Pulumi ESC:

1. **Upgrade to Pulumi Team tier** ($75/user/month)
2. **Create ESC environments:**
   ```bash
   pulumi env init local
   pulumi env init production
   pulumi env init ephemeral-base
   ```
3. **Migrate secrets from GitHub → ESC:**
   ```yaml
   # pulumi/local environment
   values:
     pulumiConfig:
       dbPassword:
         fn::secret: "password123"
     environmentVariables:
       AWS_ACCESS_KEY_ID: "..."
       AWS_SECRET_ACCESS_KEY:
         fn::secret: "..."
   ```
4. **Update GitHub workflows to use ESC:**
   ```yaml
   - uses: pulumi/actions@v5
     with:
       environment: local  # Automatically imports ESC environment
   ```

**Cost-benefit:** Only worth it if:
- Team > 1 person AND
- Need > 5 environments (more than 2 concurrent PRs) AND
- Budget for $75/user/month

---

## Current Status

**Implemented:**
- ✅ GitHub Secrets for CI/CD (PULUMI_CONFIG_PASSPHRASE, cloud credentials)
- ✅ Pulumi config for non-sensitive values (in Pulumi.yml)
- ✅ Pulumi secrets for sensitive config (`dbPassword`)
- ✅ Kubernetes Secrets created by Pulumi components

**Todo (T059-T062):**
- [ ] Document all required secrets per environment
- [ ] Set up GitHub Secrets for production environment
- [ ] Document rotation procedures
- [ ] Add secret rotation to operational runbook

---

**Recommendation:** Stick with Option 3 (Hybrid - Current Implementation). It's free, scalable, and industry standard. Only consider Pulumi ESC if you upgrade to Team tier for other reasons.
