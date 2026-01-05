# PHP Application Metrics Tasks - Addendum to tasks.md

**Note**: These tasks should be integrated into the main tasks.md file as new phases after the current Phase 5 (Grafana Dashboard Provisioning).

---

## Phase 6: PHP Metrics Library & Authentication (User Story 3 - Application Performance Monitoring)

**Goal**: Add Prometheus client library to PHP application and implement Bearer token authentication for /metrics endpoint

**Story Label**: [US3]

### Tasks

- [ ] T051 [US3] Install promphp/prometheus_client_php via composer in project root
- [ ] T052 [P] [US3] Create MonitoringBinder in src/Monitoring/Binders/MonitoringBinder.php
    - Extends Aphiria\DependencyInjection\Binders\Binder
    - Binds Prometheus\CollectorRegistry as singleton with APCu storage adapter
    - Registers PrometheusTokenScheme with scheme name "prometheus"
- [ ] T053 [P] [US3] Create PrometheusTokenScheme in src/Api/Authentication/Schemes/PrometheusTokenScheme.php
    - Implements Aphiria\Authentication\IAuthenticationScheme
    - Validates Bearer token from Authorization header
    - Compares with PROMETHEUS_AUTH_TOKEN environment variable
    - Returns AuthenticationResult::pass() or fail()
- [ ] T054 [P] [US3] Create unit test for MonitoringBinder in tests/Unit/Monitoring/Binders/MonitoringBinderTest.php
    - Verify CollectorRegistry binding
    - Verify authentication scheme registration
- [ ] T055 [P] [US3] Create unit test for PrometheusTokenScheme in tests/Unit/Api/Authentication/Schemes/PrometheusTokenSchemeTest.php
    - Test with valid Bearer token
    - Test with invalid Bearer token
    - Test with missing Authorization header
    - Test challenge() and forbid() responses

---

## Phase 7: PHP Metrics Collection (User Story 3)

**Goal**: Implement middleware, exception listener, and metrics controller to collect and expose application metrics

**Story Label**: [US3]

### Tasks

- [ ] T056 [US3] Create PrometheusMetrics middleware in src/Api/Middleware/PrometheusMetrics.php
    - Implements Aphiria\Net\Http\IMiddleware
    - Constructor-injected CollectorRegistry dependency
    - Records request start time, calls $next($request), calculates duration
    - Extracts route pattern (normalized with :id placeholders)
    - Increments http_request_duration_seconds histogram and http_requests_total counter
- [ ] T057 [P] [US3] Create PrometheusExceptionListener in src/Monitoring/Listeners/PrometheusExceptionListener.php
    - Listens to Aphiria exception events
    - Constructor-injected CollectorRegistry dependency
    - Increments exceptions_total{type, route} counter
- [ ] T058 [P] [US3] Create MetricsController in src/Api/Controllers/MetricsController.php
    - Extends Aphiria\Api\Controllers\Controller
    - Uses #[Get('metrics')] route attribute
    - Uses #[Authenticate('prometheus')] from Aphiria\Authentication\Attributes
    - Constructor-injected CollectorRegistry dependency
    - Calls getMetricFamilySamples() and renders Prometheus text format
    - Returns response with Content-Type: text/plain; version=0.0.4
- [ ] T059 [P] [US3] Create unit test for PrometheusMetrics middleware in tests/Unit/Api/Middleware/PrometheusMetricsTest.php
    - Mock CollectorRegistry
    - Verify histogram and counter increments
    - Verify route normalization
- [ ] T060 [P] [US3] Create unit test for PrometheusExceptionListener in tests/Unit/Monitoring/Listeners/PrometheusExceptionListenerTest.php
    - Mock CollectorRegistry
    - Verify exception counter increments
- [ ] T061 [P] [US3] Create unit test for MetricsController in tests/Unit/Api/Controllers/MetricsControllerTest.php
    - Mock CollectorRegistry
    - Verify response format and content-type
