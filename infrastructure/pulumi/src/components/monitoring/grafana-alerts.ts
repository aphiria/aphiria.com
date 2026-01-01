import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

/**
 * Contact point receiver configuration
 */
export interface ContactPointReceiver {
    /** Unique identifier (max 40 chars) */
    uid: string;
    /** Receiver type (email, webhook, slack, etc.) */
    type: string;
    /** Type-specific settings */
    settings: Record<string, string | boolean | number>;
    /** Disable resolve messages */
    disableResolveMessage?: boolean;
}

/**
 * Contact point configuration
 */
export interface ContactPoint {
    /** Organization ID (default: 1) */
    orgId?: number;
    /** Contact point name */
    name: string;
    /** List of receivers */
    receivers: ContactPointReceiver[];
}

/**
 * Arguments for Grafana Unified Alerting provisioning
 */
export interface GrafanaAlertsArgs {
    /** Kubernetes namespace for monitoring resources */
    namespace: pulumi.Input<string>;
    /** Environment label to add to alert rules */
    environment: string;
    /** Contact points configuration */
    contactPoints: ContactPoint[];
    /** Default receiver name for notification policy */
    defaultReceiver: string;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Result from creating Grafana alert provisioning
 */
export interface GrafanaAlertsResult {
    /** ConfigMap containing alert rule definitions */
    alertRulesConfigMap: k8s.core.v1.ConfigMap;
    /** ConfigMap containing contact points (email, null) */
    contactPointsConfigMap: k8s.core.v1.ConfigMap;
    /** ConfigMap containing notification policies (routing logic) */
    notificationPoliciesConfigMap: k8s.core.v1.ConfigMap;
}

/**
 * Alert rule definition for Grafana Unified Alerting
 */
interface AlertRule {
    /** Unique identifier (max 40 chars) */
    uid: string;
    /** Alert title shown in UI */
    title: string;
    /** PromQL expression to evaluate */
    expr: string;
    /** Threshold value (e.g., "> 0.8" or "> 0") */
    threshold: string;
    /** Reduce function (last, mean, max, min, sum) */
    reduceFunction: string;
    /** Duration threshold must be met before firing */
    for: string;
    /** Alert labels */
    labels: {
        severity: string;
        environment: string;
    };
    /** Alert annotations (summary, description) */
    annotations: {
        summary: string;
        description: string;
    };
}

/**
 * Creates Grafana Unified Alerting provisioning ConfigMaps
 *
 * Grafana auto-discovers alert rules, contact points, and notification policies
 * from ConfigMaps with label grafana_alert: "1"
 */
export function createGrafanaAlerts(args: GrafanaAlertsArgs): GrafanaAlertsResult {
    // Define alert rules using Grafana Unified Alerting format
    const alertRules: AlertRule[] = [
        {
            uid: "high_cpu_usage",
            title: "High CPU Usage",
            expr: "rate(container_cpu_usage_seconds_total[5m])",
            threshold: "> 0.8",
            reduceFunction: "last",
            for: "10m",
            labels: {
                severity: "critical",
                environment: args.environment,
            },
            annotations: {
                summary: "High CPU usage detected",
                description:
                    "Container {{ $values.A.Labels.container }} in pod {{ $values.A.Labels.pod }} has CPU usage above 80% for 10 minutes (current: {{ $values.B.Value }})",
            },
        },
        {
            uid: "high_memory_usage",
            title: "High Memory Usage",
            expr: "container_memory_working_set_bytes / container_spec_memory_limit_bytes",
            threshold: "> 0.9",
            reduceFunction: "last",
            for: "10m",
            labels: {
                severity: "critical",
                environment: args.environment,
            },
            annotations: {
                summary: "High memory usage detected",
                description:
                    "Container {{ $values.A.Labels.container }} in pod {{ $values.A.Labels.pod }} has memory usage above 90% for 10 minutes (current: {{ $values.B.Value }})",
            },
        },
        {
            uid: "high_api_latency",
            title: "High API Latency",
            expr: 'histogram_quantile(0.95, sum(rate(app_http_request_duration_seconds_bucket{job="api"}[5m])) by (le))',
            threshold: "> 1",
            reduceFunction: "last",
            for: "5m",
            labels: {
                severity: "warning",
                environment: args.environment,
            },
            annotations: {
                summary: "High API latency detected",
                description:
                    "API P95 latency is above 1 second for 5 minutes (current: {{ $values.B.Value }}s)",
            },
        },
        {
            uid: "high_api_4xx_rate",
            title: "High API 4xx Rate",
            expr: 'rate(app_http_requests_total{job="api",status=~"4.."}[5m]) / rate(app_http_requests_total{job="api"}[5m])',
            threshold: "> 0.1",
            reduceFunction: "last",
            for: "5m",
            labels: {
                severity: "warning",
                environment: args.environment,
            },
            annotations: {
                summary: "High API 4xx rate detected",
                description:
                    "API 4xx error rate is above 10% for 5 minutes (current: {{ $values.B.Value }})",
            },
        },
        {
            uid: "high_api_5xx_rate",
            title: "High API 5xx Rate",
            expr: 'rate(app_http_requests_total{job="api",status=~"5.."}[5m]) / rate(app_http_requests_total{job="api"}[5m])',
            threshold: "> 0.05",
            reduceFunction: "last",
            for: "5m",
            labels: {
                severity: "critical",
                environment: args.environment,
            },
            annotations: {
                summary: "High API 5xx rate detected",
                description:
                    "API 5xx error rate is above 5% for 5 minutes (current: {{ $values.B.Value }})",
            },
        },
        {
            uid: "pod_crash_looping",
            title: "Pod Crash Looping",
            expr: 'kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"}',
            threshold: "> 0",
            reduceFunction: "last",
            for: "5m",
            labels: {
                severity: "critical",
                environment: args.environment,
            },
            annotations: {
                summary: "Pod is crash looping",
                description:
                    "Pod {{ $values.A.Labels.pod }} in namespace {{ $values.A.Labels.namespace }} is in CrashLoopBackOff state",
            },
        },
        {
            uid: "pod_failed",
            title: "Pod Failed",
            expr: 'kube_pod_status_phase{phase="Failed"}',
            threshold: "> 0",
            reduceFunction: "last",
            for: "1m",
            labels: {
                severity: "critical",
                environment: args.environment,
            },
            annotations: {
                summary: "Pod has failed",
                description:
                    "Pod {{ $values.A.Labels.pod }} in namespace {{ $values.A.Labels.namespace }} has failed",
            },
        },
    ];

    // Convert alert rules to Grafana Unified Alerting provisioning YAML format
    const alertRulesYaml = `apiVersion: 1
groups:
  - orgId: 1
    name: infrastructure-alerts
    folder: Infrastructure
    interval: 1m
    rules:
${alertRules
    .map(
        (rule) => `      - uid: ${rule.uid}
        title: ${rule.title}
        condition: C
        data:
          - refId: A
            relativeTimeRange:
              from: 600
              to: 0
            datasourceUid: prometheus
            model:
              expr: ${rule.expr}
              intervalMs: 60000
              maxDataPoints: 43200
              refId: A
          - refId: B
            datasourceUid: __expr__
            model:
              conditions:
                - evaluator:
                    params: []
                    type: gt
                  operator:
                    type: and
                  query:
                    params:
                      - B
                  reducer:
                    params: []
                    type: ${rule.reduceFunction}
                  type: query
              datasource:
                type: __expr__
                uid: __expr__
              expression: A
              intervalMs: 60000
              maxDataPoints: 43200
              reducer: ${rule.reduceFunction}
              refId: B
              type: reduce
          - refId: C
            datasourceUid: __expr__
            model:
              conditions:
                - evaluator:
                    params:
                      - ${rule.threshold.replace(/^>\s*/, "")}
                    type: gt
                  operator:
                    type: and
                  query:
                    params:
                      - C
                  reducer:
                    params: []
                    type: last
                  type: query
              datasource:
                type: __expr__
                uid: __expr__
              expression: B
              intervalMs: 60000
              maxDataPoints: 43200
              refId: C
              type: threshold
        noDataState: NoData
        execErrState: Alerting
        for: ${rule.for}
        annotations:
          summary: "${rule.annotations.summary}"
          description: "${rule.annotations.description}"
        labels:
          severity: ${rule.labels.severity}
          environment: ${rule.labels.environment}`
    )
    .join("\n")}
`;

    // Create alert rules ConfigMap
    const alertRulesConfigMap = new k8s.core.v1.ConfigMap(
        "grafana-alert-rules",
        {
            metadata: {
                name: "grafana-alert-rules",
                namespace: args.namespace,
                labels: {
                    grafana_alert: "1", // Required for Grafana provisioning discovery
                },
            },
            data: {
                "alert-rules.yaml": alertRulesYaml,
            },
        },
        { provider: args.provider }
    );

    // Generate contact points YAML from configuration
    const contactPointsYaml = `apiVersion: 1
contactPoints:
${args.contactPoints
    .map(
        (cp) => `  - orgId: ${cp.orgId || 1}
    name: ${cp.name}
    receivers:
${cp.receivers
    .map(
        (r) => `      - uid: ${r.uid}
        type: ${r.type}
        settings:
${Object.entries(r.settings)
    .map(
        ([key, value]) =>
            `          ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`
    )
    .join(
        "\n"
    )}${r.disableResolveMessage !== undefined ? `\n        disableResolveMessage: ${r.disableResolveMessage}` : ""}`
    )
    .join("\n")}`
    )
    .join("\n")}
`;

    // Create contact points ConfigMap
    const contactPointsConfigMap = new k8s.core.v1.ConfigMap(
        "grafana-contact-points",
        {
            metadata: {
                name: "grafana-contact-points",
                namespace: args.namespace,
                labels: {
                    grafana_alert: "1",
                },
            },
            data: {
                "contact-points.yaml": contactPointsYaml,
            },
        },
        { provider: args.provider }
    );

    // Configure notification policies (routing)
    const notificationPoliciesYaml = `apiVersion: 1
policies:
  - receiver: ${args.defaultReceiver}
    group_by: ['alertname', 'environment']
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 0
    matchers:
      - environment = ${args.environment}
`;

    // Create notification policies ConfigMap
    const notificationPoliciesConfigMap = new k8s.core.v1.ConfigMap(
        "grafana-notification-policies",
        {
            metadata: {
                name: "grafana-notification-policies",
                namespace: args.namespace,
                labels: {
                    grafana_alert: "1",
                },
            },
            data: {
                "notification-policies.yaml": notificationPoliciesYaml,
            },
        },
        { provider: args.provider }
    );

    return {
        alertRulesConfigMap,
        contactPointsConfigMap,
        notificationPoliciesConfigMap,
    };
}
