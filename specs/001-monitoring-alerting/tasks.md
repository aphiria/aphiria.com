# Implementation Tasks: Monitoring and Alerting

**Feature**: Production Monitoring and Alerting
**Branch**: `001-monitoring-alerting`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

---

## Overview

This task list implements production-grade monitoring using Prometheus and Grafana, deployed via Pulumi to production, preview, and local development environments. The system provides real-time infrastructure health visibility (CPU/memory/pod metrics), application performance monitoring (request latency/error rates), and automated email alerting with environment-specific routing (production → email, preview/local → log only).

**Critical Requirements**:
- ✅ All tests MANDATORY per CLAUDE.md Constitution Principle III (100% coverage threshold)
- ✅ Tests written BEFORE implementation (TDD)
- ✅ Quality gates: `npm run lint` (0 errors/warnings), `npm test` (100% coverage), `npm run build`
- ✅ All infrastructure changes via Pulumi (no kubectl)
- ✅ File naming: lowercase-kebab-case
- ✅ **File paths**: RELATIVE from project root (NOT absolute paths)

**Task Format**: `- [ ] [TaskID] [P?] [Story?] Description with exact file path`
- **[P]**: Task can be parallelized (different files, no dependencies)
- **[Story]**: Associated user story (US1-US6)

---

## Dependencies

**Cross-Phase Dependencies**:
```
Phase 1 (Setup)
    ↓
Phase 2 (Foundation) ← BLOCKS ALL USER STORIES
    ↓
    ├─→ Phase 3 (US1 - Infrastructure Health) ← MVP
    ├─→ Phase 4 (US2 - Secure Access)
    ├─→ Phase 5 (US3 - Application Metrics)
    └─→ Phase 6 (US4 - Alerting)
            ↓
        Phase 7 (US5 - Environment-Specific Alerts)
            ↓
        Phase 8 (US6 - Version-Controlled Dashboards)
            ↓
        Phase 9 (Polish & Cross-Cutting)
```

**Parallel Execution Examples**:
- After Phase 2: Can work on US1 (Prometheus metrics) and US2 (Grafana OAuth) in parallel
- After Phase 6: Can work on US5 (alert routing) and US6 (dashboard provisioning) in parallel
- Within Phase 3: Tests for prometheus.ts can be written while component is being implemented (TDD)

**Environment Support**: All phases support three environments (production, preview, local) with environment-specific configurations

---

## Phase 1: Project Setup

**Goal**: Initialize infrastructure dependencies and project structure. Validates TypeScript compilation, testing framework, and Pulumi configuration.

- [ ] [SETUP-001] Add monitoring component directory structure: `infrastructure/pulumi/src/components/monitoring/`
- [ ] [SETUP-002] Add monitoring test directory structure: `infrastructure/pulumi/tests/components/monitoring/`
- [ ] [SETUP-003] Verify Pulumi ESC secrets access (GitHub OAuth client secret, SMTP credentials) in production stack config
- [ ] [SETUP-004] Verify npm dependencies are current: `@pulumi/pulumi`, `@pulumi/kubernetes` (check `infrastructure/pulumi/package.json`)
- [ ] [SETUP-005] Run baseline quality gates to ensure clean starting state: `cd infrastructure/pulumi && npm run build && npm run lint && npm test`
- [ ] [SETUP-006] Document local environment /etc/hosts requirement in quickstart.md: Add note that `127.0.0.1 grafana.aphiria.com` is already documented in `README.md` and no additional setup needed for local Grafana access

---

## Phase 2: Foundational Components (BLOCKS ALL STORIES)

**Goal**: Create monitoring namespace and base infrastructure for all three environments (production, preview, local). This phase is a critical path dependency for all user stories - nothing can proceed without the namespace.

### Component Implementation

- [ ] [FOUND-001] Write tests for monitoring namespace component: `infrastructure/pulumi/tests/components/monitoring/monitoring-namespace.test.ts`
  - Test: Namespace created with name "monitoring"
  - Test: ResourceQuota configured with limits (CPU: 2 cores, Memory: 8Gi, Pods: 20)
  - Test: Labels include `app.kubernetes.io/name: aphiria` and `app.kubernetes.io/component: monitoring`
  - Test: Environment label matches stack config (`app.kubernetes.io/environment: production`, `preview`, or `local`)

- [ ] [FOUND-002] Implement monitoring namespace component: `infrastructure/pulumi/src/components/monitoring/monitoring-namespace.ts`
  - Export function: `createMonitoringNamespace(config: { env: string, provider: k8s.Provider })`
  - Create k8s.core.v1.Namespace with name "monitoring"
  - Create ResourceQuota: `requests.cpu: "2"`, `requests.memory: "8Gi"`, `limits.cpu: "2"`, `limits.memory: "8Gi"`, `pods: "20"`
  - Apply standard labels (use existing `getStandardLabels()` helper if available)
  - Return `{ namespace: k8s.core.v1.Namespace, resourceQuota: k8s.core.v1.ResourceQuota }`

- [ ] [FOUND-003] Run tests and validate 100% coverage for monitoring-namespace-component: `cd infrastructure/pulumi && npm test -- monitoring-namespace.test.ts`

### Integration with Stacks

- [ ] [FOUND-004] Add monitoring namespace to production stack: `infrastructure/pulumi/src/stacks/production.ts`
  - Import `createMonitoringNamespace` from `../components/monitoring/monitoring-namespace-component`
  - Call function with `env: "production"` and existing k8s provider
  - Export namespace name as stack output: `export const monitoringNamespaceName = namespace.metadata.name`

- [ ] [FOUND-005] Add monitoring namespace to preview stack: `infrastructure/pulumi/src/stacks/preview.ts`
  - Import `createMonitoringNamespace` from `../components/monitoring/monitoring-namespace-component`
  - Call function with `env: "preview"` and existing k8s provider
  - Export namespace name as stack output

- [ ] [FOUND-006] Add monitoring namespace to local stack: `infrastructure/pulumi/src/stacks/local.ts`
  - Import `createMonitoringNamespace` from `../components/monitoring/monitoring-namespace-component`
  - Call function with `env: "local"` and existing k8s provider
  - Export namespace name as stack output