- [ ] T062 [US3] Create integration test for metrics authentication in tests/Integration/Monitoring/PrometheusAuthTest.php
    - Real HTTP request without token → expect 401
    - Real HTTP request with valid token → expect 200
- [ ] T063 [US3] Create integration test for metrics endpoint in tests/Integration/Monitoring/PrometheusMetricsIntegrationTest.php
    - Make request to application
    - Fetch /metrics with auth token
    - Parse Prometheus text format output
    - Verify http_requests_total and http_request_duration_seconds metrics exist
- [ ] T064 [US3] Register MonitoringBinder in application bootstrap configuration
- [ ] T065 [US3] Register PrometheusMetrics middleware globally in middleware configuration
- [ ] T066 [US3] Register PrometheusExceptionListener in event system configuration
- [ ] T067 [US3] Run PHP quality gates (composer phpcs-fix, composer phpunit, composer psalm)

---

## Phase 8: Pulumi Metrics Infrastructure (User Story 3)

**Goal**: Create Pulumi infrastructure to support PHP metrics collection (Secret, ServiceMonitor, API env var injection)

**Story Label**: [US3]

### Tasks

- [ ] T068 [US3] Generate random token for monitoring:prometheusApiToken (32+ chars, base64-encoded)
- [ ] T069 [US3] Add monitoring:prometheusApiToken secret to Pulumi ESC (aphiria.com/Preview environment)
- [ ] T070 [US3] Add monitoring:prometheusApiToken secret to Pulumi ESC (aphiria.com/Production environment)
- [ ] T071 [P] [US3] Create api-metrics.ts component in infrastructure/pulumi/src/components/monitoring/api-metrics.ts
    - Export createApiMetricsMonitoring function
    - Retrieve token from Pulumi Config("monitoring").requireSecret("prometheusApiToken")
    - Create prometheus-api-auth Secret in monitoring namespace
    - Create ServiceMonitor with bearerTokenSecret configuration
- [ ] T072 [P] [US3] Create unit test for api-metrics component in infrastructure/pulumi/tests/components/monitoring/api-metrics.test.ts
    - Verify Secret creation
    - Verify ServiceMonitor creation
    - Verify token passed correctly
- [ ] T073 [US3] Modify API Deployment in infrastructure/pulumi/src/components/api.ts
    - Add PROMETHEUS_AUTH_TOKEN environment variable
    - Inject from prometheus-api-auth Secret
- [ ] T074 [US3] Update SECRETS.md with monitoring:prometheusApiToken entry
    - Add to Pulumi ESC Environments table (line 99)
    - Add new section after grafana:smtpPassword with generation/rotation procedures
- [ ] T075 [US3] Integrate createApiMetricsMonitoring into stack-factory.ts
    - Call after monitoring stack creation
    - Pass namespace and API service labels
- [ ] T076 [US3] Run Pulumi TypeScript quality gates in infrastructure/pulumi directory
    - npm run build (compile TypeScript)
    - npm run lint (0 errors/warnings)
    - npm test (100% coverage)

---

## Phase 9: Metrics Verification & Dashboard (User Story 3)

**Goal**: Deploy to local/preview environment, verify metrics collection, create Grafana application dashboard

**Story Label**: [US3]

### Tasks

- [ ] T077 [US3] Deploy to local Kubernetes cluster (pulumi up --stack local)
- [ ] T078 [US3] Verify /metrics endpoint returns 401 without Authorization header
- [ ] T079 [US3] Verify /metrics endpoint returns 200 with valid Bearer token
- [ ] T080 [US3] Verify Prometheus scrapes /metrics successfully (Prometheus UI: Status → Targets)
- [ ] T081 [US3] Query Prometheus for http_requests_total metric (verify data exists)
- [ ] T082 [P] [US3] Create api-application.json dashboard in specs/001-monitoring-alerting/contracts/dashboards/api-application.json
    - Panel: Request Rate (rate(http_requests_total[5m]))
    - Panel: Request Latency p95 (histogram_quantile(0.95, ...))
    - Panel: Error Rate 5xx (rate(http_requests_total{status=~"5.."}[5m]))
    - Panel: Top Slowest Routes (topk(10, ...))
    - Panel: Exception Rate (rate(exceptions_total[5m]))
    - Panel: Top Exception Types (topk(10, ...))
