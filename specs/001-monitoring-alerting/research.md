# Research: Monitoring Architecture Decisions

## Decision 1: Prometheus Deployment Pattern

**Decision**: Deploy Prometheus using raw Kubernetes manifests via Pulumi's `kubernetes` package (not Helm, not Operator)

**Rationale**:
- **Full Pulumi control**: Raw manifests give complete visibility and control over every resource created - ConfigMaps, Deployments, Services, etc. All defined in TypeScript with strong typing
- **No kubectl requirement**: Everything deployed declaratively through Pulumi stack. No manual `kubectl apply` or `helm install` steps required
- **Simplicity**: For single-replica Prometheus with basic scraping needs, raw manifests avoid the complexity of Operator CRDs (ServiceMonitor, PrometheusRule, etc.) or Helm value hierarchies
- **Easier testing**: Can unit test individual Kubernetes resource definitions without Helm templating or Operator state reconciliation
- **Direct ConfigMap management**: Prometheus configuration (prometheus.yml) lives in version-controlled ConfigMap, updated via Pulumi. No external Helm values or CRD translation layer

**Alternatives Considered**:
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Prometheus Operator** | ServiceMonitor CRDs for auto-discovery; automatic config reloading; production-ready patterns | Requires installing CRDs and Operator deployment; adds reconciliation loop complexity; overkill for single-replica setup; harder to test CRD behavior in unit tests | Too complex for our needs. ServiceMonitor auto-discovery not needed for static service scraping. CRDs add testing burden |
| **Helm Chart (kube-prometheus-stack)** | Community-maintained; battle-tested defaults; includes Grafana + exporters | Introduces Helm as dependency; nested values.yaml hierarchy harder to understand; less visibility into generated resources; transformations limited compared to raw TS code | Helm abstraction hides details we want control over. Harder to customize in Pulumi compared to raw manifests |
| **Helm Chart (prometheus-community/prometheus)** | Simpler than kube-prometheus-stack; just Prometheus | Same Helm downsides; still requires learning chart-specific values schema; Pulumi Helm transformations don't work for all use cases | Raw manifests give better control without Helm translation layer |

---

## Decision 2: Grafana Deployment

**Decision**: Deploy Grafana using raw Kubernetes manifests via Pulumi's `kubernetes` package

**Rationale**:
- **Consistency with Prometheus**: Same deployment pattern for both monitoring components. Team learns one approach, not mix of raw/Helm/Operator
- **Explicit dashboard provisioning**: Grafana ConfigMaps for datasources and dashboards are first-class Pulumi resources, making provisioning transparent
- **No Helm complexity**: Avoid nested values.yaml, simplify testing, maintain full visibility into generated resources
- **Environment-specific overrides**: Easy to conditionally inject different alert routing configs (prod vs preview) via TypeScript logic rather than Helm value overrides

**Alternatives Considered**:
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Grafana Operator** | Grafana CRDs for dashboards/datasources; automatic sync; UI-driven workflow with GitOps | Operator is beta; CRDs subject to change; requires learning GrafanaDashboard/GrafanaDatasource schemas; harder to unit test CRD behavior | Stability concerns (beta status). Adds complexity for single-instance Grafana. ConfigMap provisioning is simpler and well-documented |
| **Helm Chart (grafana/grafana)** | Community-maintained; includes sidecar for auto-loading dashboards from ConfigMaps | Helm dependency; sidecar pattern adds container overhead; values.yaml learning curve; less transparent resource generation | ConfigMap provisioning works natively without sidecar. Helm hides resource details we want explicit control over |

---

## Decision 3: Dashboard Provisioning

**Decision**: Version-controlled JSON dashboards in Git, loaded via Grafana ConfigMap provisioning

**Rationale**:
- **No manual export required**: Dashboards defined in Git are the source of truth. Grafana loads them on startup via provisioning ConfigMaps
- **True GitOps**: Dashboard changes go through PR review, are auditable, and deployed via Pulumi. No UI drift
- **No compilation step**: JSON is Grafana's native format. No Jsonnet/CUE toolchain needed in CI/CD
- **Pulumi-native**: ConfigMaps are standard Kubernetes resources, easy to define in TypeScript with proper dependencies

**Alternatives Considered**:
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Grafana UI + manual export** | Easy for quick prototyping; WYSIWYG editing; no config syntax to learn | Not version-controlled; drift between environments; manual export/import workflow error-prone; loses GitOps benefits | Violates "zero manual kubectl" requirement. Dashboard changes unauditable without Git history |
| **Jsonnet/Grafonnet** | DRY dashboards via functions; easier to manage multiple similar dashboards; strong community tooling | Requires Jsonnet toolchain in CI/CD; additional build step; learning curve for Jsonnet syntax; debugging compiled JSON harder | Adds build complexity. Our dashboards are simple enough that JSON verbosity is manageable. Can revisit if we need heavy templating |
| **CUE** | Strong typing/validation; Grafana uses CUE schemas internally; modern language | Smaller ecosystem for Grafana specifically; fewer examples; additional tooling; CUE learning curve | Less mature than Jsonnet for Grafana. Validation benefits not critical for our simple dashboards. Tooling overhead not justified |

---

## Decision 4: Alert Rule Format

**Decision**: Use Prometheus recording/alerting rules (prometheus.yml) for metrics-based alerts, not Grafana Unified Alerting

