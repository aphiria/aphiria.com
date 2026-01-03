<p align="center"><a href="https://www.aphiria.com" target="_blank" title="Aphiria"><img src="https://www.aphiria.com/images/aphiria-logo.svg" width="200" height="56"></a></p>

<p align="center">
<a href="https://github.com/aphiria/aphiria.com/actions"><img src="https://github.com/aphiria/aphiria.com/workflows/CI/badge.svg"></a>
<a href="https://github.com/aphiria/aphiria.com/actions"><img src="https://github.com/aphiria/aphiria.com/workflows/CD/badge.svg"></a>
<a href="https://coveralls.io/github/aphiria/aphiria.com?branch=master"><img src="https://coveralls.io/repos/github/aphiria/aphiria.com/badge.svg?branch=master" alt="Coverage Status"></a>
<a href="https://psalm.dev"><img src="https://shepherd.dev/github/aphiria/aphiria.com/level.svg"></a>
</p>

# About

This monorepo contains the code for both https://www.aphiria.com and https://api.aphiria.com.

## Directory Structure

- _apps_: The source code for the web and API applications
    - _apps/api_: The API code
    - _apps/web_: The website code
- _infrastructure_: Contains the Docker and Pulumi infrastructure-as-code
- _specs_: The GitHub Spec Kit specs
- _tests_: End-to-end tests of the entire website using Playwright

## Preview Environments

Pull requests automatically generate ephemeral preview environments for testing changes before merging.

- **Web Preview**: `https://{PR}.pr.aphiria.com`
- **API Preview**: `https://{PR}.pr-api.aphiria.com`

**For contributors**: Preview deployments happen automatically after maintainer approval. No setup required!

**For maintainers**:

- Secrets management: [`SECRETS.md`](SECRETS.md)

## Getting Started

### 1. Install System Dependencies

First, [install Docker](https://docs.docker.com/engine/install/). Then, run the following command to install kubectl, Minikube, Pulumi, and Node.js:

```bash
./install.sh
```

> **Note:** You may have to run `chmod +x ./install.sh` to make the script executable.

### 2. Install Root Dependencies

Install TypeScript tooling dependencies (required for both infrastructure deployment and E2E testing):

```bash
npm install
```

This installs ESLint, Prettier, and TypeScript dependencies used across the monorepo.

### 3. Update Your Host File

Add the following to your host file:

```
127.0.0.1 aphiria.com
127.0.0.1 api.aphiria.com
127.0.0.1 www.aphiria.com
127.0.0.1 grafana.aphiria.com
```

## Local Development

### Running the Site Locally

#### 1. Start Minikube

```bash
minikube start
minikube addons enable metrics-server
```

> **Note:** The `metrics-server` addon is required for Grafana dashboards to display CPU/memory metrics.

In a separate terminal, run Minikube tunnel (required for LoadBalancer access):

```bash
minikube tunnel
```

> **Note:** You'll need to enter your sudo password. Keep this terminal running.

#### 2. Build Docker Images

```bash
eval $(minikube -p minikube docker-env)
docker build -t aphiria.com-build -f ./infrastructure/docker/build/Dockerfile .
docker build -t aphiria.com-api:latest -f ./infrastructure/docker/runtime/api/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build
docker build -t aphiria.com-web:latest -f ./infrastructure/docker/runtime/web/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build
```

#### 3. Deploy with Pulumi

```bash
cd infrastructure/pulumi
npm install
npm run build
pulumi login --local
export PULUMI_CONFIG_PASSPHRASE="password"
pulumi up --stack local
```

> **Note:** `pulumi login --local` stores state on your machine in `~/.pulumi` and doesn't require a Pulumi Cloud account. The local stack uses passphrase `"password"` for encryption (safe to share - no actual secrets in local stack).

> **Note:** If you need to log back into the cloud instance, run `pulumi logout`, then `pulumi login` to authenticate with Pulumi Cloud.

### Making Changes

After modifying code, rebuild the Docker images (step 2 above), then update the running cluster:

```bash
kubectl rollout restart deployment api
kubectl rollout restart deployment web
```

> **Note:** This picks up new Docker image changes without re-running `pulumi up`.

### Accessing the Site

- https://www.aphiria.com (web)
- https://api.aphiria.com/docs (API documentation)
- https://grafana.aphiria.com (monitoring dashboards)

> **Note:** You'll see a certificate warning (self-signed cert). In Chrome, type `thisisunsafe` (there is no input - just type that phrase with the page displayed) to bypass. In other browsers, click advanced and accept the certificate.

### Connecting to the Database

```bash
kubectl port-forward service/db 5432:5432
psql -h localhost -U aphiria -d postgres
```

## Development Workflows

### Testing

#### PHP Tests

```bash
cd apps/api
composer phpunit
```

#### Pulumi Tests

```bash
cd infrastructure/pulumi
npm test
```

#### E2E Tests

**Prerequisites**: Ensure root dependencies are installed (`npm install` from repo root).

**Against local minikube** (accepts self-signed certificates):

```bash
cd tests/e2e
cp .env.dist .env
npm install
npx playwright install --with-deps chromium
npm run test:e2e:local
```

**Against production/preview** (validates certificates):

```bash
cd tests/e2e
SITE_BASE_URL=https://www.aphiria.com \
GRAFANA_BASE_URL=https://grafana.aphiria.com \
npm run test:e2e
```

> **Note:** E2E tests run automatically after deployments via GitHub Actions. See `.github/workflows/cd.yml` for the full workflow.

### Code Quality

#### PHP Linting & Static Analysis

```bash
cd apps/api
composer phpcs-fix
composer psalm
```

#### TypeScript/GitHub Workflow Linting & Formatting

All TypeScript code (infrastructure and tests) and GitHub workflow code is linted and formatted from the root:

```bash
npm run lint:fix
npm run format
```

## Infrastructure

### Common Pulumi Commands

```bash
cd infrastructure/pulumi

# Set passphrase for Pulumi commands (required for local stack)
export PULUMI_CONFIG_PASSPHRASE="password"

# Preview changes before applying
pulumi preview --stack local

# Apply infrastructure changes
pulumi up --stack local

# Tear down the local environment
pulumi destroy --stack local

# Sync Pulumi state with actual cluster state
pulumi refresh --stack local

# Cancel a stuck deployment
pulumi cancel --stack local
```

### Minikube Dashboard

View the cluster state visually:

```bash
minikube dashboard
```

## Monitoring (Optional)

### Grafana Configuration

The local stack includes Grafana monitoring. Before running `pulumi up`, configure these values:

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

### Prometheus

To view the Prometheus dashboard, configure port forwarding in a separate console:

```bash
kubectl port-forward -n monitoring svc/prometheus 9090
```

Then, visit http://localhost:9090/ in your browser.
