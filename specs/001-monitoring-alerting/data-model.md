# Data Model: Monitoring Entities

## Overview

This document defines the conceptual data model for the monitoring and alerting system. These entities represent configuration and runtime state, not database tables (this is an infrastructure feature, not application code).

## Entities

### Metric

**Description**: A time-series data point representing a measurement collected from infrastructure or application.

**Attributes**:
- `name` (string): Metric name (e.g., `container_cpu_usage_seconds_total`, `http_request_duration_seconds`)
- `value` (number): Measured value at a point in time
- `timestamp` (timestamp): When the measurement was taken
- `labels` (map<string, string>): Dimensional metadata (e.g., `{namespace: "production", pod: "api-7f8b9c", container: "nginx"}`)
- `type` (enum): Metric type - `counter`, `gauge`, `histogram`, `summary`

**Storage**: Prometheus TSDB (PersistentVolumeClaim, 7-day retention)

**Lifecycle**:
1. Prometheus scrapes metrics endpoints every 15 seconds
2. Metrics stored in TSDB with configured retention (7 days)
3. Automatic expiration after retention period

**Validation**:
- Metric names must match regex: `[a-zA-Z_:][a-zA-Z0-9_:]*`
- Label names must match regex: `[a-zA-Z_][a-zA-Z0-9_]*`
- Label values can be any UTF-8 string
- Reserved labels: `__name__`, `__address__`, `__scheme__`, etc. (system use only)

**Relationships**:
- Referenced by: AlertRule (via PromQL queries)
- Visualized by: Dashboard (via PromQL queries)

---

### AlertRule

**Description**: A condition definition that evaluates metric queries against thresholds and triggers notifications when violated.

**Attributes**:
- `name` (string): Human-readable alert name (e.g., `HighCPUUsage`, `PodCrashLooping`)
- `expression` (PromQL): Query expression defining alert condition (e.g., `rate(container_cpu_usage_seconds_total[5m]) > 0.8`)
- `duration` (duration): How long condition must be true before firing (e.g., `10m`)
- `severity` (enum): Alert severity - `critical`, `warning`, `info`
- `environment` (string): Target environment - `production`, `preview-*`
- `labels` (map<string, string>): Additional metadata (e.g., `{team: "platform", component: "kubernetes"}`)
- `annotations` (map<string, string>): Descriptive info for notifications (e.g., `{summary: "High CPU on {{$labels.pod}}", description: "CPU usage is {{$value}}%"}`)

**Storage**: Kubernetes ConfigMap (loaded by Prometheus)

**Lifecycle**:
1. Created via Pulumi (AlertRulesComponent reads YAML from `specs/001-monitoring-alerting/contracts/alert-rules/`)
2. Loaded into Prometheus via ConfigMap mount
3. Prometheus evaluates rules every evaluation interval (default: 15s)
4. Firing alerts sent to Grafana Alertmanager
5. Grafana routes alerts based on environment label (production → email, preview → suppress)

**Validation**:
- Expression must be valid PromQL
- Duration must be >= evaluation interval
- Environment must match config value

**Relationships**:
- References: Metric (via PromQL expression)
- Triggers: Notification (when condition met)

---

### Dashboard

**Description**: A visual representation of metrics organized into graphs, tables, and panels.

**Attributes**:
- `uid` (string): Unique identifier for dashboard (e.g., `cluster-overview`, `api-performance`)
- `title` (string): Human-readable dashboard name
- `panels` (array): List of visualization panels
  - `id` (number): Panel ID within dashboard
  - `title` (string): Panel title
  - `type` (enum): Panel type - `graph`, `stat`, `table`, `heatmap`
  - `targets` (array): PromQL queries to fetch data
    - `expr` (PromQL): Metric query
    - `legendFormat` (string): Label template for series names
    - `refId` (string): Query reference ID
- `refresh` (duration): Auto-refresh interval (e.g., `30s` per FR-023)
- `timeRange` (object): Default time window (e.g., `{from: "now-6h", to: "now"}`)

**Storage**: Kubernetes ConfigMap (loaded by Grafana)

**Lifecycle**:
1. Created as JSON files in `specs/001-monitoring-alerting/contracts/dashboards/`
2. Loaded into Grafana via ConfigMap provisioning
3. Grafana reads ConfigMap on startup and syncs dashboards
4. UI modifications prevented (read-only enforcement per FR-015)

**Validation**:
- JSON must conform to Grafana dashboard schema
- All panel targets must contain valid PromQL
- UIDs must be unique across all dashboards
- Refresh interval must be >= 10s (Grafana minimum)

**Relationships**:
- References: Metric (via PromQL in panel targets)
- References: Datasource (Prometheus connection)

---

### NotificationChannel

**Description**: A delivery mechanism for alert notifications.

