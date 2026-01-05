# Feature Specification: Production Monitoring and Alerting

**Feature Branch**: `001-monitoring-alerting`
**Created**: 2025-12-28
**Status**: Draft
**Input**: User description: "We need to add production-grade monitoring and alerting using Prometheus and Grafana. Requirements: Managed via Pulumi (no kubectl, no manual config), Deployed into a monitoring namespace, Works for both prod and preview environments, Grafana hosted at https://grafana.aphiria.com, Auth via GitHub OAuth (org: aphiria, admin: davidbyoung), Alerts via Grafana Unified Alerting (email → admin@aphiria.com), Metrics include CPU, memory, pod health, request latency, error rates, Dashboards defined in source control (no UI edits), Preview environment alerts are lower severity, Uses NGINX Gateway + Let's Encrypt, Secrets stored in Pulumi ESC, No HA required, single replica acceptable, Prefer best-practice, modern approaches. Avoid overengineering."

## Clarifications

### Session 2025-12-28

- Q: Prometheus metrics retention period (spec stated 15 days, detailed requirements stated 7 days) → A: 7 days retention
- Q: Alert threshold time windows (User Story 4 stated 5 minutes, detailed requirements stated 10 minutes) → A: 10-minute windows for infrastructure alerts
- Q: Monitoring namespace name → A: monitoring
- Q: GitHub OAuth default user role for non-admin org members → A: Viewer (read-only)
- Q: Preview environment alert delivery (email vs suppress) → A: Suppress email delivery for preview alerts (log in Grafana only, no email notifications)
- Q: HTTP to HTTPS redirect requirement → A: http://grafana.aphiria.com must redirect to https://grafana.aphiria.com (HTTP should never be accessible)
- Q: Local development environment support → A: Support "local" environment where grafana.aphiria.com (via /etc/hosts) points to local Kubernetes cluster for testing dashboard changes before production deployment

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Infrastructure Health Visibility (Priority: P1)

As a site administrator, I need to view real-time system health metrics (CPU, memory, pod status) through a web dashboard, so I can quickly assess whether the application is running normally or experiencing resource constraints.

**Why this priority**: Without basic system health visibility, the team operates blind to infrastructure problems until users report issues. This is the foundational capability that makes monitoring valuable.

**Independent Test**: Can be fully tested by deploying the monitoring stack, accessing the dashboard URL, and verifying that current CPU/memory/pod metrics are displayed. Delivers immediate operational visibility without requiring alerts or other features.

**Acceptance Scenarios**:

1. **Given** the monitoring stack is deployed, **When** I navigate to the dashboard URL, **Then** I see current CPU usage for all application pods
2. **Given** the monitoring stack is running, **When** I view the dashboard, **Then** I see current memory consumption metrics for all services
3. **Given** the application is deployed, **When** I check the pod health dashboard, **Then** I see the status (running/pending/failed) of all pods
4. **Given** I am viewing metrics, **When** I refresh the page, **Then** I see updated metrics reflecting changes within the last 30 seconds

---

### User Story 2 - Secure Dashboard Access (Priority: P1)

As a site administrator, I need to authenticate via GitHub OAuth to access the monitoring dashboard, so that only authorized team members can view sensitive infrastructure metrics.

**Why this priority**: Security must be in place from day one. Exposing infrastructure metrics publicly would create a significant security risk. This is a non-negotiable requirement that must be delivered alongside the basic dashboard.

**Independent Test**: Can be fully tested by attempting to access the dashboard without authentication (should redirect to GitHub login), completing OAuth flow with authorized account (should grant access), and attempting access with unauthorized account (should deny access). Delivers secure access control.

**Acceptance Scenarios**:

1. **Given** I am not logged in, **When** I navigate to the dashboard URL, **Then** I am redirected to GitHub OAuth login
2. **Given** I authenticate with a GitHub account in the aphiria organization, **When** the OAuth flow completes, **Then** I am granted access to the dashboard with Viewer (read-only) permissions
3. **Given** I authenticate with a GitHub account outside the aphiria organization, **When** the OAuth flow completes, **Then** I am denied access with a clear error message
4. **Given** I am authenticated as user davidbyoung, **When** I access the dashboard, **Then** I have admin privileges to modify settings
5. **Given** my session expires, **When** I attempt to view the dashboard, **Then** I am redirected back to GitHub OAuth login

