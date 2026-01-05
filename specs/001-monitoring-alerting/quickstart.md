# Monitoring & Alerting Quickstart Guide

**Feature**: Production Monitoring and Alerting (001-monitoring-alerting)
**Last Updated**: 2025-12-28
**Related**: [spec.md](./spec.md), [plan.md](./plan.md)

## Overview

This guide covers local development, deployment, and operational procedures for the Prometheus + Grafana monitoring stack. All infrastructure is managed via Pulumi with zero manual kubectl configuration.

**Architecture**:

- **Prometheus**: Metrics collection and storage (7-day retention)
- **Grafana**: Visualization and alerting (Grafana Unified Alerting)
- **Namespace**: `monitoring`
- **Authentication**: GitHub OAuth (org: aphiria)
- **Alerts**: Email delivery (production), log-only (preview)
- **Access**: https://grafana.aphiria.com

---

## 1. Local Development Setup

### Prerequisites

- Minikube or kind cluster running
- kubectl configured for local cluster
- Docker for building images
- Node.js 20+ and npm
- Pulumi CLI installed

### Step 1: Verify Cluster Context

```bash
# Check you're connected to local cluster (NOT production)
kubectl cluster-info | head -1
# Expected: "Kubernetes control plane is running at https://127.0.0.1:..."

# Or for minikube specifically
kubectl config current-context
# Expected: "minikube" or "kind-<cluster-name>"
```

### Step 2: Install Monitoring Stack Locally

```bash
cd /home/dyoung/PHPStormProjects/aphiria_com/infrastructure/pulumi

# Compile TypeScript (REQUIRED before every Pulumi command)
npm run build

# Deploy to local stack
pulumi stack select local
pulumi up

# Review changes, confirm with "yes"
```

**What Gets Deployed**:

- Prometheus StatefulSet (port 9090)
- Grafana Deployment (port 3000)
- PersistentVolumeClaims for both
- ConfigMaps for alert rules and dashboards
- Services for internal communication
- HTTPRoute for ingress (if NGINX Gateway is installed)

### Step 3: Access Dashboards Locally

**Option A: Port Forward (Recommended for Local)**

```bash
# Forward Grafana port to localhost
kubectl port-forward -n monitoring service/grafana 3000:3000

# Open browser to http://localhost:3000
# Default credentials: admin / admin (change on first login)
```

**Option B: Minikube Service (Minikube Only)**

```bash
# Expose service and open browser
minikube service -n monitoring grafana
```

### Step 4: Verify Prometheus is Scraping

```bash
# Port forward Prometheus
kubectl port-forward -n monitoring service/prometheus 9090:9090

# Open http://localhost:9090
# Navigate to Status > Targets
# Verify all scrape targets are "UP"
```

### Step 5: Configure Local Datasource

If Grafana doesn't auto-configure Prometheus datasource:

1. Navigate to Configuration > Data Sources > Add data source
2. Select "Prometheus"
3. Set URL: `http://prometheus.monitoring.svc.cluster.local:9090`
4. Click "Save & Test" (should show "Data source is working")

---

## 2. GitHub OAuth Setup

### For Local Development (Optional)

Local development typically uses default Grafana credentials (admin/admin). Skip OAuth for local unless testing auth flow.

### For Production (grafana.aphiria.com)

**Step 1: Create GitHub OAuth App**

1. Go to https://github.com/organizations/aphiria/settings/applications/new
2. Fill in:
    - **Application name**: `Grafana - Aphiria.com Monitoring`
    - **Homepage URL**: `https://grafana.aphiria.com`
    - **Authorization callback URL**: `https://grafana.aphiria.com/login/github`
3. Click "Register application"
4. Copy the **Client ID**
5. Click "Generate a new client secret", copy the **Client Secret**

**Step 2: Store Credentials in Pulumi ESC**

```bash
# Set GitHub OAuth client ID (non-secret, can be in stack config)
pulumi config set --stack production grafana-github-client-id <CLIENT_ID>

# Set GitHub OAuth client secret (encrypted secret)
pulumi config set --stack production --secret grafana-github-client-secret <CLIENT_SECRET>
```

**Step 3: Configure Grafana via Pulumi**

The Grafana component reads these values from stack config:

