<p align="center"><a href="https://www.aphiria.com" target="_blank" title="Aphiria"><img src="https://www.aphiria.com/images/aphiria-logo.svg" width="200" height="56"></a></p>

<p align="center">
<a href="https://github.com/aphiria/aphiria.com/actions"><img src="https://github.com/aphiria/aphiria.com/workflows/CI/badge.svg"></a>
<a href="https://github.com/aphiria/aphiria.com/actions"><img src="https://github.com/aphiria/aphiria.com/workflows/CD/badge.svg"></a>
<a href="https://coveralls.io/github/aphiria/aphiria.com?branch=master"><img src="https://coveralls.io/repos/github/aphiria/aphiria.com/badge.svg?branch=master" alt="Coverage Status"></a>
<a href="https://psalm.dev"><img src="https://shepherd.dev/github/aphiria/aphiria.com/level.svg"></a>
</p>

# About

This repository contains the code for both https://www.aphiria.com and https://api.aphiria.com.

## Preview Environments

Pull requests automatically generate ephemeral preview environments for testing changes before merging.

- **Web Preview**: `https://{PR}.pr.aphiria.com`
- **API Preview**: `https://{PR}.pr-api.aphiria.com`

**For contributors**: Preview deployments happen automatically after maintainer approval. No setup required!

**For maintainers**:
- Secrets management: [`SECRETS.md`](SECRETS.md)

## Local Development Setup

### Install Dependencies

First, [install Docker](https://docs.docker.com/engine/install/). Then, run the following command to install dependencies (kubectl, Minikube, Pulumi, and Node.js):

```bash
./install.sh
```

> **Note:** You may have to run `chmod +x ./install.sh` to make the script executable.

### Update Your Host File

Add the following to your host file:

```
127.0.0.1 aphiria.com
127.0.0.1 api.aphiria.com
127.0.0.1 www.aphiria.com
127.0.0.1 grafana.aphiria.com
```

### Start Minikube

```bash
minikube start
```

In a separate terminal, run Minikube tunnel (required for LoadBalancer access):

```bash
minikube tunnel
```

> **Note:** You'll need to enter your sudo password. Keep this terminal running.

### Build Docker Images

```bash
eval $(minikube -p minikube docker-env)
docker build -t aphiria.com-build -f ./infrastructure/docker/build/Dockerfile .
docker build -t aphiria.com-api:latest -f ./infrastructure/docker/runtime/api/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build
docker build -t aphiria.com-web:latest -f ./infrastructure/docker/runtime/web/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build
```

### Deploy with Pulumi

Running this site locally uses Pulumi to provision a Kubernetes cluster. To create the cluster, run the following:

```bash
cd infrastructure/pulumi
npm install
npm run build
pulumi login --local
export PULUMI_CONFIG_PASSPHRASE="password"
pulumi up --stack local
```

> **Note:** `pulumi login --local` stores state on your machine in `~/.pulumi` and doesn't require a Pulumi Cloud account.  The local stack uses passphrase `"password"` for encryption (safe to share - no actual secrets in local stack).

### Access the Site

* https://www.aphiria.com (web)
* https://api.aphiria.com/docs (API documentation)
* https://grafana.aphiria.com (monitoring dashboards)

> **Note:** You'll see a certificate warning (self-signed cert). In Chrome, type `thisisunsafe` (there is no input - just type that phrase with the page displayed) to bypass. In other browsers, click advanced and accept the certificate.

### Connecting to the Database

```bash
kubectl port-forward service/db 5432:5432
psql -h localhost -U aphiria -d postgres
```

### Minikube Dashboard

View the cluster state visually:

```bash
minikube dashboard
```

### Common Pulumi Commands

```bash
# Set passphrase for Pulumi commands (required for local stack)
export PULUMI_CONFIG_PASSPHRASE="password"

# Tear down the local environment
pulumi destroy --stack local

# Sync Pulumi state with actual cluster state
pulumi refresh --stack local

# Cancel a stuck deployment
pulumi cancel --stack local
```

## Testing

### PHP

```bash
composer phpunit
```

### TypeScript

```bash
cd ./infrastructure/pulumi && npm test && cd ../../
```

## Linting

### PHP

```bash
composer phpcs-fix
```

### TypeScript

```bash
cd ./infrastructure/pulumi && npm install && npm run lint:fix && npm run format && cd ../../
```
