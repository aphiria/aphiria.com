# Ephemeral Preview Environments - Pulumi Infrastructure

This directory contains Pulumi programs for managing ephemeral preview environments for pull requests.

## Architecture

This implementation uses a **two-stack pattern**:

1. **Base Stack** (`ephemeral-base`): Persistent infrastructure shared across all preview environments
2. **Ephemeral Stacks** (`ephemeral-pr-{N}`): Per-PR isolated resources, automatically destroyed on PR close

## Stack Naming Conventions

### Base Stack

- **Name**: `ephemeral-base`
- **Purpose**: Persistent infrastructure that supports all preview environments
- **Lifecycle**: Manually deployed once, manually updated as needed
- **Resources**:
  - Shared PostgreSQL instance
  - Kubernetes Gateway API configuration
  - Wildcard TLS certificate (`*.pr.aphiria.com`)
  - DNS wildcard records

### Ephemeral Stacks

- **Name Pattern**: `ephemeral-pr-{PR_NUMBER}`
- **Examples**: `ephemeral-pr-123`, `ephemeral-pr-456`
- **Purpose**: Isolated environment for a single pull request
- **Lifecycle**: Automatically created on PR approval, automatically destroyed on PR close/merge
- **Resources**:
  - Kubernetes namespace (`ephemeral-pr-{N}`)
  - Per-PR database (`aphiria_pr_{N}`)
  - Web and API deployments
  - HTTPRoute configuration
  - ConfigMaps and Secrets

## Stack Selection Logic

The `index.ts` entry point automatically selects the correct stack program based on the Pulumi stack name:

```typescript
// Base infrastructure
pulumi up --stack ephemeral-base

// Per-PR environment
pulumi up --stack ephemeral-pr-123
```

## Prerequisites

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Pulumi Backend

This project uses Pulumi Cloud for state management. Ensure you're logged in:

```bash
pulumi login
```

### 3. Kubernetes Access

Ensure `kubectl` is configured with access to the target cluster:

```bash
kubectl cluster-info
```

### 4. PostgreSQL Credentials

Base stack requires PostgreSQL admin credentials for database creation:

- Set via Pulumi config: `pulumi config set --secret postgresql:adminPassword <password>`

## Deployment

### Deploy Base Infrastructure (One-Time)

```bash
cd infrastructure/pulumi/ephemeral
pulumi stack select ephemeral-base
pulumi up
```

**Outputs**:
- `postgresqlHost`: PostgreSQL service hostname (e.g., `db`)
- `gatewayName`: Gateway API resource name
- `tlsSecretName`: Wildcard TLS certificate secret name

### Deploy Preview Environment (Automated via GitHub Actions)

Preview environments are deployed automatically via `.github/workflows/preview-deploy.yml` when a PR is approved.

**Manual deployment** (for testing):

```bash
# Initialize stack for PR #123
pulumi stack select ephemeral-pr-123 --create

# Set required configuration
pulumi config set prNumber 123
pulumi config set webImageDigest sha256:abc123...
pulumi config set apiImageDigest sha256:def456...

# Deploy
pulumi up
```

**Outputs**:
- `webUrl`: Preview web URL (e.g., `https://123.pr.aphiria.com`)
- `apiUrl`: Preview API URL (e.g., `https://123.pr-api.aphiria.com`)
- `databaseName`: Database name (e.g., `aphiria_pr_123`)

### Destroy Preview Environment

```bash
pulumi stack select ephemeral-pr-123
pulumi destroy
pulumi stack rm ephemeral-pr-123
```

**Automated**: GitHub Actions workflow `.github/workflows/preview-cleanup.yml` handles this on PR close/merge.

## File Structure

```
infrastructure/pulumi/ephemeral/
├── index.ts                # Entry point (stack router)
├── src/
│   ├── base-stack.ts       # Base infrastructure (PostgreSQL, Gateway, TLS)
│   └── ephemeral-stack.ts  # Per-PR resources (namespace, deployments, database)
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript configuration
├── Pulumi.yaml             # Pulumi project configuration
└── README.md               # This file
```