```typescript
// Example from grafana-component.ts
const githubClientId = config.require("grafana-github-client-id");
const githubClientSecret = config.requireSecret("grafana-github-client-secret");

// GF_AUTH_GITHUB_ENABLED=true
// GF_AUTH_GITHUB_ALLOW_SIGN_UP=false
// GF_AUTH_GITHUB_CLIENT_ID=<client_id>
// GF_AUTH_GITHUB_CLIENT_SECRET=<client_secret>
// GF_AUTH_GITHUB_ALLOWED_ORGANIZATIONS=aphiria
// GF_AUTH_GITHUB_ROLE_ATTRIBUTE_PATH=contains(groups[*], '@aphiria/admins') && 'Admin' || 'Viewer'
```

**Step 4: Deploy Changes**

```bash
cd infrastructure/pulumi
npm run build
pulumi up --stack production
```

**Step 5: Test OAuth Flow**

1. Navigate to https://grafana.aphiria.com
2. Click "Sign in with GitHub"
3. Authorize the application
4. Verify you're logged in with correct role (Viewer for org members, Admin for davidbyoung)

**Troubleshooting OAuth**:

- **"Invalid redirect URI"**: Verify callback URL in GitHub app settings matches exactly
- **"Organization not allowed"**: Check GF_AUTH_GITHUB_ALLOWED_ORGANIZATIONS is set to "aphiria"
- **Wrong role assignment**: Verify role_attribute_path logic matches your GitHub team structure

---

## 3. SMTP Configuration

### Production Email Alerts

Alerts are delivered via email to `admin@aphiria.com` in production. Configure SMTP in Pulumi ESC:

**Step 1: Store SMTP Credentials**

```bash
pulumi config set --stack production --secret smtp-username <username>
pulumi config set --stack production --secret smtp-password <password>
pulumi config set --stack production smtp-host smtp.example.com
pulumi config set --stack production smtp-port 587
pulumi config set --stack production smtp-from-address alerts@aphiria.com
pulumi config set --stack production smtp-from-name "Aphiria Monitoring"
```

**Step 2: Grafana Configuration**

The Grafana component configures SMTP via environment variables:

```typescript
// Example from grafana-component.ts
const smtpHost = config.require("smtp-host");
const smtpPort = config.require("smtp-port");
const smtpUsername = config.requireSecret("smtp-username");
const smtpPassword = config.requireSecret("smtp-password");

// GF_SMTP_ENABLED=true
// GF_SMTP_HOST=smtp.example.com:587
// GF_SMTP_USER=<username>
// GF_SMTP_PASSWORD=<password>
// GF_SMTP_FROM_ADDRESS=alerts@aphiria.com
// GF_SMTP_FROM_NAME=Aphiria Monitoring
```

**Step 3: Deploy and Verify**

```bash
cd infrastructure/pulumi
npm run build
pulumi up --stack production

# Check Grafana logs for SMTP connection
kubectl logs -n monitoring deployment/grafana | grep -i smtp
```

### Preview Environments

Preview environments suppress email delivery (alerts log-only). No SMTP configuration needed.

**Environment Detection**:

```typescript
// Alert notification logic
const environment = config.require("environment");
const emailEnabled = environment === "production"; // true for prod, false for preview
```

---

## 4. Testing Alerts

### Trigger CPU Stress Test

**Generate Load on API Pods**:

```bash
# Find API pod name
kubectl get pods -n default -l app=api

# Exec into pod
kubectl exec -it -n default <api-pod-name> -- /bin/bash

# Install stress tool (if not available)
apt-get update && apt-get install -y stress

# Generate CPU load (80%+ for 10+ minutes to trigger alert)
stress --cpu 4 --timeout 600s

# Exit pod
exit
```

**Expected Alert**: After 10 minutes of sustained >80% CPU, Grafana evaluates alert rule and sends email to admin@aphiria.com (production only).

### Simulate High Error Rate

**Generate 500 Errors**:

```bash
# Send requests that trigger errors
for i in {1..100}; do
  curl -s https://api.aphiria.com/nonexistent-endpoint > /dev/null
done

# Check error rate in Prometheus
# Query: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

**Expected Alert**: If error rate exceeds 5% for 5 minutes, alert fires.

### Simulate Pod Failure

```bash
# Delete a pod to trigger CrashLoopBackOff (if app has startup issues)
kubectl delete pod -n default <pod-name>

