<p align="center"><a href="https://www.aphiria.com" target="_blank" title="Aphiria"><img src="https://www.aphiria.com/images/aphiria-logo.svg" width="200" height="56"></a></p>

<p align="center">
<a href="https://github.com/aphiria/aphiria.com/actions"><img src="https://github.com/aphiria/aphiria.com/workflows/CI/badge.svg"></a>
<a href="https://github.com/aphiria/aphiria.com/actions"><img src="https://github.com/aphiria/aphiria.com/workflows/CD/badge.svg"></a>
<a href="https://codecov.io/gh/aphiria/aphiria.com/tree/master/apps/api"><img src="https://img.shields.io/codecov/c/github/aphiria/aphiria.com/master?flag=api&label=API&logo=codecov" alt="API Coverage"></a>
<a href="https://codecov.io/gh/aphiria/aphiria.com/tree/master/apps/web"><img src="https://img.shields.io/codecov/c/github/aphiria/aphiria.com/master?flag=web&label=Web&logo=codecov" alt="Web Coverage"></a>
<a href="https://codecov.io/gh/aphiria/aphiria.com/tree/master/infrastructure/pulumi"><img src="https://img.shields.io/codecov/c/github/aphiria/aphiria.com/master?flag=pulumi&label=Pulumi&logo=codecov" alt="Pulumi Coverage"></a>
<a href="https://codecov.io/gh/aphiria/aphiria.com/tree/master/tools/build-docs"><img src="https://img.shields.io/codecov/c/github/aphiria/aphiria.com/master?flag=tools&label=Tools&logo=codecov" alt="Tools Coverage"></a>
<a href="https://psalm.dev"><img src="https://shepherd.dev/github/aphiria/aphiria.com/level.svg"></a>
</p>

# About

This monorepo contains the code for both https://www.aphiria.com and https://api.aphiria.com.

## Directory Structure

- [apps](apps): The source code for the web and API applications
  - [api](apps/api): The API code
  - [web](apps/web): The website code
- [docs](docs): The documentation for the Aphiria framework
- [infrastructure](infrastructure): The applications' infrastructure code
  - [docker](infrastructure/docker): The Docker files to build and run the applications
  - [pulumi](infrastructure/pulumi): The Pulumi code to provision the applications
- [specs](specs): The GitHub Spec Kit specs
- [tests](tests): End-to-end tests of the entire website using Playwright
- [tools](tools): Tools for building and indexing the documentation

## Preview Environments

Pull requests automatically generate ephemeral preview environments for testing changes before merging.

- **Web Preview**: `https://{PR}.pr.aphiria.com`
- **API Preview**: `https://{PR}.pr-api.aphiria.com`

**For contributors**: Preview deployments happen automatically after maintainer approval. No setup required!

**For maintainers**:

- Secrets management: [`SECRETS.md`](SECRETS.md)

## Getting Started

### 1. Install System Dependencies

```bash
make install
```

This installs Docker, kubectl, Minikube, Pulumi, Node.js, npm dependencies, and PHP dependencies.

> **Note:** You may need to run `chmod +x ./install.sh` first if the script isn't executable.

> **Note:** To install only specific tools, pass arguments to `install.sh`:
> ```bash
> make install INSTALL_ARGS="--install-pulumi"  # Only install Pulumi
> ```

### 2. Update Your Host File

Add the following to your host file:

```
127.0.0.1 aphiria.com
127.0.0.1 api.aphiria.com
127.0.0.1 www.aphiria.com
127.0.0.1 grafana.aphiria.com
```

## Local Development

### Quick Start: Running the Site Locally (Standalone)

For rapid iteration on frontend changes without deploying to Kubernetes:

```bash
make web-dev
```

Visit http://localhost:3000

> **Note:** Doc search won't work in standalone mode since it requires the API backend. All other features (navigation, TOC, syntax highlighting) work normally.

### Running the Full Site Locally (with API)

#### 1. Start Minikube

```bash
make minikube-start
```

> **Note:** The `metrics-server` addon is required for Grafana dashboards to display CPU/memory metrics.

In a separate terminal, run Minikube tunnel (required for LoadBalancer access):

```bash
make minikube-tunnel
```

> **Note:** You'll need to enter your sudo password. Keep this terminal running.

#### 2. Deploy with Pulumi

```bash
make pulumi-deploy
```

This will:
- Build all Docker images in Minikube's Docker daemon (base, build, API, web)
- Deploy infrastructure to Kubernetes
- Run database migrations