**Attributes**:
- `name` (string): Channel name (e.g., `email-admin`, `suppress-preview`)
- `type` (enum): Channel type - `email`, `suppress` (custom type for preview suppression)
- `settings` (object): Type-specific configuration
  - For email: `{addresses: ["admin@aphiria.com"], subject_template: "{{.GroupLabels.alertname}}: {{.Status}}"}`
  - For suppress: `{enabled: false}` (alerts logged but not delivered)
- `environment` (string): Target environment for routing
- `default` (boolean): Whether this is the default channel for environment

**Storage**: Grafana configuration (provisioned via Grafana Deployment environment variables + ConfigMap)

**Lifecycle**:
1. Configured via Pulumi (GrafanaComponent)
2. Grafana loads notification channels on startup
3. Alert routing rules match alerts to channels based on environment label
4. Channels deliver or suppress notifications accordingly

**Validation**:
- Email addresses must be valid RFC 5322 format
- At least one channel must exist per environment
- Environment label must match one of: `production`, `preview-*`

**Relationships**:
- Triggered by: AlertRule (via Grafana routing rules)

---

### Datasource

**Description**: The connection configuration linking Grafana to Prometheus.

**Attributes**:
- `name` (string): Datasource name (e.g., `Prometheus`)
- `type` (string): Datasource type (`prometheus`)
- `url` (URL): Prometheus endpoint (e.g., `http://prometheus.monitoring.svc.cluster.local:9090`)
- `access` (enum): Access mode - `proxy` (Grafana backend queries Prometheus)
- `isDefault` (boolean): Whether this is the default datasource
- `jsonData` (object): Type-specific settings
  - `timeInterval` (duration): Scrape interval (e.g., `15s`)
  - `queryTimeout` (duration): Max query duration (e.g., `60s`)

**Storage**: Grafana configuration (provisioned via ConfigMap)

**Lifecycle**:
1. Configured via Pulumi (GrafanaComponent)
2. Grafana loads datasource on startup
3. Dashboards reference datasource by name or UID
4. Grafana proxies queries to Prometheus

**Validation**:
- URL must be reachable from Grafana pod
- Type must be supported by Grafana version
- Exactly one default datasource required

**Relationships**:
- Connected to: Prometheus (external system)
- Used by: Dashboard (for metric queries)

---

### Environment

**Description**: A deployment context determining alert routing and dashboard organization.

**Attributes**:
- `name` (string): Environment identifier (e.g., `production`, `preview-123`)
- `alertRouting` (enum): Alert delivery behavior - `email`, `suppress`
- `clusterEndpoint` (URL): Kubernetes API endpoint for this environment
- `domain` (string): Base domain (e.g., `aphiria.com` for production, `preview-123.aphiria.com` for preview)

**Storage**: Pulumi stack configuration

**Lifecycle**:
1. Defined in Pulumi stack config (`pulumi config set environment production`)
2. Referenced by MonitoringStack to configure alert routing
3. Environment label applied to all deployed resources

**Validation**:
- Production environment must use `email` routing
- Preview environments must use `suppress` routing
- Environment name must be DNS-safe (lowercase alphanumeric + hyphens)

**Relationships**:
- Determines behavior of: AlertRule, NotificationChannel
- Scopes: All Kubernetes resources (via namespace labels)

---

## Relationship Diagram

```text
Environment
    ├─> AlertRule (via environment label)
    │       ├─> Metric (via PromQL expression)
    │       └─> NotificationChannel (via routing rules)
    │
    ├─> Dashboard
    │       ├─> Metric (via PromQL in panels)
    │       └─> Datasource (queries Prometheus)
    │
    └─> Datasource (connects to Prometheus)
            └─> Metric (stored in Prometheus TSDB)
```

## State Transitions

### AlertRule States

```text
[Pending] → (expression evaluates true for duration) → [Firing] → (notification sent) → [Firing]
                                                           ↓
                                                     (expression false)
                                                           ↓
                                                      [Resolved]
```

### Dashboard Update Flow

```text
[JSON in Git] → (Pulumi deploy) → [ConfigMap updated] → (Grafana sync) → [Dashboard visible in UI]
```

### Metric Lifecycle

```text
[Scraped] → [Stored in TSDB] → (7 days pass) → [Expired/Deleted]
```

## Validation Rules Summary

| Entity | Key Validation | Enforcement Point |
|--------|----------------|-------------------|
| Metric | Prometheus naming convention | Prometheus scrape |
| AlertRule | Valid PromQL expression | Prometheus config reload |
| Dashboard | Grafana JSON schema | Grafana provisioning |
| NotificationChannel | Valid email address (if type=email) | Grafana config validation |
| Datasource | Reachable URL | Grafana health check |
| Environment | Matches production/preview-* pattern | Pulumi stack validation |