# Or scale down to 0 replicas
kubectl scale deployment -n default api --replicas=0

# Check pod status
kubectl get pods -n default -w
```

**Expected Alert**: Pod in Failed/CrashLoopBackOff state triggers immediate alert.

### Verify Alert Delivery

**Check Grafana Alert History**:

1. Navigate to Grafana > Alerting > Alert rules
2. Find the triggered alert
3. Check "State history" tab

**Check Email Delivery** (Production only):

- Wait up to 2 minutes for alert evaluation
- Check admin@aphiria.com inbox for alert email
- Verify email contains environment, severity, and metric details

**Check Logs** (Preview environments):

```bash
kubectl logs -n monitoring deployment/grafana | grep -i alert
```

---

## 5. Adding New Alert Rules

Alert rules are defined in TypeScript for type safety and parameterization.

### Step 1: Edit Alert Rules Component

```bash
# Open alert rules definition
vim infrastructure/pulumi/src/components/monitoring/alert-rules-component.ts
```

### Step 2: Add Alert Rule Object

```typescript
// Example: Add disk space alert
const rules: PrometheusAlertRule[] = [
    // ... existing rules ...
    {
        alert: "HighDiskUsage",
        expr: "kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes > 0.85",
        for: "10m",
        labels: {
            severity: environment === "production" ? "warning" : "info",
            environment: environment,
        },
        annotations: {
            summary: "High disk usage on {{ $labels.persistentvolumeclaim }}",
            description:
                "Disk usage is {{ $value | humanizePercentage }} on PVC {{ $labels.persistentvolumeclaim }}",
        },
    },
];
```

**Rule Fields**:

- `alert`: Unique alert name (CamelCase)
- `expr`: PromQL query (string, returns boolean when threshold exceeded)
- `for`: Duration threshold must be met before firing (e.g., "10m", "5m")
- `labels.severity`: `critical`, `warning`, or `info`
- `labels.environment`: Injected from stack config (production/preview)
- `annotations.summary`: Short description (supports templating)
- `annotations.description`: Detailed description (supports templating)

### Step 3: Validate PromQL Query

Test your query in Prometheus UI before deploying:

```bash
# Port forward Prometheus
kubectl port-forward -n monitoring service/prometheus 9090:9090

# Open http://localhost:9090
# Paste your expr query in the query box
# Verify it returns data
```

### Step 4: Write Unit Tests

```bash
# Edit test file
vim infrastructure/pulumi/tests/components/alert-rules-component.test.ts
```

```typescript
// Example test
it("should create HighDiskUsage alert rule", () => {
    const resources = setup();
    const configMap = resources.find((r) => r.type === "kubernetes:core/v1:ConfigMap");
    const alertRules = configMap.data["alert-rules.yml"];

    expect(alertRules).toContain("alert: HighDiskUsage");
    expect(alertRules).toContain("kubelet_volume_stats_used_bytes");
});
```

### Step 5: Run Quality Gates

```bash
cd infrastructure/pulumi

# Lint TypeScript (MUST pass with 0 errors, 0 warnings)
npm run lint

# Run tests (MUST pass 100% with coverage thresholds)
npm test

# Compile TypeScript (REQUIRED before pulumi up)
npm run build
```

### Step 6: Deploy Changes

```bash
# Preview changes
pulumi preview --stack production

# Deploy
pulumi up --stack production