**Rationale**:
- **Single source of truth**: Prometheus evaluates rules based on its scraped metrics. No dual alerting systems to maintain
- **ConfigMap-based**: Rules defined in Prometheus ConfigMap, version-controlled, deployed via Pulumi
- **Environment-specific routing**: Alertmanager config (also in ConfigMap) handles routing. Prod sends to email, preview suppresses. Simple YAML conditions
- **Simpler mental model**: Prometheus scrapes metrics → evaluates rules → fires alerts → Alertmanager routes. No cross-datasource complexity

**Alternatives Considered**:
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Grafana Unified Alerting** | Single UI for alerts across multiple datasources (Prometheus, Loki, etc.); visual rule builder; supports complex multi-condition alerts | Adds Grafana as alert evaluation engine; requires Grafana database for alert state; dual alerting systems (Prometheus + Grafana); harder to test alert logic | Overkill for Prometheus-only metrics. Introduces database dependency for alert state. Prometheus rules are sufficient and simpler |
| **Hybrid (Prometheus recording + Grafana alerts)** | Use Prometheus for pre-aggregation, Grafana for alerting logic | Splits alerting logic across two systems; harder to debug which system fired alert; increases complexity | No clear benefit over Prometheus-only approach for our use case |

---

## Decision 5: Persistent Storage

**Decision**: Use PersistentVolumeClaim with 7-day retention for Prometheus, emptyDir for Grafana

**Rationale**:
- **Prometheus needs persistence**: Metrics data must survive pod restarts/updates. PVC enables this
- **Retention policy**: Prometheus `--storage.tsdb.retention.time=7d` flag ensures 7-day window. PVC sized accordingly (e.g., 10Gi for expected metric volume)
- **DigitalOcean compatibility**: DO Kubernetes supports dynamic PV provisioning via default StorageClass. Pulumi creates PVC, DO provisions block storage automatically
- **Grafana is stateless**: Dashboards provisioned from ConfigMaps, datasources from ConfigMaps. No user-generated data to persist. emptyDir reduces cost
- **Reclaim policy**: Default `Delete` policy is acceptable - if Prometheus PVC is deleted, historical metrics are lost, but this is expected for ephemeral preview environments. Production can use `Retain` if needed

**Alternatives Considered**:
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **emptyDir for Prometheus** | Simplest configuration; no storage costs; faster pod startup | Metrics lost on every pod restart/update; defeats purpose of monitoring historical trends | Unusable for production. Metrics history is core requirement |
| **Larger retention (30d+)** | More historical data for trend analysis | Higher storage costs; slower query performance; 7 days sufficient for incident response | 7-day retention balances cost and utility. Can extend later if needed |
| **PVC for Grafana** | Persists user-created dashboards/settings | We use provisioned dashboards (read-only); no user settings to save; unnecessary cost | Grafana has no persistent state in our setup. ConfigMaps are source of truth |

---

## Decision 6: Metrics Scraping

**Decision**: Use Kubernetes service discovery (`kubernetes_sd_configs`) in prometheus.yml for pod/service scraping, not static configs

**Rationale**:
- **Automatic target discovery**: Prometheus auto-discovers annotated pods/services in cluster. No manual IP management
- **Works with auto-scaling**: If API pods scale 1→3, Prometheus automatically scrapes all replicas. Static configs can't handle dynamic targets
- **Annotation-based filtering**: Services with `prometheus.io/scrape: "true"` annotation are auto-scraped. Others ignored. Clean opt-in model
- **Relabeling for customization**: Can rewrite `__address__`, `__metrics_path__` based on annotations (e.g., `prometheus.io/port`, `prometheus.io/path`)
- **Configured once in ConfigMap**: Discovery logic lives in prometheus.yml ConfigMap, deployed via Pulumi. No ongoing maintenance

**Alternatives Considered**:
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Static scrape configs** | Simplest to understand; explicit targets; no relabeling logic | Breaks when pods restart (new IPs); manual updates required; doesn't work with auto-scaling; error-prone | Unusable in dynamic Kubernetes environment. Manual IP tracking is anti-pattern |
| **Prometheus Operator ServiceMonitor CRDs** | Declarative service discovery via CRDs; clean separation of concerns | Requires Operator (rejected in Decision 1); CRD learning curve; overkill for simple scraping | Already rejected Operator approach. kubernetes_sd_configs achieves same result with less complexity |
| **External targets via DNS** | Works for scraping outside cluster | Our targets are in-cluster; DNS adds latency; kubernetes_sd_configs is faster | Not applicable - all scrape targets are Kubernetes services |

---

## Summary

**Key Principles Applied**:
1. **Simplicity over features**: Raw manifests + ConfigMaps beat Operators/Helm for our single-replica, single-cluster use case
2. **Pulumi-only deployment**: Zero manual kubectl/helm commands. Everything declarative in TypeScript
3. **Version control as truth**: Dashboards, Prometheus rules, and configs in Git. No UI drift
4. **Environment-aware routing**: Same monitoring stack, different Alertmanager routing (prod sends email, preview suppresses)
5. **Dynamic infrastructure**: Kubernetes service discovery handles pod scaling/restarts without manual intervention

**Testing Strategy**:
- Unit tests for Pulumi components (ConfigMap generation, resource requests/limits)
- Integration tests for Prometheus scraping (verify annotation-based discovery)
- Validation: JSON schema checks for dashboards, promtool for Prometheus rules

**Future Considerations**:
- If we need 10+ similar dashboards → revisit Jsonnet/Grafonnet
- If we adopt multi-cluster → consider Prometheus federation or Thanos
- If alert complexity grows → evaluate Grafana Unified Alerting for cross-datasource rules