- [ ] [FOUND-007] Run quality gates for Phase 2: `cd infrastructure/pulumi && npm run build && npm run lint && npm test`

---

## Phase 3: US1 - Infrastructure Health Visibility (P1 - MVP)

**Goal**: Deploy Prometheus and basic infrastructure dashboards. This delivers immediate operational value - ability to see current CPU/memory/pod health.

**User Story**: As a site administrator, I need to view real-time system health metrics through a web dashboard, so I can quickly assess infrastructure status.

**Acceptance Criteria**:
- Dashboard displays current CPU usage for all application pods
- Dashboard displays current memory consumption for all services
- Dashboard displays pod health status (running/pending/failed)
- Metrics refresh within 30 seconds

### Prometheus Deployment

- [ ] [US1-001] [P] Write tests for Prometheus component: `infrastructure/pulumi/tests/components/monitoring/prometheus.test.ts`
  - Test: StatefulSet created with name "prometheus" in "monitoring" namespace
  - Test: StatefulSet replicas = 1 (no HA requirement)
  - Test: Container image uses stable version (e.g., `prom/prometheus:v2.48.0`)
  - Test: Container args include `--config.file=/etc/prometheus/prometheus.yml` and `--storage.tsdb.retention.time=7d`
  - Test: Container resources: requests (cpu: 250m, memory: 512Mi), limits (cpu: 500m, memory: 1Gi)
  - Test: Container ports expose 9090/TCP
  - Test: VolumeMount includes ConfigMap at `/etc/prometheus/prometheus.yml` (subPath: prometheus.yml)
  - Test: PersistentVolumeClaim created with 10Gi storage (default StorageClass)
  - Test: Service created with ClusterIP type, port 9090, selector matches StatefulSet
  - Test: ConfigMap created with `prometheus.yml` containing kubernetes_sd_configs for pod discovery
  - Test: ConfigMap scrape config includes relabel_configs for annotation-based filtering (`prometheus.io/scrape: "true"`)

- [ ] [US1-002] Create Prometheus ConfigMap template (YAML content): In `prometheus.ts`, define prometheus.yml with:
  - Global config: `scrape_interval: 15s`, `evaluation_interval: 15s`
  - Scrape config: job_name `kubernetes-pods`, kubernetes_sd_configs role `pod`
  - Relabel configs: Drop pods without `prometheus.io/scrape: "true"` annotation
  - Relabel configs: Override `__address__` with `prometheus.io/port` annotation if present
  - Relabel configs: Override `__metrics_path__` with `prometheus.io/path` annotation if present

- [ ] [US1-003] Implement Prometheus component: `infrastructure/pulumi/src/components/monitoring/prometheus.ts`
  - Export function: `createPrometheus(config: { namespace: pulumi.Input<string>, provider: k8s.Provider })`
  - Create k8s.apps.v1.StatefulSet (see test requirements above)
  - Create k8s.core.v1.PersistentVolumeClaim with `accessModes: ["ReadWriteOnce"]`, `storage: "10Gi"`
  - Create k8s.core.v1.Service (ClusterIP, port 9090)
  - Create k8s.core.v1.ConfigMap with prometheus.yml content
  - Return `{ statefulSet, pvc, service, configMap }`

- [ ] [US1-004] Run tests and validate coverage: `cd infrastructure/pulumi && npm test -- prometheus.test.ts`

### Infrastructure Metrics Dashboard

- [ ] [US1-005] [P] Create cluster overview dashboard JSON: `specs/001-monitoring-alerting/contracts/dashboards/cluster-overview.json`
  - Dashboard UID: `cluster-overview`, title: "Cluster Overview"
  - Panel 1: Graph - CPU usage by pod (PromQL: `rate(container_cpu_usage_seconds_total{namespace!="kube-system"}[5m])`)
  - Panel 2: Graph - Memory usage by pod (PromQL: `container_memory_working_set_bytes{namespace!="kube-system"}`)
  - Panel 3: Stat - Pod status counts (PromQL: `count by (phase) (kube_pod_status_phase)`)
  - Panel 4: Table - Pod list with status (PromQL: `kube_pod_info`)
  - Refresh: `30s`, time range: `now-6h` to `now`

- [ ] [US1-006] [P] Create resource utilization dashboard JSON: `specs/001-monitoring-alerting/contracts/dashboards/resource-utilization.json`
  - Dashboard UID: `resource-utilization`, title: "Resource Utilization"
  - Panel 1: Graph - CPU utilization % (requests vs limits)
  - Panel 2: Graph - Memory utilization % (requests vs limits)
  - Panel 3: Heatmap - CPU throttling events
  - Panel 4: Stat - Pods nearing resource limits (> 90% of requests)
  - Refresh: `30s`, time range: `now-6h` to `now`

### Integration

- [ ] [US1-007] Integrate Prometheus into production stack: `infrastructure/pulumi/src/stacks/production.ts`
  - Import `createPrometheus` from monitoring components
  - Call after monitoring namespace creation (depends on `namespace.metadata.name`)
  - Export Prometheus service endpoint as stack output

- [ ] [US1-008] Integrate Prometheus into preview stack: `infrastructure/pulumi/src/stacks/preview.ts`

- [ ] [US1-009] Integrate Prometheus into local stack: `infrastructure/pulumi/src/stacks/local.ts`

- [ ] [US1-010] Add Prometheus scrape annotations to existing API/Web deployments (if not present): Check `infrastructure/pulumi/src/components/api-deployment.ts` and `web-deployment.ts`
  - Add pod annotations: `prometheus.io/scrape: "true"`, `prometheus.io/port: "9090"`, `prometheus.io/path: "/metrics"`
  - If deployments don't expose metrics endpoints yet, note as out-of-scope for this task (requires application instrumentation)

- [ ] [US1-011] Run quality gates for Phase 3: `cd infrastructure/pulumi && npm run build && npm run lint && npm test`

---

## Phase 4: US2 - Secure Dashboard Access (P1)

**Goal**: Deploy Grafana with GitHub OAuth authentication. This is critical security - must be deployed alongside dashboards to prevent unauthorized access.