# Verify alert rule loaded
kubectl logs -n monitoring statefulset/prometheus | grep -i "HighDiskUsage"
```

### Step 7: Test Alert Firing

Trigger the condition and verify alert fires as expected (see section 4 above).

---

## 6. Adding New Dashboards

Dashboards are defined as JSON files in source control and deployed via Pulumi.

### Step 1: Create Dashboard JSON

**Option A: Export from Grafana UI (Initial Creation)**

1. Create dashboard manually in Grafana UI (local instance)
2. Navigate to Dashboard Settings > JSON Model
3. Copy the JSON
4. Save to `specs/001-monitoring-alerting/contracts/dashboards/<name>.json`

**Option B: Write JSON from Scratch**

```bash
vim specs/001-monitoring-alerting/contracts/dashboards/custom-dashboard.json
```

```json
{
    "uid": "custom-dashboard",
    "title": "Custom Dashboard",
    "tags": ["custom"],
    "timezone": "browser",
    "schemaVersion": 38,
    "version": 1,
    "refresh": "30s",
    "time": {
        "from": "now-1h",
        "to": "now"
    },
    "panels": [
        {
            "id": 1,
            "type": "graph",
            "title": "Custom Metric",
            "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
            "targets": [
                {
                    "expr": "your_prometheus_query_here",
                    "refId": "A",
                    "datasource": { "type": "prometheus", "uid": "prometheus" }
                }
            ]
        }
    ]
}
```

**Key Fields**:

- `uid`: Unique identifier (lowercase-with-hyphens)
- `title`: Display name
- `refresh`: Auto-refresh interval ("30s", "1m", "5m")
- `panels[].targets[].expr`: PromQL query
- `datasource.uid`: Must match Prometheus datasource UID ("prometheus")

### Step 2: Reference Dashboard in Component

```bash
vim infrastructure/pulumi/src/components/monitoring/dashboards-component.ts
```

```typescript
import * as fs from "fs";
import * as path from "path";

// Load dashboard JSON files
const dashboardsDir = path.join(
    __dirname,
    "../../../../../specs/001-monitoring-alerting/contracts/dashboards"
);
const dashboards = [
    fs.readFileSync(path.join(dashboardsDir, "cluster-overview.json"), "utf8"),
    fs.readFileSync(path.join(dashboardsDir, "namespace-service.json"), "utf8"),
    fs.readFileSync(path.join(dashboardsDir, "api-performance.json"), "utf8"),
    fs.readFileSync(path.join(dashboardsDir, "error-rates.json"), "utf8"),
    fs.readFileSync(path.join(dashboardsDir, "resource-utilization.json"), "utf8"),
    fs.readFileSync(path.join(dashboardsDir, "custom-dashboard.json"), "utf8"), // ADD THIS
];

// Create ConfigMap with all dashboards
const dashboardConfigMap = new k8s.core.v1.ConfigMap("grafana-dashboards", {
    metadata: { name: "grafana-dashboards", namespace: "monitoring" },
    data: {
        "dashboards.json": JSON.stringify(dashboards.map((d) => JSON.parse(d))),
    },
});
```

### Step 3: Write Unit Tests

```bash
vim infrastructure/pulumi/tests/components/dashboards-component.test.ts
```

```typescript
it("should include custom dashboard", () => {
    const resources = setup();
    const configMap = resources.find((r) => r.type === "kubernetes:core/v1:ConfigMap");
    const dashboards = JSON.parse(configMap.data["dashboards.json"]);

    const customDashboard = dashboards.find((d) => d.uid === "custom-dashboard");
    expect(customDashboard).toBeDefined();
    expect(customDashboard.title).toBe("Custom Dashboard");
});
```

### Step 4: Run Quality Gates

```bash
cd infrastructure/pulumi

npm run lint        # 0 errors, 0 warnings
npm test            # 100% pass + coverage
npm run build       # Compile TypeScript
```

### Step 5: Deploy and Verify

```bash
pulumi up --stack production

# Verify dashboard loaded in Grafana
# Navigate to Grafana > Dashboards > Browse
# Look for "Custom Dashboard"
```

### Step 6: Lock Down UI Editing (Prevent Drift)

Dashboard JSON is source of truth. Prevent manual edits via Grafana config:

```typescript
// In grafana-component.ts
const grafanaConfig = {
    // ...
    dashboards: {
        default_home_dashboard_path: "/etc/grafana/provisioning/dashboards/cluster-overview.json",
    },
    users: {
        viewers_can_edit: false, // Prevent Viewer role from editing
    },
};
```

This is enforced by default. Any UI changes will be discarded on Grafana restart.

---

## 7. Troubleshooting

### Prometheus Scraping Failures

**Symptom**: Targets show "DOWN" in Prometheus UI (Status > Targets)

**Diagnosis**:

```bash
# Check Prometheus logs
kubectl logs -n monitoring statefulset/prometheus | grep -i error