- [ ] T083 [US3] Add api-application.json to dashboards.ts provisioning in infrastructure/pulumi/src/components/monitoring/dashboards.ts
- [ ] T084 [US3] Verify dashboard loads in Grafana UI
- [ ] T085 [US3] Verify dashboard panels display real data from Prometheus
- [ ] T086 [US3] Run final quality gates for Phase 9
    - PHP: composer phpunit --coverage-text (100% coverage)
    - PHP: composer psalm (0 errors)
    - Pulumi: npm test (100% coverage)
    - Pulumi: npm run lint (0 errors/warnings)

---

## Updated Dependency Graph

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundation) ← BLOCKS ALL USER STORIES
    ↓
    ├─→ Phase 3 (US1 - Infrastructure Health) ← MVP
    ├─→ Phase 4 (US2 - Secure Access)
    └─→ Phase 5 (US3 - Grafana Dashboard Provisioning)
            ↓
        Phase 6 (US3 - PHP Metrics Library & Auth) ← NEW
            ↓
        Phase 7 (US3 - PHP Metrics Collection) ← NEW
            ↓
        Phase 8 (US3 - Pulumi Metrics Infrastructure) ← NEW
            ↓
        Phase 9 (US3 - Metrics Verification & Dashboard) ← NEW
            ↓
        Phase 10 (US4 - Alerting)
            ↓
        Phase 11 (US5 - Environment-Specific Alerts)
            ↓
        Phase 12 (Polish & Cross-Cutting)
```

---

## Implementation Strategy

**MVP (Minimum Viable Product)**: Phases 1-3 (Infrastructure monitoring)

- Delivers basic visibility into cluster health
- Can be deployed and tested independently

**Increment 2**: Phases 4-5 (Secure access + dashboards)

- Adds authentication and dashboard management
- Builds on infrastructure monitoring

**Increment 3**: Phases 6-9 (Application metrics) ← NEW

- Adds PHP instrumentation
- Requires infrastructure monitoring to be working
- Delivers end-to-end application performance visibility

**Increment 4**: Phases 10-11 (Alerting)

- Adds proactive notifications
- Requires metrics collection to be working

**Increment 5**: Phase 12 (Polish)

- Performance optimization, documentation updates

---

## Task Summary

**Total New Tasks**: 36 tasks (T051-T086)

- Phase 6: 5 tasks (Library & Authentication)
- Phase 7: 12 tasks (Metrics Collection)
- Phase 8: 9 tasks (Pulumi Infrastructure)
- Phase 9: 10 tasks (Verification & Dashboard)

**Parallel Opportunities**:

- Within Phase 6: T052-T055 (binders and tests can be developed in parallel)
- Within Phase 7: T057-T063 (middleware, listener, controller, and their tests)
- Within Phase 8: T071-T072 (component and test)
- Within Phase 9: T082-T085 (dashboard creation and verification)

**Test Coverage**:

- PHP Unit Tests: 7 test files
- PHP Integration Tests: 2 test files
- Pulumi Unit Tests: 1 test file
- Total Test Tasks: 10/36 (28% of tasks are testing)

---

## Integration Instructions

To integrate these tasks into the main tasks.md:

1. Renumber existing tasks after Phase 5 (shift from current numbering)
2. Insert these new phases (6-9) between current Phase 5 and Phase 6 (Alerting)
3. Update the dependency graph in tasks.md to match the "Updated Dependency Graph" above
4. Update the "Implementation Strategy" section to include the new Increment 3
5. Update task summary statistics (total tasks, tasks per phase, etc.)
