# Dev-Local Setup Guide

This guide explains how to set up and deploy the Aphiria.com dev-local environment using Pulumi.

## Prerequisites

1. **Minikube** running: `minikube start`
2. **Minikube tunnel** running (required for LoadBalancer access):
   ```bash
   # In a separate terminal, run:
   minikube tunnel
   ```
   > **Note**: You'll need to enter your `sudo` password when prompted. Keep this terminal running throughout your dev session.
3. **kubectl** configured for Minikube context
4. **Pulumi CLI** installed
5. **Node.js** and npm installed
6. **Docker images** built and loaded into Minikube

## Pulumi Backend Configuration

The project uses DigitalOcean Spaces as the Pulumi backend (configured in `Pulumi.yml`).

### Option 1: Use DigitalOcean Spaces Backend (Recommended)

Set AWS credentials for DigitalOcean Spaces access:

```bash
export AWS_ACCESS_KEY_ID="your-do-spaces-access-key"
export AWS_SECRET_ACCESS_KEY="your-do-spaces-secret-key"
```

### Option 2: Use Local Pulumi Backend

For local-only development without cloud backend:

```bash
# Switch to local backend
pulumi login --local

# Optionally switch back to Spaces later
pulumi login s3://aphiria-com-infrastructure?endpoint=nyc3.digitaloceanspaces.com&region=us-east-1&s3ForcePathStyle=true
```

## Initial Setup

1. **Install dependencies**:

```bash
cd infrastructure/pulumi
npm install
```

2. **Initialize the dev-local stack**:

```bash
pulumi stack init dev-local
```

3. **Configure stack secrets**:

```bash
# Database password
pulumi config set --secret dbPassword password

# Add any other required secrets from .env file
```

## Build and Load Docker Images

Before deploying, build and load images into Minikube:

```bash
# Set Docker to use Minikube's daemon
eval $(minikube -p minikube docker-env)

# Build images
docker build -t aphiria.com-build -f ./infrastructure/docker/build/Dockerfile .
docker build -t davidbyoung/aphiria.com-api:latest -f ./infrastructure/docker/runtime/api/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build
docker build -t davidbyoung/aphiria.com-web:latest -f ./infrastructure/docker/runtime/web/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build
```

## Deploy

```bash
cd infrastructure/pulumi
pulumi up --stack dev-local
```

This will:
1. Install cert-manager and nginx-gateway-fabric via Helm
2. Create PostgreSQL with persistent storage
3. Create Gateway with self-signed TLS certificates
4. Deploy web and API applications
5. Run database migrations and seeders
6. Configure HTTP routes

## Verify Deployment

1. **Check Pulumi outputs**:

```bash
pulumi stack output --stack dev-local
```

Expected outputs:
- `webUrl`: https://www.aphiria.com
- `apiUrl`: https://api.aphiria.com
- `dbHost`: db

2. **Check Kubernetes resources**:

```bash
kubectl get pods
kubectl get services
kubectl get gateways -n nginx-gateway
kubectl get httproutes
```

3. **Access the site**:

Ensure `/etc/hosts` contains:
```
127.0.0.1 aphiria.com www.aphiria.com api.aphiria.com
```

Then access:
- https://www.aphiria.com (web)
- https://api.aphiria.com/docs (API docs)

**Note**: You'll see certificate warnings (self-signed cert). Accept the warning to proceed.

## Update Workflow

After making code changes:

```bash
# Rebuild images
eval $(minikube -p minikube docker-env)
docker build -t davidbyoung/aphiria.com-api:latest -f ./infrastructure/docker/runtime/api/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build
docker build -t davidbyoung/aphiria.com-web:latest -f ./infrastructure/docker/runtime/web/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build

# Update deployment
cd infrastructure/pulumi
pulumi up --stack dev-local --yes
```

## Tear Down

To completely remove the dev-local environment:

```bash
cd infrastructure/pulumi
pulumi destroy --stack dev-local
```

To remove the stack configuration:

```bash
pulumi stack rm dev-local
```

## Troubleshooting

### Pods stuck in Pending

Check PersistentVolumes:
```bash
kubectl get pv
kubectl get pvc
```

### Certificate issues

Check cert-manager:
```bash
kubectl get certificates -n nginx-gateway
kubectl describe certificate nginx-gateway-cert -n nginx-gateway
```

### Database connection issues

Check database pod logs:
```bash
kubectl logs deployment/db
```

Port-forward to test direct connection:
```bash
kubectl port-forward service/db 5432:5432
psql -h localhost -U aphiria -d postgres
```

### Migration job failed

Check job logs:
```bash
kubectl get jobs
kubectl logs job/db-migration-{hash}
```

## Differences from Kustomize

| Aspect | Kustomize (Old) | Pulumi (New) |
|--------|-----------------|--------------|
| **Deploy** | `helmfile sync && kubectl apply -k infrastructure/kubernetes/environments/dev` | `pulumi up --stack dev-local` |
| **Update** | Rebuild images + `kubectl apply` | Rebuild images + `pulumi up` |
| **Teardown** | `kubectl delete -k infrastructure/kubernetes/environments/dev && helmfile destroy` | `pulumi destroy --stack dev-local` |
| **Configuration** | Multiple YAML files + Kustomize overlays | Single TypeScript stack program |
| **State** | kubectl (cluster state) | Pulumi state (backend) |

## Next Steps

After validating dev-local works:
1. Migrate preview environments (Phase 1-6)
2. Migrate production environment (Phase 8)
3. Remove deprecated Kustomize files