> **Note:** The local stack uses passphrase `"password"` for encryption (safe to share - no actual secrets in local stack). Set it with:

```bash
export PULUMI_CONFIG_PASSPHRASE="password"
```

> **Note:** For non-interactive deployment (useful in scripts), add Pulumi flags:
> ```bash
> make pulumi-deploy PULUMI_ARGS="--yes --skip-preview"
> ```

> **Note:** If you need to log back into the cloud instance, run `pulumi logout`, then `pulumi login` to authenticate with Pulumi Cloud.

### Making Changes

After modifying code, rebuild and restart deployments:

```bash
make pulumi-redeploy
```

> **Note:** This picks up new Docker image changes without re-running `pulumi up`.

### Accessing the Site

- https://www.aphiria.com (web)
- https://api.aphiria.com (API documentation)
- https://grafana.aphiria.com (monitoring dashboards)

> **Note:** You'll see a certificate warning (self-signed cert). In Chrome, type `thisisunsafe` (there is no input - just type that phrase with the page displayed) to bypass. In other browsers, click advanced and accept the certificate.

## Development Workflows

### Testing

#### All Unit Tests

Run all unit tests (TypeScript and PHP):

```bash
make test
```

Or run individual workspace tests:

```bash
make test-ts    # TypeScript tests (web, infrastructure, tools)
make test-php   # PHP tests
```

#### E2E Tests

**First-time setup** (installs Playwright browsers):

```bash
make test-e2e-install
```

**Run tests**:

```bash
make test-e2e-local              # Against local minikube (accepts self-signed certs)
make test-e2e-preview PR=123     # Against preview environment
make test-e2e-production         # Against production
```

> **Note:** E2E tests run automatically after deployments via GitHub Actions. See `.github/workflows/cd.yml` for the full workflow.

### Code Quality

Run all quality gates (linting, formatting, and tests - the same checks as CI):

```bash
make quality-gates
```

Or run individual checks:

```bash
make lint          # Run all linters (TypeScript + PHP)
make format        # Auto-format all code (TypeScript + PHP)
make format-check  # Verify formatting without changes
```

## Infrastructure

### Common Pulumi Commands

All Pulumi commands accept `STACK` and `PULUMI_ARGS` parameters:

```bash
# Set passphrase for Pulumi commands (required for local stack)
export PULUMI_CONFIG_PASSPHRASE="password"

# Preview changes before applying
make pulumi-preview                          # Local stack (interactive)
make pulumi-preview STACK=prod               # Production stack
make pulumi-preview PULUMI_ARGS="--diff"     # Show detailed diff

# Apply infrastructure changes
make pulumi-deploy                                        # Local stack (interactive)
make pulumi-deploy PULUMI_ARGS="--yes --skip-preview"    # Non-interactive (for CI)

# Tear down the local environment (requires confirmation)
make pulumi-destroy CONFIRM=yes
make pulumi-destroy STACK=preview-pr-123 CONFIRM=yes

# Sync Pulumi state with actual cluster state
make pulumi-refresh
```

### Minikube Dashboard

View the cluster state visually:

```bash
make minikube-dashboard
```

## Monitoring (Optional)

### Grafana Configuration

The local stack includes Grafana monitoring. Before running `make pulumi-deploy`, configure these values:

```bash
cd infrastructure/pulumi

# Prometheus monitoring
pulumi config set prometheus:authToken "dummy-password" --secret --stack local

# GitHub OAuth (for authentication)
pulumi config set grafana:githubClientId "YOUR_CLIENT_ID" --stack local
pulumi config set grafana:githubClientSecret "local-dev-client-secret" --secret --stack local
pulumi config set grafana:githubOrg "aphiria" --stack local
pulumi config set grafana:adminUser "your-github-username" --stack local

# SMTP (for alerts - can use dummy values for local)
pulumi config set grafana:smtpHost "smtp.example.com" --secret --stack local
pulumi config set grafana:smtpPort "587" --stack local
pulumi config set grafana:smtpUser "noreply@example.com" --secret --stack local
pulumi config set grafana:smtpPassword "dummy-password" --secret --stack local
pulumi config set grafana:smtpFromAddress "noreply@example.com" --stack local
pulumi config set grafana:alertEmail "admin@example.com" --stack local
```

> **Note:** For local development, you can use placeholder values. GitHub OAuth won't work with dummy credentials, but Grafana will still deploy. For production setup, see [SECRETS.md](SECRETS.md).

## Available Commands

Run `make help` to see all available commands.
