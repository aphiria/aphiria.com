# Quickstart Guide: SSR Migration

**Feature**: SSR Migration (003-ssr-migration)
**Date**: 2026-01-22
**Audience**: Developers working on the SSR migration

---

## Overview

This guide walks you through running the SSR-enabled Aphiria.com site locally, building the Docker image, deploying to minikube, and verifying SSR functionality.

**Prerequisites:**
- Node.js 20+
- Docker
- minikube (for local Kubernetes testing)
- kubectl
- Pulumi CLI

---

## Local Development (npm run dev)

The development server (`npm run dev`) already uses SSR by default. No configuration changes needed.

### 1. Install Dependencies

```bash
cd apps/web
npm install
```

### 2. Set Environment Variables

Create `.env.local` (gitignored):

```bash
# apps/web/.env.local
API_URI=http://localhost:8080
COOKIE_DOMAIN=localhost
```

### 3. Start Development Server

```bash
npm run dev
```

Server runs on http://localhost:3000

### 4. Verify SSR is Working

**Check 1: No Flicker**
- Visit http://localhost:3000/docs/1.x/introduction
- Context selector should show correct value immediately (no flicker)

**Check 2: View Page Source**
- Right-click → "View Page Source"
- Content should be in initial HTML (not just loading spinner)

**Check 3: Browser Console**
- Open DevTools Console
- Should see NO hydration mismatch errors

---

## Building Docker Image

### 1. Ensure Configuration is Set

Update `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
    output: "standalone",  // Changed from "export"
};
```

### 2. Build the Image

```bash
cd apps/web

docker build -t aphiria-web:ssr .
```

**Expected output:**
- Multi-stage build completes
- Final image size: ~150-250MB (vs 500MB+ for non-standalone)

### 3. Test the Image Locally

```bash
docker run -p 3000:3000 \
  -e API_URI=http://localhost:8080 \
  -e COOKIE_DOMAIN=localhost \
  aphiria-web:ssr
```

Visit http://localhost:3000 and verify:
- ✅ Page loads
- ✅ Context selector works
- ✅ No hydration errors in console

### 4. Verify Image Contents

```bash
# Check user
docker run --rm aphiria-web:ssr whoami
# Expected: nextjs

# Check server.js exists
docker run --rm aphiria-web:ssr ls -la
# Expected: server.js in listing

# Check environment
docker run --rm aphiria-web:ssr env | grep NODE_ENV
# Expected: NODE_ENV=production
```

---

## Deploying to Minikube

### 1. Start Minikube

```bash
minikube start --driver=docker
```

### 2. Load Docker Image into Minikube

```bash
minikube image load aphiria-web:ssr
```

**Verify:**
```bash
minikube image ls | grep aphiria-web
```

### 3. Deploy with Pulumi

```bash
cd infrastructure/pulumi

# Select local stack
pulumi stack select local

# Configure environment variables (if not already set)
pulumi config set apiUri "http://api.local.aphiria.com"
pulumi config set cookieDomain "local.aphiria.com"

# Build Pulumi TypeScript
npm run build

# Deploy
pulumi up
```

**Expected output:**
```
Updating (local)

     Type                              Name                    Status
 +   pulumi:pulumi:Stack              aphiria-local           created
 +   ├─ kubernetes:core/v1:Namespace  aphiria                 created
 +   ├─ kubernetes:apps/v1:Deployment web                     created
 +   └─ kubernetes:core/v1:Service    web                     created

Outputs:
    webUrl: "http://127.0.0.1:PORT"

Resources:
    + 4 created

Duration: 30s
```

### 4. Access the Site

**Option 1: Port Forward**
```bash
kubectl port-forward -n aphiria service/web 3000:3000
```

Visit http://localhost:3000

**Option 2: LoadBalancer (requires minikube tunnel)**
```bash
# In separate terminal (requires sudo password)
minikube tunnel

# Get LoadBalancer IP
kubectl get svc -n aphiria web
# Visit the EXTERNAL-IP shown
```

---

## Verifying SSR Functionality

### Test 1: Server-Rendered Context

**Steps:**
1. Set context cookie: `document.cookie="context=library; path=/"`
2. Reload page
3. View page source (right-click → View Page Source)

**Expected:**
- HTML should contain library-specific content in the source
- No flicker when page loads

### Test 2: URL Parameter Override

**Steps:**
1. Visit http://localhost:3000/docs/1.x/introduction?context=library
2. Check browser console for errors
3. Verify context selector shows "Library"
4. Check cookie: `document.cookie`

**Expected:**
- Context selector immediately shows "Library"
- Cookie updated to `context=library`
- No hydration errors

### Test 3: Environment Variables

**Steps:**
1. Check logs: `kubectl logs -n aphiria deployment/web`
2. Look for environment variable logging (if added)

**Expected:**
```
Environment: production
API_URI: http://api.local.aphiria.com
COOKIE_DOMAIN: local.aphiria.com
```

### Test 4: Health Checks

**Steps:**
```bash
kubectl get pods -n aphiria
kubectl describe pod -n aphiria <pod-name>
```

**Expected:**
- Pod status: `Running`
- Liveness probe: Passing
- Readiness probe: Passing
- No restarts

---

## Common Issues and Solutions