**User Story**: As a site administrator, I need to authenticate via GitHub OAuth to access the monitoring dashboard, so that only authorized team members can view infrastructure metrics.

**Acceptance Criteria**:
- Unauthenticated users redirected to GitHub login
- Aphiria org members granted Viewer (read-only) access
- User `davidbyoung` granted Admin privileges
- Non-org users denied with clear error
- Session expiration redirects to re-authentication

### Grafana Deployment

- [ ] [US2-001] Write tests for Grafana component: `infrastructure/pulumi/tests/components/monitoring/grafana.test.ts`
  - Test: Deployment created with name "grafana" in "monitoring" namespace
  - Test: Deployment replicas = 1 (no HA)
  - Test: Container image uses stable version (e.g., `grafana/grafana:10.2.0`)
  - Test: Container resources: requests (cpu: 100m, memory: 256Mi), limits (cpu: 200m, memory: 512Mi)
  - Test: Container ports expose 3000/TCP
  - Test: Environment variables include `GF_AUTH_GITHUB_ENABLED=true`, `GF_AUTH_GITHUB_ALLOW_SIGN_UP=true`
  - Test: Environment variables include `GF_AUTH_GITHUB_CLIENT_ID` (from Pulumi config)
  - Test: Environment variables include `GF_AUTH_GITHUB_CLIENT_SECRET` (from Pulumi secret config)
  - Test: Environment variables include `GF_AUTH_GITHUB_SCOPES=read:org`, `GF_AUTH_GITHUB_ALLOWED_ORGANIZATIONS=aphiria`
  - Test: Environment variables include `GF_SERVER_ROOT_URL=https://grafana.aphiria.com`
  - Test: Secret created for OAuth credentials with type `Opaque`
  - Test: Service created with ClusterIP type, port 3000
  - Test: PersistentVolumeClaim created with 5Gi storage for Grafana data
  - Test: ConfigMap created for datasource provisioning (Prometheus connection)
  - Test: ConfigMap includes datasource with URL `http://prometheus.monitoring.svc.cluster.local:9090`

- [ ] [US2-002] Implement Grafana component: `infrastructure/pulumi/src/components/monitoring/grafana.ts`
  - Export function: `createGrafana(config: { namespace: pulumi.Input<string>, prometheusServiceUrl: pulumi.Input<string>, provider: k8s.Provider })`
  - Read GitHub OAuth credentials from Pulumi config: `config.requireSecret("github-oauth-client-id")`, `config.requireSecret("github-oauth-client-secret")`
  - Create k8s.core.v1.Secret with OAuth credentials (type: Opaque)
  - Create k8s.apps.v1.Deployment (see test requirements above)
  - Create k8s.core.v1.PersistentVolumeClaim with `accessModes: ["ReadWriteOnce"]`, `storage: "5Gi"`
  - Create k8s.core.v1.Service (ClusterIP, port 3000)
  - Create k8s.core.v1.ConfigMap for Prometheus datasource provisioning (JSON format per Grafana provisioning docs)
  - Return `{ deployment, pvc, service, secret, datasourceConfigMap }`

- [ ] [US2-003] Run tests and validate coverage: `cd infrastructure/pulumi && npm test -- grafana.test.ts`

### GitHub OAuth Configuration

- [ ] [US2-004] Add Grafana OAuth environment variables for admin user: In `grafana.ts`, add `GF_USERS_AUTO_ASSIGN_ORG_ROLE=Viewer`, `GF_AUTH_GITHUB_ROLE_ATTRIBUTE_PATH=contains(login, 'davidbyoung') && 'Admin' || 'Viewer'`
  - This sets default role to Viewer, promotes `davidbyoung` to Admin via GitHub username match

- [ ] [US2-005] Document GitHub OAuth app registration in quickstart.md (if not already documented):
  - Instructions: Go to GitHub Settings > Developer settings > OAuth Apps > New OAuth App
  - Application name: `Aphiria Monitoring (Production)`, `Aphiria Monitoring (Preview)`, or `Aphiria Monitoring (Local)`
  - Homepage URL: `https://grafana.aphiria.com` (production/local) or `https://grafana-preview-<PR>.aphiria.com` (preview)
  - Authorization callback URL: `https://grafana.aphiria.com/login/github` (production/local)
  - Note: Client ID and secret must be stored in Pulumi ESC (task US2-006)

- [ ] [US2-006] Store OAuth credentials in Pulumi ESC: `cd infrastructure/pulumi && pulumi config set --secret github-oauth-client-id <value> && pulumi config set --secret github-oauth-client-secret <value>`
  - Verify credentials are not committed to git (Pulumi.production.yml should show `secret: ...` placeholders)

### HTTPS Ingress

- [ ] [US2-007] [P] Write tests for Grafana ingress component: `infrastructure/pulumi/tests/components/monitoring/grafana-ingress.test.ts`
  - Test: HTTPRoute created with name "grafana" in "monitoring" namespace
  - Test: HTTPRoute hostnames include "grafana.aphiria.com"
  - Test: HTTPRoute rules include HTTP to HTTPS redirect (status 301, scheme: https)
  - Test: HTTPRoute rules include backend reference to Grafana service (port 3000)
  - Test: HTTPRoute parentRefs reference existing NGINX Gateway (verify gateway name matches existing infrastructure)
  - Test: TLS certificate managed via Let's Encrypt annotations (e.g., `cert-manager.io/cluster-issuer: letsencrypt-prod`)

- [ ] [US2-008] Implement Grafana ingress component: `infrastructure/pulumi/src/components/monitoring/grafana-ingress.ts`
  - Export function: `createGrafanaIngress(config: { namespace: pulumi.Input<string>, grafanaServiceName: pulumi.Input<string>, gatewayName: string, hostname: string, provider: k8s.Provider })`
  - Create HTTPRoute resource using Gateway API (check existing http-route.ts for pattern)
  - Add HTTP → HTTPS redirect rule (priority 1)
  - Add HTTPS backend rule routing to Grafana service (priority 2)
  - Add TLS configuration with Let's Encrypt certificate reference
  - Return `{ httpRoute }`

