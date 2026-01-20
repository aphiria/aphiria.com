import { ResourceRequirements } from "./config";

/**
 * Prometheus Operator configuration
 */
export interface PrometheusOperatorConfig {
    resources: ResourceRequirements;
    configReloader: ResourceRequirements;
}

/**
 * Node exporter configuration
 */
export interface NodeExporterConfig {
    resources: ResourceRequirements;
}

/**
 * kube-state-metrics configuration
 */
export interface KubeStateMetricsConfig {
    resources: ResourceRequirements;
}

/**
 * Prometheus configuration
 */
export interface PrometheusConfig {
    scrapeInterval: string;
    authToken: string; // Secret - wrap with pulumi.secret()
    storageSize: string;
    retentionTime: string;
    resources: ResourceRequirements;
    operator: PrometheusOperatorConfig;
    nodeExporter: NodeExporterConfig;
    kubeStateMetrics: KubeStateMetricsConfig;
}

/**
 * Grafana basic auth configuration (preview only)
 */
export interface GrafanaBasicAuthConfig {
    user: string; // Secret - wrap with pulumi.secret()
    password: string; // Secret - wrap with pulumi.secret()
}

/**
 * Grafana GitHub OAuth configuration
 */
export interface GrafanaGitHubConfig {
    org: string;
    clientId: string;
    clientSecret: string; // Secret - wrap with pulumi.secret()
}

/**
 * Grafana SMTP configuration for email notifications
 */
export interface GrafanaSmtpConfig {
    host: string; // Secret - wrap with pulumi.secret()
    port: number;
    user: string; // Secret - wrap with pulumi.secret()
    password: string; // Secret - wrap with pulumi.secret()
    fromAddress: string;
}

/**
 * Grafana configuration
 */
export interface GrafanaConfig {
    version: string;
    defaultReceiver: string;
    ingressSectionName: string;
    github: GrafanaGitHubConfig;
    adminUser: string;
    smtp?: GrafanaSmtpConfig; // Optional - preview doesn't have
    alertEmail?: string; // Optional - preview doesn't have (requires SMTP)
    basicAuth?: GrafanaBasicAuthConfig; // Optional - preview only
    storageSize: string;
    hostname: string;
    replicas: number;
    resources: ResourceRequirements;
}