---

### User Story 3 - Application Performance Monitoring (Priority: P2)

As a site administrator, I need to view application-level metrics (request latency, error rates) through the dashboard, so I can identify performance degradation and errors affecting end users.

**Why this priority**: While infrastructure health (P1) tells us if the servers are healthy, application metrics tell us if the user experience is healthy. This is critical for proactive issue detection but can be added after basic infrastructure monitoring is working.

**Independent Test**: Can be fully tested by generating traffic to the application, viewing the application metrics dashboard, and verifying that request latencies and error rates are displayed accurately. Delivers user-facing performance visibility.

**Acceptance Scenarios**:

1. **Given** the application is receiving requests, **When** I view the application metrics dashboard, **Then** I see average request latency over the last 5 minutes
2. **Given** the application returns some HTTP errors, **When** I check error rate metrics, **Then** I see the percentage of requests resulting in errors
3. **Given** request latency increases, **When** I view the latency graph, **Then** I see the trend showing degradation over time
4. **Given** I want to investigate errors, **When** I view error metrics, **Then** I can see error counts broken down by HTTP status code

---

### User Story 4 - Automated Alert Notifications (Priority: P2)

As a site administrator, I need to receive email alerts when critical thresholds are exceeded (high CPU, memory exhaustion, elevated error rates), so I can respond to problems before they cause user-visible outages.

**Why this priority**: Proactive alerting prevents small issues from becoming major outages. While not required on day one (you can manually check dashboards), automated alerts significantly reduce response time and are essential for production operations.

**Independent Test**: Can be fully tested by triggering threshold violations (e.g., load testing to spike CPU), waiting for alert evaluation, and verifying that email notifications are received at admin@aphiria.com. Delivers proactive incident detection.

**Acceptance Scenarios**:

1. **Given** CPU usage exceeds 80% for 10 minutes, **When** the alert evaluates, **Then** I receive an email notification at admin@aphiria.com
2. **Given** memory usage exceeds 90% for 10 minutes, **When** the alert evaluates, **Then** I receive an email notification describing the issue
3. **Given** error rate exceeds 5% of requests for 5 minutes, **When** the alert evaluates, **Then** I receive an email notification with error details
4. **Given** a pod is in Failed or CrashLoopBackOff state, **When** the alert evaluates, **Then** I receive an email notification identifying the failing pod
5. **Given** an alert condition resolves, **When** the system returns to normal, **Then** I receive a recovery notification email

---

### User Story 5 - Environment-Specific Alert Severity (Priority: P3)

As a site administrator, I need preview environment alerts to be less severe (lower thresholds, lower urgency) than production alerts, so I avoid alert fatigue from non-critical test environments while still catching genuine preview issues.

**Why this priority**: While useful for operational maturity, differentiated alerting is a refinement that can be added after core alerting works. The team can initially treat all environments equally and tune severity later based on operational experience.

**Independent Test**: Can be fully tested by triggering the same condition in both production and preview environments, then verifying that production generates a high-severity alert while preview generates a low-severity alert. Delivers alert tuning to reduce noise.

**Acceptance Scenarios**:

1. **Given** CPU usage exceeds 80% in production, **When** the alert evaluates, **Then** an email notification is sent to admin@aphiria.com
2. **Given** CPU usage exceeds 80% in preview environment, **When** the alert evaluates, **Then** the alert is logged in Grafana but no email is sent
3. **Given** preview environment experiences a pod failure, **When** the alert evaluates, **Then** the alert is visible in Grafana alert history but no email notification is sent
4. **Given** production environment experiences a pod failure, **When** the alert evaluates, **Then** an email notification is sent to admin@aphiria.com clearly indicating production urgency

---

### User Story 6 - Version-Controlled Dashboards (Priority: P3)

As a developer, I need all dashboard definitions stored in source control (not created via UI), so that dashboard changes go through code review, are tracked in git history, and can be rolled back if needed.