- [ ] [US2-009] Run tests and validate coverage: `cd infrastructure/pulumi && npm test -- grafana-ingress.test.ts`

### Integration

- [ ] [US2-010] Integrate Grafana into production stack: `infrastructure/pulumi/src/stacks/production.ts`
  - Import `createGrafana` and `createGrafanaIngress`
  - Call `createGrafana` with monitoring namespace and Prometheus service URL (from US1-007)
  - Call `createGrafanaIngress` with hostname `grafana.aphiria.com`
  - Export Grafana URL as stack output

- [ ] [US2-011] Integrate Grafana into preview stack: `infrastructure/pulumi/src/stacks/preview.ts`
  - Use hostname `grafana-preview-<PR>.aphiria.com` (parameterize PR number from stack config)

- [ ] [US2-012] Integrate Grafana into local stack: `infrastructure/pulumi/src/stacks/local.ts`
  - Use hostname `grafana.aphiria.com` (same as production, relies on /etc/hosts override)

- [ ] [US2-013] Run quality gates for Phase 4: `cd infrastructure/pulumi && npm run build && npm run lint && npm test`

---

## Phase 5: US3 - Application Performance Monitoring (P2)

**Goal**: Create dashboards for application-level metrics (request latency, error rates). Requires application to expose metrics endpoints.

**User Story**: As a site administrator, I need to view application-level metrics to identify performance degradation and errors affecting end users.

**Acceptance Criteria**:
- Dashboard displays average request latency over 5 minutes
- Dashboard shows error rate percentage
- Dashboard shows latency trends over time
- Dashboard breaks down errors by HTTP status code

### Application Metrics Dashboards