## Stack Outputs Reference

### Base Stack Outputs

| Output | Description | Example Value |
|--------|-------------|---------------|
| `postgresqlHost` | PostgreSQL service hostname | `db` |
| `gatewayName` | Gateway API resource name | `aphiria-gateway` |
| `tlsSecretName` | Wildcard TLS secret name | `pr-wildcard-tls` |

### Ephemeral Stack Outputs

| Output | Description | Example Value |
|--------|-------------|---------------|
| `webUrl` | Preview web URL | `https://123.pr.aphiria.com` |
| `apiUrl` | Preview API URL | `https://123.pr-api.aphiria.com` |
| `databaseName` | Database name | `aphiria_pr_123` |
| `namespaceName` | Kubernetes namespace | `ephemeral-pr-123` |

## Configuration Reference

### Base Stack Configuration

| Config Key | Required | Secret | Description |
|------------|----------|--------|-------------|
| `postgresql:adminPassword` | Yes | Yes | PostgreSQL admin password |
| `kubernetes:namespace` | No | No | Namespace for base resources (default: `default`) |

### Ephemeral Stack Configuration

| Config Key | Required | Secret | Description |
|------------|----------|--------|-------------|
| `prNumber` | Yes | No | Pull request number |
| `webImageDigest` | Yes | No | Web container image digest (SHA256) |
| `apiImageDigest` | Yes | No | API container image digest (SHA256) |
| `baseStackReference` | No | No | Base stack reference (default: `organization/ephemeral-environments/ephemeral-base`) |

## Troubleshooting

### Stack Not Found

If `pulumi stack select` fails:

```bash
# List all stacks
pulumi stack ls

# Create missing stack
pulumi stack init ephemeral-pr-{N}
```

### Database Connection Issues

Verify PostgreSQL is running in the cluster:

```bash
kubectl get pods -l app=postgresql
kubectl logs -l app=postgresql
```

### TLS Certificate Not Issued

Check cert-manager status:

```bash
kubectl get certificates
kubectl describe certificate pr-wildcard-tls
```

### Preview Environment Not Accessible

1. Verify HTTPRoute created:
   ```bash
   kubectl get httproute -n ephemeral-pr-{N}
   ```

2. Check pod status:
   ```bash
   kubectl get pods -n ephemeral-pr-{N}
   ```

3. Verify DNS resolution:
   ```bash
   dig {N}.pr.aphiria.com
   ```

## Maintenance

### Update Base Infrastructure

Base infrastructure should be updated manually when needed:

```bash
pulumi stack select ephemeral-base
pulumi up
```

**Triggers for updates**:
- PostgreSQL version upgrade
- TLS certificate renewal (automatic via cert-manager)
- Gateway API configuration changes

### Cleanup Orphaned Resources

If GitHub Actions workflow fails, manually clean up:

```bash
# List all ephemeral stacks
pulumi stack ls | grep ephemeral-pr-

# Destroy orphaned stack
pulumi stack select ephemeral-pr-{N}
pulumi destroy
pulumi stack rm ephemeral-pr-{N}
```

## Security Considerations

1. **Secrets Management**: All secrets stored in Pulumi encrypted config
2. **Network Isolation**: Each preview environment in isolated namespace with NetworkPolicy
3. **Resource Quotas**: Enforced limits prevent resource exhaustion
4. **Public Access**: Preview environments are publicly accessible (no authentication)
5. **Database Isolation**: Separate database per PR, dropped on cleanup

## CI/CD Integration

See GitHub Actions workflows:
- `.github/workflows/preview-deploy.yml` - Deployment and updates
- `.github/workflows/preview-cleanup.yml` - Cleanup on PR close
- `.github/workflows/build-preview-images.yml` - Docker image builds

## Further Reading

- [Pulumi Kubernetes Provider](https://www.pulumi.com/registry/packages/kubernetes/)
- [Pulumi PostgreSQL Provider](https://www.pulumi.com/registry/packages/postgresql/)
- [Kubernetes Gateway API](https://gateway-api.sigs.k8s.io/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
