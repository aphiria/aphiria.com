import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as path from "path";
import { Environment } from "../types";
import { installKubePrometheusStack, createNamespace } from "../../../components";
import { createGrafana, GrafanaResult } from "../../../components/grafana";
import { createGrafanaIngress, GrafanaIngressResult } from "../../../components/grafana-ingress";
import { createGrafanaAlerts } from "../../../components/grafana-alerts";
import { createDashboards } from "../../../components/dashboards";
import { NamespaceResult } from "../../../components/types";

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
 * @param args Monitoring resources configuration
 * @returns Monitoring resources
 */
export function createMonitoringResources(args: MonitoringResourcesArgs): MonitoringResources {
    const { env, provider } = args;

    // Read configuration
    const monitoringConfig = new pulumi.Config("monitoring");
    const prometheusConfig = new pulumi.Config("prometheus");
    const grafanaConfig = new pulumi.Config("grafana");

    // Create monitoring namespace with ResourceQuota
    const monitoringNamespace = createNamespace({
        name: "monitoring",
        environmentLabel: env,
        resourceQuota: monitoringConfig.requireObject("namespace:resourceQuota"),
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
                        retention: prometheusConfig.require("retentionTime"),
                        scrapeInterval: prometheusConfig.require("scrapeInterval"),
                        storageSpec: {
                            volumeClaimTemplate: {
                                spec: {
                                    accessModes: ["ReadWriteOnce"],
                                    resources: {
                                        requests: {
                                            storage: prometheusConfig.require("storageSize"),
                                        },
                                    },
                                },
                            },
                        },
                        externalLabels: {
                            environment: env,
                        },
                        // Resource limits for Prometheus container (required by ResourceQuota)
                        resources: prometheusConfig.requireObject("resources"),
                    },
                },
                // Prometheus Operator resource limits (required by ResourceQuota)
                prometheusOperator: {
                    resources: prometheusConfig.requireObject("operator:resources"),
                    // Resource limits for config-reloader sidecar (required by ResourceQuota)
                    prometheusConfigReloader: {
                        resources: prometheusConfig.requireObject("operator:configReloader"),
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
                    resources: prometheusConfig.requireObject("nodeExporter:resources"),
                },
                // kube-state-metrics resource limits (required by ResourceQuota)
                "kube-state-metrics": {
                    enabled: true,
                    resources: prometheusConfig.requireObject("kubeStateMetrics:resources"),
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

    // Create dashboard ConfigMaps
    const dashboards = createDashboards({
        namespace: "monitoring",
        // Use process.cwd() which is the pulumi project root (infrastructure/pulumi)
        dashboardDir: path.join(process.cwd(), "dashboards"),
        provider,
    });

    // Create Grafana Unified Alerting provisioning ConfigMaps
    // Environment-specific contact point configuration
    // Production: email contact point for real alerts
    // Preview/Local: use Grafana's default contact point (won't send without SMTP)
    const contactPoints =
        env === "production"
            ? [
                  {
                      name: "email-admin",
                      receivers: [
                          {
                              uid: "email-admin",
                              type: "email",
                              settings: {
                                  addresses: grafanaConfig.require("alertEmail"),
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
        contactPoints,
        defaultReceiver: grafanaConfig.require("defaultReceiver"),
        provider,
    });

    const grafana = createGrafana({
        replicas: grafanaConfig.requireNumber("replicas"),
        resources: grafanaConfig.requireObject("resources"),
        namespace: "monitoring",
        // kube-prometheus-stack creates Prometheus with name kube-prometheus-stack-prometheus
        prometheusUrl: "http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090",
        storageSize: grafanaConfig.require("storageSize"),
        domain: grafanaConfig.require("hostname"),
        imageVersion: grafanaConfig.require("version"),
        githubAuth: grafanaConfig.get("githubClientId")
            ? {
                  clientId: grafanaConfig.requireSecret("githubClientId"),
                  clientSecret: grafanaConfig.requireSecret("githubClientSecret"),
                  organization: grafanaConfig.require("githubOrg"),
                  adminUser: grafanaConfig.require("adminUser"),
              }
            : undefined,
        smtp: grafanaConfig.getSecret("smtpHost")
            ? {
                  host: grafanaConfig.requireSecret("smtpHost"),
                  port: grafanaConfig.requireNumber("smtpPort"),
                  user: grafanaConfig.requireSecret("smtpUser"),
                  password: grafanaConfig.requireSecret("smtpPassword"),
                  fromAddress: grafanaConfig.require("smtpFromAddress"),
              }
            : undefined,
        basicAuth: grafanaConfig.getSecret("basicAuthUser")
            ? {
                  username: grafanaConfig.requireSecret("basicAuthUser"),
                  password: grafanaConfig.requireSecret("basicAuthPassword"),
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
        hostname: grafanaConfig.require("hostname"),
        // Preview: pr-grafana.aphiria.com uses https-root (exact match)
        // Production: grafana.aphiria.com uses https-subdomains (*.aphiria.com wildcard)
        /* istanbul ignore next - sectionName varies by environment (preview vs production) */
        sectionName: grafanaConfig.require("ingressSectionName"),
        provider,
    });

    return {
        namespace: monitoringNamespace,
        kubePrometheusStack,
        grafana,
        grafanaIngress,
    };
}