# Check if target pods are running
kubectl get pods -n default

# Check if target pods expose metrics endpoint
kubectl exec -it -n default <pod-name> -- curl http://localhost:9090/metrics
```

**Common Causes**:

- **Port mismatch**: Verify pod exposes metrics on expected port (usually 9090 or 8080)
- **No metrics exporter**: Application pods must expose Prometheus-compatible /metrics endpoint
- **Network policy**: Ensure monitoring namespace can reach target pods
- **ServiceMonitor misconfiguration**: Verify label selectors match target services

**Fix**:

```bash
# Example: Add metrics endpoint to API deployment
# Edit src/components/api-deployment.ts to add:
# - Container port 9090 (metrics)
# - Annotation: prometheus.io/scrape: "true"

npm run build
pulumi up --stack production
```

### Grafana Datasource Connection Issues

**Symptom**: Dashboards show "Data source not found" or "Error loading data"

**Diagnosis**:

```bash
# Check Grafana logs
kubectl logs -n monitoring deployment/grafana | grep -i datasource

# Verify Prometheus service is reachable from Grafana pod
kubectl exec -it -n monitoring deployment/grafana -- curl http://prometheus.monitoring.svc.cluster.local:9090/-/healthy
```

**Common Causes**:

- **Service name mismatch**: Datasource URL must match Prometheus service DNS name
- **Prometheus not running**: Check `kubectl get pods -n monitoring`
- **Datasource not provisioned**: Verify datasource-component.ts creates Prometheus datasource

**Fix**:

```bash
# Manually test datasource in Grafana UI
# Configuration > Data Sources > Prometheus > Test

# If connection fails, check service DNS resolution
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://prometheus.monitoring.svc.cluster.local:9090/-/healthy
```

### Alerts Not Firing

**Symptom**: Threshold exceeded but no alert email received

**Diagnosis**:

```bash
# Check Grafana alert evaluation logs
kubectl logs -n monitoring deployment/grafana | grep -i alert

# Verify alert rules loaded in Prometheus
kubectl port-forward -n monitoring service/prometheus 9090:9090
# Open http://localhost:9090/alerts
# Check if rule is present and evaluating

# Check SMTP configuration
kubectl logs -n monitoring deployment/grafana | grep -i smtp
```

**Common Causes**:

- **Alert rule not loaded**: ConfigMap update didn't trigger reload
- **PromQL query returns no data**: Query syntax error or missing metrics
- **Email delivery failure**: SMTP credentials incorrect or network blocked
- **Preview environment**: Email suppressed intentionally (expected behavior)

**Fix**:

```bash
# Force reload Prometheus config
kubectl rollout restart -n monitoring statefulset/prometheus

# Force reload Grafana config
kubectl rollout restart -n monitoring deployment/grafana

# Test alert rule manually in Prometheus UI
# Paste expr query and verify it returns data
```

### Dashboard Shows "No Data"

**Symptom**: Dashboard panels display "No data" despite metrics being scraped

**Diagnosis**:

```bash
# Check if Prometheus has data for query
kubectl port-forward -n monitoring service/prometheus 9090:9090
# Open http://localhost:9090
# Run the dashboard panel's query
# Verify it returns results

# Check dashboard datasource configuration
# Grafana > Dashboard > Settings > Variables
# Verify datasource variable is set to "prometheus"
```

**Common Causes**:

- **Time range too narrow**: Dashboard shows "Last 5 minutes" but data collection just started
- **PromQL query error**: Query syntax invalid or metric name misspelled
- **Datasource mismatch**: Panel configured for wrong datasource UID

**Fix**:

```bash
# Update dashboard JSON to use correct datasource UID
vim specs/001-monitoring-alerting/contracts/dashboards/<name>.json
# Change "datasource": {"uid": "wrong"} to {"uid": "prometheus"}

npm run build
pulumi up --stack production
```

### High Memory Usage on Prometheus

**Symptom**: Prometheus pod OOMKilled or memory limit warnings

**Diagnosis**:

```bash
# Check memory usage
kubectl top pod -n monitoring prometheus-0