### Issue: Port 3000 Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
docker run -p 8080:3000 -e PORT=3000 aphiria-web:ssr
```

### Issue: Hydration Mismatch Errors

**Error:** `Warning: Prop 'value' did not match. Server: "framework" Client: "library"`

**Cause:** Server and client resolving different context values

**Solution:**
1. Check cookie value matches server resolution
2. Verify `initialContext` prop is from server-side resolution
3. Ensure no client-side useEffect changing state before hydration

### Issue: Docker Build Fails

**Error:** `COPY failed: file not found in build context`

**Solution:**
1. Ensure `.dockerignore` exists and is correct
2. Build from `apps/web` directory (not repository root)
3. Check file paths in `COPY` commands

### Issue: Cannot Connect to API

**Error:** `Failed to fetch: CORS error`

**Cause:** API_URI environment variable incorrect or API not running

**Solution:**
1. Verify API_URI: `echo $API_URI`
2. Check API is accessible: `curl $API_URI/health`
3. Update environment variable in Pulumi or Docker run command

### Issue: Kubernetes Pod Crashes

**Error:** `CrashLoopBackOff`

**Debugging:**
```bash
# Check logs
kubectl logs -n aphiria deployment/web

# Check events
kubectl describe pod -n aphiria <pod-name>

# Check resource limits
kubectl top pod -n aphiria
```

**Common causes:**
- Insufficient memory (increase limits to 512Mi)
- Missing environment variables
- Image pull errors (check `minikube image ls`)

---

## Development Workflow

### Making Changes

1. **Code change in apps/web**
   ```bash
   cd apps/web
   npm run dev  # Test locally
   ```

2. **Rebuild Docker image**
   ```bash
   docker build -t aphiria-web:ssr .
   minikube image load aphiria-web:ssr
   ```

3. **Update deployment**
   ```bash
   cd infrastructure/pulumi
   pulumi up
   ```

4. **Verify changes**
   ```bash
   kubectl rollout status -n aphiria deployment/web
   kubectl port-forward -n aphiria service/web 3000:3000
   ```

### Running Tests

**Unit tests:**
```bash
cd apps/web
npm test
```

**E2E tests (against local deployment):**
```bash
cd tests/e2e
export SITE_BASE_URL=http://localhost:3000
npm test
```

---

## Environment Variable Reference

### Development (`npm run dev`)

| Variable | Value | Source |
|----------|-------|--------|
| NODE_ENV | development | Automatic |
| API_URI | http://localhost:8080 | `.env.local` |
| COOKIE_DOMAIN | localhost | `.env.local` |

### Docker (Local Testing)

| Variable | Value | Source |
|----------|-------|--------|
| NODE_ENV | production | Dockerfile |
| PORT | 3000 | Dockerfile |
| HOSTNAME | 0.0.0.0 | Dockerfile |
| API_URI | http://localhost:8080 | `-e` flag |
| COOKIE_DOMAIN | localhost | `-e` flag |

### Kubernetes (Minikube)

| Variable | Value | Source |
|----------|-------|--------|
| NODE_ENV | production | Pulumi |
| PORT | 3000 | Pulumi |
| HOSTNAME | 0.0.0.0 | Pulumi |
| API_URI | http://api.local.aphiria.com | Pulumi config |
| COOKIE_DOMAIN | local.aphiria.com | Pulumi config |
| NODE_OPTIONS | --max-old-space-size=409 | Pulumi (80% of 512Mi) |

---

## Next Steps

Once SSR is working locally:

1. **Deploy to Preview Environment**
   ```bash
   pulumi stack select preview
   pulumi up
   ```

2. **Run E2E Tests Against Preview**
   ```bash
   export SITE_BASE_URL=https://pr-123.aphiria-preview.com
   npm test --prefix tests/e2e
   ```

3. **Performance Testing**
   - Compare response times vs current SSG
   - Monitor memory usage
   - Check Time to First Byte (TTFB)

4. **Deploy to Production**
   ```bash
   pulumi stack select production
   pulumi up
   ```

---

## Useful Commands

### Docker

```bash
# Build
docker build -t aphiria-web:ssr .

# Run with env vars
docker run -p 3000:3000 \
  -e API_URI=http://localhost:8080 \
  -e COOKIE_DOMAIN=localhost \
  aphiria-web:ssr

# Shell into container
docker run -it --rm aphiria-web:ssr sh

# Check image size
docker images aphiria-web:ssr
```

### Kubernetes (Minikube)

```bash
# Load image
minikube image load aphiria-web:ssr

# Get pods
kubectl get pods -n aphiria

# Get services
kubectl get svc -n aphiria

# Port forward
kubectl port-forward -n aphiria service/web 3000:3000

# Logs
kubectl logs -n aphiria deployment/web --follow

# Describe pod
kubectl describe pod -n aphiria <pod-name>

# Shell into pod
kubectl exec -it -n aphiria <pod-name> -- sh

# Delete deployment
kubectl delete deployment -n aphiria web
```

### Pulumi

```bash
# List stacks
pulumi stack ls

# Select stack
pulumi stack select local

# View config
pulumi config

# Set config
pulumi config set apiUri "http://api.local.aphiria.com"

# Preview changes
pulumi preview

# Apply changes
pulumi up

# View outputs
pulumi stack output

# Destroy resources
pulumi destroy
```

---

## Additional Resources

- **Next.js SSR Documentation**: https://nextjs.org/docs/app/building-your-application/rendering
- **Next.js Docker Guide**: https://nextjs.org/docs/app/building-your-application/deploying#docker-image
- **Pulumi Kubernetes Guide**: https://www.pulumi.com/docs/clouds/kubernetes/get-started/
- **Minikube Documentation**: https://minikube.sigs.k8s.io/docs/

---

## Getting Help

If you encounter issues:

1. Check this quickstart guide
2. Review error logs (`kubectl logs`, Docker logs)
3. Verify environment variables are set correctly
4. Check resource limits (memory, CPU)
5. Review Pulumi state (`pulumi stack export`)

**Still stuck?** Open a GitHub issue with:
- Steps to reproduce
- Error messages (full logs)
- Environment (local/minikube/preview/production)
- Docker/Kubernetes/Pulumi versions