**Why this priority**: While important for long-term maintainability and team collaboration, version-controlled dashboards are a process improvement that can be added after the monitoring system is operational. The team can initially create dashboards manually and migrate them to code later.

**Independent Test**: Can be fully tested by modifying a dashboard definition file in the git repository, deploying the change via Pulumi, and verifying that the dashboard updates reflect the code change. Delivers infrastructure-as-code for dashboards.

**Acceptance Scenarios**:

1. **Given** I modify a dashboard definition in source control, **When** I deploy via Pulumi, **Then** the dashboard reflects my changes
2. **Given** I create a new dashboard in the UI, **When** I attempt to save it, **Then** the system prevents UI-based dashboard creation (enforcing source control)
3. **Given** a dashboard change causes issues, **When** I revert the git commit and redeploy, **Then** the dashboard returns to its previous state
4. **Given** a new team member joins, **When** they clone the repository, **Then** they can view all dashboard definitions in code

---

### Edge Cases

- What happens when Grafana cannot reach Prometheus (datasource unavailable)? System should display clear error messages indicating metrics cannot be retrieved and provide troubleshooting guidance.
- How does the system handle expired or invalid GitHub OAuth tokens? Users should be automatically redirected to re-authenticate without losing their current dashboard view.
- What happens when email delivery fails for alerts? System should retry delivery and log failed notifications for administrative review.
- How does the system behave when alert rules are misconfigured (e.g., invalid PromQL queries)? System should validate rules during deployment and reject invalid configurations with clear error messages.
- What happens when Let's Encrypt rate limits are hit during certificate renewal? System should retry with exponential backoff and alert administrators if renewal fails.
- How does the system handle metric data gaps (e.g., Prometheus scrape failures)? Dashboards should clearly indicate missing data rather than showing misleading trends.
- What happens when a preview environment is deleted while alerts are active? Alerts should automatically deactivate or stop firing when the target environment no longer exists.
- How does the system handle concurrent dashboard access by multiple administrators? Changes should be reflected in real-time or users should be notified of conflicts.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST deploy all monitoring components via Pulumi with zero manual `kubectl` configuration
- **FR-002**: System MUST isolate monitoring resources in a dedicated namespace called "monitoring"
- **FR-003**: System MUST provide identical monitoring capabilities across all environments (production, preview, and local)
- **FR-003a**: System MUST support local development environment where grafana.aphiria.com (configured via /etc/hosts) routes to local Kubernetes cluster for testing changes before production deployment
- **FR-004**: Dashboard MUST be accessible via HTTPS at https://grafana.aphiria.com (production) and https://{PR}.pr-grafana.aphiria.com (preview)
- **FR-005**: System MUST enforce authentication via GitHub OAuth for all dashboard access
- **FR-006**: System MUST restrict dashboard access to users in the "aphiria" GitHub organization
- **FR-006a**: System MUST assign Viewer (read-only) role by default to all authenticated aphiria organization members
- **FR-007**: System MUST grant administrative privileges to GitHub user "davidbyoung"
- **FR-008**: System MUST send alert notifications via email to admin@aphiria.com
- **FR-009**: System MUST collect and display CPU usage metrics for all application pods
- **FR-010**: System MUST collect and display memory usage metrics for all application pods
- **FR-011**: System MUST collect and display pod health status (running/pending/failed/etc.)
- **FR-012**: System MUST collect and display HTTP request latency metrics
- **FR-013**: System MUST collect and display HTTP error rate metrics
- **FR-014**: System MUST define all dashboards in source control (version-controlled files)
- **FR-015**: System MUST prevent dashboard creation or modification via the web UI
- **FR-016**: System MUST suppress email delivery for alerts triggered in preview environments (alerts logged in Grafana only)
- **FR-016a**: System MUST send email notifications for all production environment alerts
- **FR-017**: System MUST provision TLS certificates via Let's Encrypt for HTTPS access
- **FR-018**: System MUST route external traffic to the dashboard via NGINX Gateway
- **FR-018a**: System MUST redirect all HTTP traffic (http://grafana.aphiria.com) to HTTPS (https://grafana.aphiria.com)
- **FR-019**: System MUST store all sensitive credentials (OAuth secrets, SMTP passwords, etc.) in Pulumi ESC
- **FR-020**: System MUST operate reliably with single-replica deployments (no high availability required)
- **FR-021**: Alert rules MUST evaluate metric thresholds at regular intervals (at least every minute)
- **FR-022**: System MUST retain metrics for 7 days for historical analysis
- **FR-023**: Dashboards MUST refresh automatically to display near-real-time data (within 30 seconds of collection)

### Key Entities

- **Metric**: A time-series data point representing a measurement (CPU percentage, memory bytes, request duration, etc.) collected from application infrastructure
- **Alert Rule**: A condition definition that evaluates metrics against thresholds and triggers notifications when violated
- **Dashboard**: A visual representation of metrics organized into graphs, tables, and panels for human consumption
- **Notification Channel**: A delivery mechanism for alerts (email recipient, severity level, message template)
- **Datasource**: The connection configuration linking the dashboard system to the metrics storage backend
- **Environment**: A deployment context (production or preview) that determines alert severity and labeling

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Administrators can view current infrastructure health metrics within 5 seconds of accessing the dashboard URL
- **SC-002**: System detects and sends email notifications for critical threshold violations within 2 minutes of occurrence
- **SC-003**: Dashboard displays metrics with a maximum data lag of 30 seconds from actual system state
- **SC-004**: Administrators can successfully authenticate and access the dashboard in under 30 seconds using GitHub OAuth
- **SC-005**: Dashboard remains accessible and responsive when displaying metrics from 20+ concurrent pods
- **SC-006**: 100% of alert rule changes are tracked in git history with commit attribution
- **SC-007**: System automatically recovers and resumes metric collection within 5 minutes after temporary pod failures
- **SC-008**: Preview environment alerts are logged in Grafana without email delivery in 100% of cases while production alerts trigger email notifications
- **SC-009**: Unauthorized users (outside aphiria GitHub org) are denied access within 10 seconds of OAuth completion
- **SC-010**: Dashboard configuration changes deploy successfully via Pulumi in under 5 minutes

## Assumptions

- The NGINX Gateway infrastructure is already deployed and operational (as referenced in the requirements)
- The application pods expose Prometheus-compatible metrics endpoints (or will be instrumented to do so)
- Email delivery infrastructure (SMTP server or equivalent) is available for alert notifications
- DNS configuration for grafana.aphiria.com (production) and \*.pr-grafana.aphiria.com (preview) can be managed through existing infrastructure automation
- Let's Encrypt is already integrated with the NGINX Gateway for certificate issuance
- GitHub OAuth application credentials will be provided or can be created in the aphiria organization
- Pulumi ESC is already configured and accessible for secret storage
- The Kubernetes cluster has sufficient resources to run single-replica monitoring workloads

## Dependencies

- NGINX Gateway must be deployed and operational before Grafana ingress can route traffic
- Let's Encrypt integration must be functional for TLS certificate provisioning
- Pulumi ESC must be configured before deploying secrets-dependent components
- GitHub OAuth application must be registered before authentication can work
- Application pods must expose metrics endpoints before Prometheus can scrape them

## Scope

### In Scope

- Deployment of Prometheus for metric collection and storage
- Deployment of Grafana for visualization and alerting
- GitHub OAuth integration for authentication and authorization
- Email-based alert notifications
- Version-controlled dashboard definitions
- Environment-specific alert severity tuning
- TLS certificate provisioning via Let's Encrypt
- NGINX-based ingress routing
- Infrastructure and application-level metrics collection
- Single-replica deployments (no high availability)

### Out of Scope

- High availability / multi-replica deployments
- Advanced notification channels (Slack, PagerDuty, SMS, etc.)
- Distributed tracing or log aggregation (separate from metrics)
- Long-term metric archival beyond 7 days
- Custom metric exporters for third-party services
- Multi-tenancy or per-user dashboard access control beyond org-level GitHub auth
- Automated runbook execution or auto-remediation
- Capacity planning or cost analysis dashboards
- Integration with external incident management systems