# Check retention period (higher retention = more memory)
kubectl describe statefulset -n monitoring prometheus | grep -i retention
```

**Common Causes**:

- **Too many metrics**: High cardinality labels (unique label combinations)
- **Long retention period**: 7-day retention on high-traffic cluster
- **Insufficient resource limits**: Memory limit too low for workload

**Fix**:

```typescript
// Edit prometheus-component.ts to increase memory limits
const prometheusDeployment = new k8s.apps.v1.StatefulSet("prometheus", {
    // ...
    spec: {
        template: {
            spec: {
                containers: [
                    {
                        resources: {
                            requests: { memory: "512Mi" }, // Increase from 256Mi
                            limits: { memory: "1Gi" }, // Increase from 512Mi
                        },
                    },
                ],
            },
        },
    },
});
```

```bash
npm run build
pulumi up --stack production
```

### HTTPRoute Not Routing to Grafana

**Symptom**: https://grafana.aphiria.com returns 404 or connection refused

**Diagnosis**:

```bash
# Check HTTPRoute exists
kubectl get httproute -n monitoring

# Check NGINX Gateway logs
kubectl logs -n nginx-gateway deployment/nginx-gateway

# Verify Grafana service is running
kubectl get svc -n monitoring grafana

# Check TLS certificate provisioned
kubectl get certificate -n monitoring
```

**Common Causes**:

- **HTTPRoute missing**: grafana-ingress-component.ts not deployed
- **DNS not configured**: grafana.aphiria.com doesn't resolve to cluster IP
- **NGINX Gateway not installed**: Base infrastructure missing
- **TLS certificate pending**: Let's Encrypt validation in progress

**Fix**:

```bash
# Check HTTPRoute configuration
kubectl describe httproute -n monitoring grafana

# Test service directly (port-forward)
kubectl port-forward -n monitoring service/grafana 3000:3000
# If this works, issue is with ingress/TLS, not Grafana

# Check certificate status
kubectl describe certificate -n monitoring grafana-tls
```

---

## Common Workflows

### Deploy Changes After Code Edits

```bash
cd infrastructure/pulumi

# ALWAYS run quality gates first
npm run lint        # ESLint (0 errors, 0 warnings)
npm test            # Jest tests (100% pass + coverage)
npm run build       # Compile TypeScript

# Deploy
pulumi preview --stack production  # Review changes
pulumi up --stack production       # Apply changes
```

### Check Monitoring Stack Health

```bash
# Check all monitoring pods running
kubectl get pods -n monitoring

# Check Prometheus targets
kubectl port-forward -n monitoring service/prometheus 9090:9090
# Open http://localhost:9090/targets

# Check Grafana datasource
kubectl port-forward -n monitoring service/grafana 3000:3000
# Open http://localhost:3000
# Configuration > Data Sources > Prometheus > Test
```

### View Logs

```bash
# Prometheus logs
kubectl logs -n monitoring statefulset/prometheus

# Grafana logs
kubectl logs -n monitoring deployment/grafana

# Follow logs in real-time
kubectl logs -f -n monitoring deployment/grafana
```

### Restart Services

```bash
# Restart Prometheus (reload config)
kubectl rollout restart -n monitoring statefulset/prometheus

# Restart Grafana (reload config)
kubectl rollout restart -n monitoring deployment/grafana
```

---

## Quality Gates Reference

Before completing ANY monitoring infrastructure task:

```bash
cd infrastructure/pulumi

npm run lint        # ESLint: MUST pass with 0 errors, 0 warnings
npm test            # Jest: MUST pass 100% with coverage thresholds
npm run build       # TypeScript: MUST compile with no errors
```

**Coverage Thresholds** (from jest.config.js):

- Branches: 100%
- Functions: 100%
- Lines: 100%
- Statements: 100%

If any quality gate fails, fix before proceeding. NO exceptions.

---

## Additional Resources

- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/grafana/latest/
- **PromQL Cheat Sheet**: https://promlabs.com/promql-cheat-sheet/
- **Kubernetes Metrics**: https://kubernetes.io/docs/concepts/cluster-administration/monitoring/
- **NGINX Gateway Fabric**: https://docs.nginx.com/nginx-gateway-fabric/

---

**Questions?** Check [spec.md](./spec.md) for requirements or [plan.md](./plan.md) for implementation details.