- [ ] [US3-001] [P] Create API performance dashboard JSON: `specs/001-monitoring-alerting/contracts/dashboards/api-performance.json`
  - Dashboard UID: `api-performance`, title: "API Performance"
  - Panel 1: Graph - Request latency p50/p95/p99 (PromQL: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`)
  - Panel 2: Stat - Average latency (PromQL: `rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])`)
  - Panel 3: Graph - Request rate (PromQL: `rate(http_requests_total[5m])`)
  - Panel 4: Table - Slowest endpoints by p95 latency
  - Refresh: `30s`, time range: `now-6h` to `now`
  - Note: Assumes application exposes `http_request_duration_seconds` histogram metric (verify in API instrumentation)

- [ ] [US3-002] [P] Create error rates dashboard JSON: `specs/001-monitoring-alerting/contracts/dashboards/error-rates.json`
  - Dashboard UID: `error-rates`, title: "Error Rates"
  - Panel 1: Graph - Error rate % (PromQL: `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100`)
  - Panel 2: Stat - Total errors in last hour (PromQL: `increase(http_requests_total{status=~"5.."}[1h])`)
  - Panel 3: Table - Errors by status code (PromQL: `sum by (status) (rate(http_requests_total{status=~"[45].."}[5m]))`)
  - Panel 4: Graph - 4xx vs 5xx errors (separate series)
  - Refresh: `30s`, time range: `now-6h` to `now`
  - Note: Assumes application exposes `http_requests_total` counter with `status` label

### Dashboard Provisioning Component

- [ ] [US3-003] Write tests for dashboards component: `infrastructure/pulumi/tests/components/monitoring/dashboards.test.ts`
  - Test: ConfigMap created with name "grafana-dashboards" in "monitoring" namespace
  - Test: ConfigMap data includes all dashboard JSON files (cluster-overview.json, resource-utilization.json, api-performance.json, error-rates.json, namespace-service.json)
  - Test: ConfigMap has label `grafana_dashboard: "1"` (for Grafana provisioning discovery)
  - Test: Dashboard JSON is valid (basic JSON parse check, doesn't need full schema validation)

- [ ] [US3-004] Implement dashboards component: `infrastructure/pulumi/src/components/monitoring/dashboards.ts`
  - Export function: `createDashboards(config: { namespace: pulumi.Input<string>, dashboardDir: string, provider: k8s.Provider })`
  - Read all .json files from `dashboardDir` (use Node.js `fs.readdirSync` and `fs.readFileSync`)
  - Create k8s.core.v1.ConfigMap with dashboard JSON as data entries (key: filename, value: file content)
  - Add label `grafana_dashboard: "1"` for Grafana sidecar/provisioning
  - Return `{ configMap }`

- [ ] [US3-005] Run tests and validate coverage: `cd infrastructure/pulumi && npm test -- dashboards.test.ts`

### Integration

- [ ] [US3-006] Update Grafana component to mount dashboards ConfigMap: Modify `infrastructure/pulumi/src/components/monitoring/grafana.ts`
  - Add volumeMount in Grafana container: `mountPath: /var/lib/grafana/dashboards`, `name: dashboards`
  - Add volume referencing dashboards ConfigMap: `name: dashboards`, `configMap.name: grafana-dashboards`
  - Update tests in `grafana.test.ts` to verify volume mount

- [ ] [US3-007] Integrate dashboards into production stack: `infrastructure/pulumi/src/stacks/production.ts`
  - Import `createDashboards`
  - Call with `dashboardDir: path.join(__dirname, "../../specs/001-monitoring-alerting/contracts/dashboards")` (use relative path from stack file)
  - Must be called BEFORE `createGrafana` (ConfigMap must exist for Grafana to mount)

- [ ] [US3-008] Integrate dashboards into preview stack: `infrastructure/pulumi/src/stacks/preview.ts`

- [ ] [US3-009] Integrate dashboards into local stack: `infrastructure/pulumi/src/stacks/local.ts`

- [ ] [US3-010] Verify application metrics instrumentation: Check if `public-api/` exposes Prometheus metrics endpoint
  - If not instrumented, document as out-of-scope for this feature (requires separate task to add Prometheus client library to PHP app)
  - If instrumented, verify metric names match dashboard queries (`http_request_duration_seconds`, `http_requests_total`)

- [ ] [US3-011] Run quality gates for Phase 5: `cd infrastructure/pulumi && npm run build && npm run lint && npm test`

---

## Phase 6: US4 - Automated Alert Notifications (P2)

**Goal**: Configure Prometheus alert rules and Grafana Alertmanager for email notifications on threshold violations.

**User Story**: As a site administrator, I need to receive email alerts when critical thresholds are exceeded, so I can respond to problems before they cause outages.

**Acceptance Criteria**:
- Email sent when CPU > 80% for 10 minutes
- Email sent when memory > 90% for 10 minutes
- Email sent when error rate > 5% for 5 minutes
- Email sent when pod enters Failed/CrashLoopBackOff state
- Recovery email sent when alert resolves

### Alert Rules

- [ ] [US4-001] Write tests for alert rules component: `infrastructure/pulumi/tests/components/monitoring/alert-rules.test.ts`
  - Test: ConfigMap created with name "prometheus-alerts" in "monitoring" namespace
  - Test: ConfigMap data includes alert rules in Prometheus YAML format
  - Test: Alert rule "HighCPUUsage" with expression `rate(container_cpu_usage_seconds_total[5m]) > 0.8`, duration `10m`, severity `critical`
  - Test: Alert rule "HighMemoryUsage" with expression `container_memory_working_set_bytes / container_spec_memory_limit_bytes > 0.9`, duration `10m`, severity `critical`
  - Test: Alert rule "HighErrorRate" with expression `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05`, duration `5m`, severity `critical`
  - Test: Alert rule "PodCrashLooping" with expression `kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} > 0`, duration `5m`, severity `critical`
  - Test: Alert rule "PodFailed" with expression `kube_pod_status_phase{phase="Failed"} > 0`, duration `1m`, severity `critical`
  - Test: Each alert includes annotations for `summary` and `description` with templated values (e.g., `{{$labels.pod}}`, `{{$value}}`)
  - Test: Each alert includes environment label: `environment: {{ $externalLabels.environment }}`

- [ ] [US4-002] Implement alert rules component: `infrastructure/pulumi/src/components/monitoring/alert-rules.ts`
  - Export function: `createAlertRules(config: { namespace: pulumi.Input<string>, environment: string, provider: k8s.Provider })`
  - Define alert rules as TypeScript objects (not YAML files - easier to test and parameterize)
  - Convert rules to Prometheus YAML format (use template literal or YAML library)
  - Create k8s.core.v1.ConfigMap with rules YAML as data
  - Return `{ configMap }`
  - Alert rule structure (TypeScript interface):
    ```typescript
    interface AlertRule {
        alert: string;
        expr: string;
        for: string;
        labels: { severity: string; environment: string };
        annotations: { summary: string; description: string };
    }
    ```

- [ ] [US4-003] Run tests and validate coverage: `cd infrastructure/pulumi && npm test -- alert-rules.test.ts`

### Alertmanager Configuration

- [ ] [US4-004] Update Prometheus component to include Alertmanager: Modify `infrastructure/pulumi/src/components/monitoring/prometheus.ts`
  - Add Alertmanager container to Prometheus StatefulSet (sidecar pattern)
  - Alertmanager image: `prom/alertmanager:v0.26.0`
  - Alertmanager resources: requests (cpu: 50m, memory: 128Mi), limits (cpu: 100m, memory: 256Mi)
  - Alertmanager port: 9093/TCP
  - Add ConfigMap for alertmanager.yml with email routing configuration
  - SMTP config: `smtp_from: "grafana@aphiria.com"`, `smtp_smarthost: "<smtp-server>:587"`, `smtp_auth_username: "<user>"`, `smtp_auth_password: "<secret>"` (read from Pulumi config)
  - Add environment-based routing: Match label `environment: production` → route to email receiver, `environment: preview` or `environment: local` → route to null receiver (suppress)
  - Update tests to verify Alertmanager sidecar, ConfigMap, and routing logic

- [ ] [US4-005] Add SMTP credentials to Pulumi ESC: `cd infrastructure/pulumi && pulumi config set --secret smtp-server <value> && pulumi config set --secret smtp-username <value> && pulumi config set --secret smtp-password <value>`
  - Document SMTP setup in quickstart.md (if using external provider like SendGrid, document API key generation)

### Integration

- [ ] [US4-006] Integrate alert rules into production stack: `infrastructure/pulumi/src/stacks/production.ts`
  - Import `createAlertRules`
  - Call with `environment: "production"`
  - Update Prometheus component call to include alert rules ConfigMap reference

- [ ] [US4-007] Integrate alert rules into preview stack: `infrastructure/pulumi/src/stacks/preview.ts`
  - Call with `environment: "preview"`

- [ ] [US4-008] Integrate alert rules into local stack: `infrastructure/pulumi/src/stacks/local.ts`
  - Call with `environment: "local"`

- [ ] [US4-009] Update Prometheus ConfigMap to include alerting section: In `prometheus.ts`, add `alerting:` section to prometheus.yml:
  ```yaml
  alerting:
    alertmanagers:
      - static_configs:
          - targets: ['localhost:9093']
  ```

- [ ] [US4-010] Update Prometheus ConfigMap to load alert rules: In `prometheus.ts`, add `rule_files:` section to prometheus.yml:
  ```yaml
  rule_files:
    - /etc/prometheus/alerts/*.yml
  ```
  - Add volumeMount in Prometheus container for alerts ConfigMap: `mountPath: /etc/prometheus/alerts`, `name: alerts`

- [ ] [US4-011] Run quality gates for Phase 6: `cd infrastructure/pulumi && npm run build && npm run lint && npm test`

---

## Phase 7: US5 - Environment-Specific Alert Severity (P3)

**Goal**: Implement alert routing logic to suppress preview and local environment emails while retaining Grafana logging.

**User Story**: As a site administrator, I need preview and local environment alerts to be less severe, so I avoid alert fatigue from non-critical test environments.

**Acceptance Criteria**:
- Production CPU > 80% → email sent
- Preview CPU > 80% → alert logged in Grafana, no email
- Local CPU > 80% → alert logged in Grafana, no email
- Production pod failure → email sent
- Preview pod failure → alert logged in Grafana, no email
- Local pod failure → alert logged in Grafana, no email

### Environment-Based Routing

- [ ] [US5-001] Update Alertmanager configuration for environment-specific routing: Modify alertmanager.yml in `infrastructure/pulumi/src/components/monitoring/prometheus.ts`
  - Add route for production: `match: { environment: "production" }`, `receiver: "email-admin"`, `continue: false`
  - Add route for preview: `match: { environment: "preview" }`, `receiver: "null"`, `continue: false`
  - Add route for local: `match: { environment: "local" }`, `receiver: "null"`, `continue: false`
  - Define receiver `email-admin`: `email_configs: [{ to: "admin@aphiria.com", send_resolved: true }]`
  - Define receiver `null`: `webhook_configs: [{ url: "http://localhost:9093" }]` (blackhole receiver - alerts sent to localhost, not delivered externally)
  - Update tests to verify routing logic for all three environments

- [ ] [US5-002] Verify alert rules include environment label: Check `infrastructure/pulumi/src/components/monitoring/alert-rules.ts`
  - Ensure all alert rules have `labels: { environment: "{{ $externalLabels.environment }}" }`
  - Verify Prometheus external labels include environment (set in prometheus.yml `global.external_labels: { environment: "<env>" }`)

- [ ] [US5-003] Update Prometheus component to inject environment label: Modify `infrastructure/pulumi/src/components/monitoring/prometheus.ts`
  - Add parameter `environment: string` to `createPrometheus` function
  - Set `global.external_labels.environment: <environment>` in prometheus.yml ConfigMap
  - Update tests to verify external_labels configuration

### Integration

- [ ] [US5-004] Pass environment to Prometheus in production stack: `infrastructure/pulumi/src/stacks/production.ts`
  - Update `createPrometheus` call to include `environment: "production"`

- [ ] [US5-005] Pass environment to Prometheus in preview stack: `infrastructure/pulumi/src/stacks/preview.ts`
  - Update `createPrometheus` call to include `environment: "preview"`

- [ ] [US5-006] Pass environment to Prometheus in local stack: `infrastructure/pulumi/src/stacks/local.ts`
  - Update `createPrometheus` call to include `environment: "local"`

- [ ] [US5-007] Run quality gates for Phase 7: `cd infrastructure/pulumi && npm run build && npm run lint && npm test`

---

## Phase 8: US6 - Version-Controlled Dashboards (P3)

**Goal**: Enforce read-only dashboards in Grafana UI, ensuring all changes go through Git.

**User Story**: As a developer, I need all dashboard definitions stored in source control, so that changes go through code review and are tracked in git history.

**Acceptance Criteria**:
- Modifying a dashboard definition in git and deploying reflects changes in Grafana
- Attempting to create a dashboard in UI is prevented
- Reverting a git commit and redeploying restores previous dashboard state
- New team members can view all dashboard definitions in code

### Read-Only Dashboard Enforcement

- [ ] [US6-001] Update Grafana component to enforce provisioning read-only mode: Modify `infrastructure/pulumi/src/components/monitoring/grafana.ts`
  - Add environment variable `GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/var/lib/grafana/dashboards/cluster-overview.json`
  - Add provisioning ConfigMap for dashboards with `disableDeletion: true` in provisioning YAML
  - Provisioning YAML structure (add to ConfigMap):
    ```yaml
    apiVersion: 1
    providers:
      - name: 'default'
        orgId: 1
        folder: ''
        type: file
        disableDeletion: true
        updateIntervalSeconds: 30
        allowUiUpdates: false
        options:
          path: /var/lib/grafana/dashboards
    ```
  - Update tests to verify provisioning ConfigMap and `allowUiUpdates: false`

- [ ] [US6-002] Add dashboard provisioning ConfigMap mount to Grafana: In `grafana.ts`
  - Add volumeMount: `mountPath: /etc/grafana/provisioning/dashboards`, `name: dashboard-provisioning`
  - Add volume referencing provisioning ConfigMap: `name: dashboard-provisioning`, `configMap.name: grafana-dashboard-provisioning`
  - Update tests

### Documentation

- [ ] [US6-003] Document dashboard modification workflow in quickstart.md:
  - Section: "Modifying Dashboards"
  - Steps:
    1. Edit JSON file in `specs/001-monitoring-alerting/contracts/dashboards/`
    2. Validate JSON syntax (use online validator or `jq . dashboard.json`)
    3. Commit changes and open PR
    4. Deploy via Pulumi: `cd infrastructure/pulumi && npm run build && pulumi up`
    5. Verify changes in Grafana UI (refresh browser, dashboards auto-reload every 30s)
  - Note: UI edits are disabled - all changes must go through Git

- [ ] [US6-004] Document adding new dashboards in quickstart.md:
  - Section: "Adding New Dashboards"
  - Steps:
    1. Create new .json file in `specs/001-monitoring-alerting/contracts/dashboards/`
    2. Use existing dashboard as template (copy cluster-overview.json)
    3. Set unique UID and title
    4. Deploy via Pulumi (dashboards component auto-discovers new files)
    5. Dashboard appears in Grafana after deployment

### Integration

- [ ] [US6-005] Run quality gates for Phase 8: `cd infrastructure/pulumi && npm run build && npm run lint && npm test`

---

## Phase 9: Polish & Cross-Cutting Concerns

**Goal**: Final validation, documentation, and production readiness checks.

### Deployment Validation

- [ ] [POLISH-001] Run full Pulumi preview for production stack: `cd infrastructure/pulumi && npm run build && pulumi preview --stack production`
  - Verify all monitoring resources appear in plan (Namespace, Prometheus StatefulSet/PVC/Service, Grafana Deployment/PVC/Service, HTTPRoute, ConfigMaps for dashboards/alerts/datasource)
  - Verify no unexpected resource deletions or replacements

- [ ] [POLISH-002] Run full Pulumi preview for preview stack: `cd infrastructure/pulumi && pulumi preview --stack preview`

- [ ] [POLISH-003] Run full Pulumi preview for local stack: `cd infrastructure/pulumi && pulumi preview --stack local`
  - Verify local environment configuration is correct (same monitoring components as production/preview)

- [ ] [POLISH-004] Validate dashboard JSON syntax: `cd specs/001-monitoring-alerting/contracts/dashboards && for f in *.json; do jq . "$f" > /dev/null && echo "✓ $f" || echo "✗ $f INVALID"; done`

- [ ] [POLISH-005] Validate Prometheus alert rules syntax: Use promtool to validate alert rules
  - Install promtool: `docker run --rm -v $(pwd):/workspace prom/prometheus:v2.48.0 promtool check rules /workspace/alerts.yml` (run against exported alert rules YAML from component)

### Documentation

- [ ] [POLISH-006] Create quickstart.md with local development instructions: `specs/001-monitoring-alerting/quickstart.md`
  - Section 1: Prerequisites (Minikube, kubectl, Pulumi CLI, GitHub OAuth app, SMTP credentials)
  - Section 2: Local deployment with Minikube (reference README.md for /etc/hosts setup)
  - Section 3: Accessing Grafana locally via https://grafana.aphiria.com (relies on /etc/hosts override to 127.0.0.1)
  - Section 4: Testing alerts (trigger CPU spike with stress test, verify log-only delivery for local environment)
  - Section 5: Modifying dashboards (workflow documented in US6-003)
  - Section 6: Troubleshooting (Prometheus scrape targets, Grafana datasource health, alert delivery logs)
  - Note: Local environment uses same hostname as production (grafana.aphiria.com) via /etc/hosts, alert emails suppressed

- [ ] [POLISH-007] Update main project README.md with monitoring section: Note that README.md already includes grafana.aphiria.com in /etc/hosts section
  - Verify /etc/hosts documentation is complete (already contains `127.0.0.1 grafana.aphiria.com`)
  - No additional changes needed to README.md

### Testing

- [ ] [POLISH-008] Run full test suite with coverage report: `cd infrastructure/pulumi && npm test -- --coverage`
  - Verify all monitoring components have 100% coverage (branches, functions, lines, statements)
  - If coverage < 100%, add missing tests

- [ ] [POLISH-009] Run linter and validate zero errors/warnings: `cd infrastructure/pulumi && npm run lint`
  - Fix any ESLint errors or warnings

- [ ] [POLISH-010] Run formatter check and validate zero errors: `cd infrastructure/pulumi && npm run format:check`
  - If formatting issues found, run `npm run format` to auto-fix

### Final Quality Gates

- [ ] [POLISH-011] Run complete quality gate pipeline: `cd infrastructure/pulumi && npm run build && npm run lint && npm run format:check && npm test -- --coverage`
  - All steps MUST pass with zero errors/warnings
  - Coverage MUST meet 100% thresholds

- [ ] [POLISH-012] Commit all changes and validate git status: `git status` (from project root)
  - Ensure `dist/` and `coverage/` are NOT staged (gitignored)
  - Ensure all new files in `infrastructure/pulumi/src/components/monitoring/`, `infrastructure/pulumi/tests/components/monitoring/`, and `specs/001-monitoring-alerting/` are staged

---

## Deployment Checklist

**Pre-Deployment**:
- [ ] All Phase 9 tasks completed
- [ ] Quality gates pass (build, lint, format, test coverage)
- [ ] Pulumi preview shows expected resources
- [ ] GitHub OAuth app registered and credentials in Pulumi ESC
- [ ] SMTP credentials configured in Pulumi ESC
- [ ] Dashboard JSON validated
- [ ] Alert rules validated with promtool

**Deployment**:
- [ ] Deploy to local environment first: `cd infrastructure/pulumi && pulumi up --stack local`
- [ ] Verify Prometheus scrapes targets locally: `kubectl port-forward -n monitoring svc/prometheus 9090:9090` → http://localhost:9090/targets
- [ ] Verify Grafana loads dashboards locally: Access https://grafana.aphiria.com (via /etc/hosts), login with GitHub, check Dashboards menu
- [ ] Trigger test alert locally: Use stress test to spike CPU, verify alert fires in Prometheus (Alerts tab), verify email NOT sent (local suppression)
- [ ] Deploy to preview environment: `cd infrastructure/pulumi && pulumi up --stack preview`
- [ ] Verify Grafana loads dashboards (preview): Access https://grafana-preview-<PR>.aphiria.com, login with GitHub, check Dashboards menu
- [ ] Trigger test alert (preview): Verify email NOT sent (preview suppression)
- [ ] Deploy to production: `cd infrastructure/pulumi && pulumi up --stack production`
- [ ] Verify production Grafana: Access https://grafana.aphiria.com, login with GitHub
- [ ] Verify production alerts: Trigger test alert, verify email delivery to admin@aphiria.com

**Post-Deployment**:
- [ ] Monitor Prometheus disk usage: `kubectl get pvc -n monitoring` (ensure < 80% full)
- [ ] Monitor Grafana pod logs: `kubectl logs -n monitoring deployment/grafana -f` (check for errors)
- [ ] Verify dashboard refresh (wait 30 seconds, check if metrics update)
- [ ] Document any production issues or lessons learned in spec.md

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Application not instrumented with Prometheus metrics | High | High | US3 assumes metrics exist. If not, document as out-of-scope and create follow-up task for application instrumentation |
| SMTP delivery failures | Medium | Medium | Test email delivery in preview first. Configure retry logic in Alertmanager. Log all delivery attempts |
| Dashboard JSON syntax errors | Low | Medium | Validate all JSON with `jq` before deployment (POLISH-003). Add pre-commit hook for JSON validation |
| Prometheus disk fills up (exceeds 10Gi) | Medium | High | Monitor PVC usage daily. Adjust retention from 7d to 5d if needed. Alert if disk > 80% |
| GitHub OAuth rate limiting | Low | Low | Document rate limits in quickstart.md. Use org-level OAuth app to increase limits |
| Let's Encrypt rate limits | Low | Medium | Existing infrastructure already handles this. No new action needed |
| Alert fatigue from noisy alerts | Medium | Medium | Start with conservative thresholds (80% CPU, 90% memory). Tune based on production behavior after 1 week |

---

## Success Metrics (Validation)

**After deployment, verify these success criteria match spec.md across all three environments (production, preview, local)**:

- [ ] SC-001: Dashboard loads within 5 seconds (test: open https://grafana.aphiria.com in production, preview, and local environments, measure time to first render)
- [ ] SC-002: Alerts detected within 2 minutes (test: trigger CPU spike in production, check Prometheus Alerts tab timestamp)
- [ ] SC-003: Metrics lag < 30 seconds (test: restart a pod, check when new pod appears in dashboard)
- [ ] SC-004: OAuth login < 30 seconds (test: logout, login with GitHub, measure total time)
- [ ] SC-005: Dashboard responsive with 20+ pods (test: deploy at scale in production, verify dashboard load time)
- [ ] SC-006: 100% of alert changes tracked in git (verify: all alert rules in `alert-rules.ts`, no manual Prometheus config)
- [ ] SC-007: Recovery after pod failure < 5 minutes (test: delete Prometheus pod, verify auto-restart and metric collection resumes)
- [ ] SC-008: Preview and local alerts suppressed, production alerts emailed (test: trigger same alert in all three environments, verify only production sends email)
- [ ] SC-009: Unauthorized users denied within 10 seconds (test: login with non-aphiria GitHub account)
- [ ] SC-010: Dashboard changes deploy in < 5 minutes (test: modify cluster-overview.json, run `pulumi up`, measure time)
- [ ] SC-011: Local environment accessible via /etc/hosts (test: verify https://grafana.aphiria.com resolves to 127.0.0.1 in local environment)

---

## Notes

**File Naming Convention**: All TypeScript files use lowercase-kebab-case (e.g., `prometheus.ts`, not `prometheusComponent.ts`).

**Test-Driven Development**: Tests MUST be written before implementation for all components. Each component task includes a test task with `[TaskID]-001` suffix.

**Parallelization**: Tasks marked `[P]` can be worked on simultaneously (different files, no dependencies). For example, US1-001 (Prometheus tests) and US2-001 (Grafana tests) can run in parallel after Phase 2 completes.

**Quality Gate Automation**: Consider adding pre-commit hooks for `npm run lint && npm test` to catch issues before git commit.

**Prometheus Exporters**: This implementation assumes kube-state-metrics is already deployed (provides `kube_pod_*` metrics). If not available, add task to deploy kube-state-metrics as Deployment in monitoring namespace.

**Grafana Persistence**: Grafana uses PVC for `/var/lib/grafana` to persist UI settings (user preferences, alert silence state). Dashboards are provisioned from ConfigMaps and not stored in PVC.

**Alert Rule Syntax**: Prometheus alert rules use PromQL expressions. Validate syntax before deployment to avoid config reload failures.

**Dashboard Provisioning**: Grafana auto-discovers dashboards in `/var/lib/grafana/dashboards` via provisioning ConfigMap. New dashboards appear automatically on next sync (30s interval).

**Environment Label**: The environment label is critical for alert routing. Ensure Prometheus external_labels are set correctly in both production and preview stacks.

**SMTP Configuration**: If using SendGrid or similar, replace SMTP config with API-based email sending (Alertmanager supports webhook receivers for custom integrations).

**Kubernetes Versions**: Assumes Kubernetes 1.27+ for Gateway API support (HTTPRoute). Verify cluster version before deployment.

**Storage Class**: Uses default StorageClass for PVCs. On DigitalOcean, this is `do-block-storage`. Adjust if using custom storage classes.

---

## Appendix: File Paths Reference

**CRITICAL**: All paths below are RELATIVE from project root. Use these exact paths in all tasks.

**Components**:
- `infrastructure/pulumi/src/components/monitoring/monitoring-namespace.ts`
- `infrastructure/pulumi/src/components/monitoring/prometheus.ts`
- `infrastructure/pulumi/src/components/monitoring/grafana.ts`
- `infrastructure/pulumi/src/components/monitoring/alert-rules.ts`
- `infrastructure/pulumi/src/components/monitoring/dashboards.ts`
- `infrastructure/pulumi/src/components/monitoring/grafana-ingress.ts`

**Tests**:
- `infrastructure/pulumi/tests/components/monitoring/monitoring-namespace.test.ts`
- `infrastructure/pulumi/tests/components/monitoring/prometheus.test.ts`
- `infrastructure/pulumi/tests/components/monitoring/grafana.test.ts`
- `infrastructure/pulumi/tests/components/monitoring/alert-rules.test.ts`
- `infrastructure/pulumi/tests/components/monitoring/dashboards.test.ts`
- `infrastructure/pulumi/tests/components/monitoring/grafana-ingress.test.ts`

**Stacks**:
- `infrastructure/pulumi/src/stacks/production.ts`
- `infrastructure/pulumi/src/stacks/preview.ts`
- `infrastructure/pulumi/src/stacks/local.ts`

**Dashboards**:
- `specs/001-monitoring-alerting/contracts/dashboards/cluster-overview.json`
- `specs/001-monitoring-alerting/contracts/dashboards/namespace-service.json`
- `specs/001-monitoring-alerting/contracts/dashboards/api-performance.json`
- `specs/001-monitoring-alerting/contracts/dashboards/error-rates.json`
- `specs/001-monitoring-alerting/contracts/dashboards/resource-utilization.json`

**Documentation**:
- `specs/001-monitoring-alerting/quickstart.md` (to be created in POLISH-006)
- `README.md` (already contains grafana.aphiria.com in /etc/hosts section - verified in POLISH-007)

---

## Local Environment Testing Notes

**Hostname Configuration**: Local environment uses `/etc/hosts` override to route `grafana.aphiria.com` to `127.0.0.1`. This is already documented in `README.md` (line 46: `127.0.0.1 grafana.aphiria.com`). No additional setup required.

**Alert Routing**: Local environment alerts are suppressed from email delivery (same as preview). Alerts fire in Prometheus and are logged in Grafana, but no email notifications are sent.

**Testing Strategy**: Deploy to local environment first (Phase 9 deployment checklist), verify all functionality, then deploy to preview, then production. This ensures monitoring stack works correctly before production deployment.

---

**End of Tasks**
