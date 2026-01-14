import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as path from "path";
import * as fs from "fs";
import { Environment } from "../types";
import { installKubePrometheusStack, createNamespace } from "../../../components";
import { createGrafana, GrafanaResult } from "../../../components/grafana";
import { createGrafanaIngress, GrafanaIngressResult } from "../../../components/grafana-ingress";
import { createGrafanaAlerts, AlertRule } from "../../../components/grafana-alerts";
import { createDashboards } from "../../../components/dashboards";
import { NamespaceResult } from "../../../components/types";
import { MonitoringConfig, PrometheusConfig, GrafanaConfig } from "../config/types";

/**
 * Monitoring resources
 */
export interface MonitoringResources {
    namespace: NamespaceResult;
    kubePrometheusStack: k8s.helm.v4.Chart;
    grafana: GrafanaResult;
    grafanaIngress: GrafanaIngressResult;
}

/**
 * Arguments for creating monitoring resources
 */
export interface MonitoringResourcesArgs {
    env: Environment;
    provider: k8s.Provider;
    monitoringConfig: MonitoringConfig;
    prometheusConfig: PrometheusConfig;
    grafanaConfig: GrafanaConfig;
}

/**
 * Creates monitoring resources (Prometheus, Grafana, dashboards, alerts)
 *
 * This factory encapsulates all monitoring infrastructure:
 * - Monitoring namespace with ResourceQuota
 * - kube-prometheus-stack (Prometheus Operator + Prometheus + kube-state-metrics)
 * - Grafana with OAuth, SMTP, and basic auth
 * - Dashboard provisioning
 * - Alert rules and contact points
 * - Grafana ingress/routing
 *
 * @param args - Monitoring resources configuration
 * @returns Monitoring resources
 */
export function createMonitoringResources(args: MonitoringResourcesArgs): MonitoringResources {
    const { env, provider, monitoringConfig, prometheusConfig, grafanaConfig } = args;

    // Create monitoring namespace with ResourceQuota
    const monitoringNamespace = createNamespace({
        name: "monitoring",
        environmentLabel: env,
        resourceQuota: monitoringConfig.namespace.resourceQuota,
        labels: {
            "app.kubernetes.io/component": "monitoring",
        },
        provider,
    });

    // Install kube-prometheus-stack (Prometheus Operator + Prometheus + kube-state-metrics + Alertmanager)
    const kubePrometheusStack = installKubePrometheusStack(
        {
            env,
            chartName: "kube-prometheus-stack",
            repository: "https://prometheus-community.github.io/helm-charts",
            version: "70.10.0", // Chart version - infrastructure dependency
            namespace: "monitoring",
            provider,
            values: {
                prometheus: {
                    prometheusSpec: {
                        retention: prometheusConfig.retentionTime,
                        scrapeInterval: prometheusConfig.scrapeInterval,
                        storageSpec: {
                            volumeClaimTemplate: {
                                spec: {
                                    accessModes: ["ReadWriteOnce"],
                                    resources: {
                                        requests: {
                                            storage: prometheusConfig.storageSize,
                                        },
                                    },
                                },
                            },
                        },
                        externalLabels: {
                            environment: env,
                        },
                        // Resource limits for Prometheus container (required by ResourceQuota)
                        resources: prometheusConfig.resources,
                    },
                },
                // Prometheus Operator resource limits (required by ResourceQuota)
                prometheusOperator: {
                    resources: prometheusConfig.operator.resources,
                    // Resource limits for config-reloader sidecar (required by ResourceQuota)
                    prometheusConfigReloader: {
                        resources: prometheusConfig.operator.configReloader,
                    },
                    // Disable TLS/admission webhooks to work around Helm Chart v4 limitation
                    // Pulumi Helm Chart v4 doesn't support Helm hooks, so webhook cert Jobs never run
                    // Bug: Volume mount controlled by tls.enabled, not admissionWebhooks.enabled
                    tls: {
                        enabled: false,
                    },
                    admissionWebhooks: {
                        enabled: false,
                    },
                },
                // Node exporter resource limits (required by ResourceQuota)
                "prometheus-node-exporter": {
                    resources: prometheusConfig.nodeExporter.resources,
                },
                // kube-state-metrics resource limits (required by ResourceQuota)
                "kube-state-metrics": {
                    enabled: true,
                    resources: prometheusConfig.kubeStateMetrics.resources,
                },
                // Disable Grafana (we manage it separately)
                grafana: {
                    enabled: false,
                },
                // Disable Alertmanager (using Grafana Unified Alerting instead)
                alertmanager: {
                    enabled: false,
                },
            },
        },
        [monitoringNamespace.namespace]
    );

    // Read dashboard files from disk
    const dashboardDir = path.join(process.cwd(), "dashboards");
    const dashboardData: Record<string, string> = {};

    if (fs.existsSync(dashboardDir)) {
        const files = fs.readdirSync(dashboardDir);
        files.forEach((filename) => {
            if (path.extname(filename) === ".json") {
                const filePath = path.join(dashboardDir, filename);
                dashboardData[filename] = fs.readFileSync(filePath, "utf-8");
            }
        });
    }

    // Create dashboard ConfigMaps
    const dashboards = createDashboards({
        namespace: "monitoring",
        dashboards: dashboardData,
        provider,
    });

    // Define application-specific alert rules
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
                environment: env,
            },
            annotations: {
                summary: "High CPU usage detected",
                description:
                    "Container {{ $labels.container }} in pod {{ $labels.pod }} has CPU usage above 80% (current: {{ humanizePercentage $values.B.Value }})",
            },
        },
        {
            uid: "high_memory_usage",
            title: "High Memory Usage",
            expr: 'sum by (pod, namespace) (container_memory_working_set_bytes) / sum by (pod, namespace) (kube_pod_container_resource_limits{resource="memory"} > 0)',
            threshold: "> 0.9",
            reduceFunction: "last",
            for: "10m",
            labels: {
                severity: "critical",
                environment: env,
            },
            annotations: {
                summary: "High memory usage detected",
                description:
                    "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has memory usage above 90% (current: {{ humanizePercentage $values.B.Value }})",
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
                environment: env,
            },
            annotations: {
                summary: "High API latency detected",
                description:
                    "API P95 latency is above 1 second (current: {{ humanizeDuration $values.B.Value }})",
            },
        },
        {
            uid: "high_api_4xx_rate",
            title: "High API 4xx Rate",
            expr: '(sum(rate(app_http_requests_total{job="api",status=~"4.."}[5m])) or vector(0)) / sum(rate(app_http_requests_total{job="api"}[5m]))',
            threshold: "> 0.1",
            reduceFunction: "last",
            for: "5m",
            labels: {
                severity: "warning",
                environment: env,
            },
            annotations: {
                summary: "High API 4xx rate detected",
                description:
                    "API 4xx error rate is above 10% (current: {{ humanizePercentage $values.B.Value }})",
            },
        },
        {
            uid: "high_api_5xx_rate",
            title: "High API 5xx Rate",
            expr: '(sum(rate(app_http_requests_total{job="api",status=~"5.."}[5m])) or vector(0)) / sum(rate(app_http_requests_total{job="api"}[5m]))',
            threshold: "> 0.05",
            reduceFunction: "last",
            for: "5m",
            labels: {
                severity: "critical",
                environment: env,
            },
            annotations: {
                summary: "High API 5xx rate detected",
                description:
                    "API 5xx error rate is above 5% (current: {{ humanizePercentage $values.B.Value }})",
            },
        },
        {
            uid: "pod_crash_looping",
            title: "Pod Crash Looping",
            expr: 'sum(kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"}) or vector(0)',
            threshold: "> 0",
            reduceFunction: "last",
            for: "5m",
            labels: {
                severity: "critical",
                environment: env,
            },
            annotations: {
                summary: "Pod is crash looping",
                description: "{{ humanize $values.B.Value }} pod(s) are in CrashLoopBackOff state",
            },
        },
        {
            uid: "pod_failed",
            title: "Pod Failed",
            expr: 'sum(kube_pod_status_phase{phase="Failed"} > 0) or vector(0)',
            threshold: "> 0",
            reduceFunction: "last",
            for: "5m",
            labels: {
                severity: "critical",
                environment: env,
            },
            annotations: {
                summary: "Pod has failed",
                description: "{{ humanize $values.B.Value }} pod(s) have failed",
            },
        },
    ];

    // Create Grafana Unified Alerting provisioning ConfigMaps
    // Environment-specific contact point configuration
    // Production: email contact point for real alerts
    // Preview/Local: use Grafana's default contact point (won't send without SMTP)
    const contactPoints =
        env === "production" && grafanaConfig.alertEmail
            ? [
                  {
                      name: "email-admin",
                      receivers: [
                          {
                              uid: "email-admin",
                              type: "email",
                              settings: {
                                  addresses: grafanaConfig.alertEmail,
                                  singleEmail: true,
                                  subject:
                                      '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.environment }} {{ (index .Alerts 0).Annotations.summary }}',
                              },
                              disableResolveMessage: false,
                          },
                      ],
                  },
              ]
            : [
                  {
                      name: "local-notifications",
                      receivers: [
                          {
                              uid: "local-notifications",
                              type: "email",
                              settings: {
                                  addresses: "devnull@localhost",
                              },
                              disableResolveMessage: true,
                          },
                      ],
                  },
              ];

    const alerts = createGrafanaAlerts({
        namespace: "monitoring",
        environment: env,
        alertRules,
        contactPoints,
        defaultReceiver: grafanaConfig.defaultReceiver,
        provider,
    });

    const grafana = createGrafana({
        replicas: grafanaConfig.replicas,
        resources: grafanaConfig.resources,
        namespace: "monitoring",
        // kube-prometheus-stack creates Prometheus with name kube-prometheus-stack-prometheus
        prometheusUrl: "http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090",
        storageSize: grafanaConfig.storageSize,
        domain: grafanaConfig.hostname,
        imageVersion: grafanaConfig.version,
        githubAuth: grafanaConfig.githubClientId
            ? {
                  clientId: pulumi.secret(grafanaConfig.githubClientId),
                  clientSecret: pulumi.secret(grafanaConfig.githubClientSecret),
                  organization: grafanaConfig.githubOrg,
                  adminUser: grafanaConfig.adminUser,
              }
            : undefined,
        smtp: grafanaConfig.smtpHost
            ? {
                  host: pulumi.secret(grafanaConfig.smtpHost),
                  port: grafanaConfig.smtpPort!,
                  user: pulumi.secret(grafanaConfig.smtpUser!),
                  password: pulumi.secret(grafanaConfig.smtpPassword!),
                  fromAddress: grafanaConfig.smtpFromAddress!,
              }
            : undefined,
        basicAuth: grafanaConfig.basicAuth
            ? {
                  username: pulumi.secret(grafanaConfig.basicAuth.user),
                  password: pulumi.secret(grafanaConfig.basicAuth.password),
              }
            : undefined,
        dashboardsConfigMap: dashboards.configMap,
        alertRulesConfigMap: alerts.alertRulesConfigMap,
        contactPointsConfigMap: alerts.contactPointsConfigMap,
        notificationPoliciesConfigMap: alerts.notificationPoliciesConfigMap,
        provider,
    });

    const grafanaIngress = createGrafanaIngress({
        namespace: "monitoring",
        serviceName: "grafana",
        servicePort: 80,
        gatewayName: "nginx-gateway",
        gatewayNamespace: "nginx-gateway",
        hostname: grafanaConfig.hostname,
        // Preview: pr-grafana.aphiria.com uses https-root (exact match)
        // Production: grafana.aphiria.com uses https-subdomains (*.aphiria.com wildcard)
        /* istanbul ignore next - sectionName varies by environment (preview vs production) */
        sectionName: grafanaConfig.ingressSectionName,
        provider,
    });

    return {
        namespace: monitoringNamespace,
        kubePrometheusStack,
        grafana,
        grafanaIngress,
    };
}
