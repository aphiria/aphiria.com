/**
 * Prometheus Component
 * Pure function that accepts ALL configuration as parameters
 */

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { ResourceRequirements } from "./types";
import { buildLabels } from "./labels";

/**
 * Prometheus scrape configuration
 */
export interface PrometheusScrapeConfig {
    job_name: string;
    scrape_interval?: string;
    scrape_timeout?: string;
    metrics_path?: string;
    scheme?: 'http' | 'https';
    static_configs?: Array<{
        targets: string[];
        labels?: Record<string, string>;
    }>;
    kubernetes_sd_configs?: Array<{
        role: 'endpoints' | 'service' | 'pod' | 'node' | 'ingress';
        namespaces?: {
            names?: string[];
        };
    }>;
    relabel_configs?: Array<{
        source_labels?: string[];
        separator?: string;
        target_label?: string;
        regex?: string;
        replacement?: string;
        action?: 'replace' | 'keep' | 'drop' | 'labelmap' | 'labeldrop' | 'labelkeep';
    }>;
}

/**
 * Prometheus rule configuration
 */
export interface PrometheusRule {
    alert: string;
    expr: string;
    for?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
}

/**
 * RBAC configuration for Prometheus
 */
export interface PrometheusRBACConfig {
    /** Service account name */
    serviceAccountName: string;
    /** Service account annotations (optional) */
    serviceAccountAnnotations?: Record<string, string>;
    /** Cluster role name */
    clusterRoleName: string;
}

/**
 * Arguments for Prometheus component
 */
export interface PrometheusArgs {
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Number of replicas */
    replicas: number;
    /** Container resource requirements */
    resources: ResourceRequirements;
    /** Metrics retention period (e.g., "7d") */
    retentionTime: string;
    /** Default scrape interval (e.g., "30s") */
    scrapeInterval: string;
    /** Default evaluation interval for rules (e.g., "30s") */
    evaluationInterval: string;
    /** Storage size for metrics (e.g., "10Gi") */
    storageSize: string;
    /** Storage class name (optional) */
    storageClassName?: string;
    /** Prometheus image version */
    imageVersion: string;
    /** Environment label for external_labels */
    environment: string;
    /** Scrape configurations */
    scrapeConfigs: PrometheusScrapeConfig[];
    /** Alert rules */
    rules: PrometheusRule[];
    /** RBAC configuration */
    rbac: PrometheusRBACConfig;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

export interface PrometheusResult {
    statefulSet: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    pvc: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    configMap: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    serviceAccount: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    clusterRole: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    clusterRoleBinding: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Creates Prometheus deployment as a pure function
 */
export function createPrometheus(args: PrometheusArgs): PrometheusResult {
    const labels = buildLabels("prometheus", "monitoring", args.labels);
    const scrapeInterval = args.scrapeInterval;
    const evaluationInterval = args.evaluationInterval;

    // Create ServiceAccount for Prometheus
    const serviceAccount = new k8s.core.v1.ServiceAccount(
        "prometheus",
        {
            metadata: {
                name: args.rbac.serviceAccountName,
                namespace: args.namespace,
                labels,
                annotations: args.rbac.serviceAccountAnnotations,
            },
        },
        { provider: args.provider }
    );

    // Create ClusterRole with standard Prometheus permissions
    const clusterRole = new k8s.rbac.v1.ClusterRole(
        "prometheus",
        {
            metadata: {
                name: args.rbac.clusterRoleName,
                labels,
            },
            rules: [
                {
                    apiGroups: [""],
                    resources: ["nodes", "nodes/proxy", "services", "endpoints", "pods"],
                    verbs: ["get", "list", "watch"],
                },
                {
                    apiGroups: ["extensions"],
                    resources: ["ingresses"],
                    verbs: ["get", "list", "watch"],
                },
                {
                    apiGroups: [""],
                    resources: ["configmaps"],
                    verbs: ["get"],
                },
            ],
        },
        { provider: args.provider }
    );

    // Create ClusterRoleBinding
    const clusterRoleBinding = new k8s.rbac.v1.ClusterRoleBinding(
        "prometheus",
        {
            metadata: {
                name: args.rbac.clusterRoleName,
                labels,
            },
            roleRef: {
                apiGroup: "rbac.authorization.k8s.io",
                kind: "ClusterRole",
                name: clusterRole.metadata.name,
            },
            subjects: [
                {
                    kind: "ServiceAccount",
                    name: serviceAccount.metadata.name,
                    namespace: args.namespace,
                },
            ],
        },
        { provider: args.provider, dependsOn: [clusterRole, serviceAccount] }
    );

    // Build scrape configs from provided configuration
    const scrapeConfigs = args.scrapeConfigs.map(config => {
        const yamlConfig: any = {
            job_name: config.job_name,
        };

        if (config.scrape_interval) yamlConfig.scrape_interval = config.scrape_interval;
        if (config.scrape_timeout) yamlConfig.scrape_timeout = config.scrape_timeout;
        if (config.metrics_path) yamlConfig.metrics_path = config.metrics_path;
        if (config.scheme) yamlConfig.scheme = config.scheme;
        if (config.static_configs) yamlConfig.static_configs = config.static_configs;
        if (config.kubernetes_sd_configs) yamlConfig.kubernetes_sd_configs = config.kubernetes_sd_configs;
        if (config.relabel_configs) yamlConfig.relabel_configs = config.relabel_configs;

        return yamlConfig;
    });

    // Create ConfigMap for Prometheus configuration
    const configMap = new k8s.core.v1.ConfigMap(
        "prometheus-config",
        {
            metadata: {
                name: "prometheus-config",
                namespace: args.namespace,
                labels,
            },
            data: {
                "prometheus.yml": `global:
  scrape_interval: ${scrapeInterval}
  evaluation_interval: ${evaluationInterval}
  external_labels:
    environment: ${args.environment}

scrape_configs:
${scrapeConfigs.map(config => {
    // Convert each scrape config to YAML format
    const lines: string[] = [`  - job_name: '${config.job_name}'`];

    Object.entries(config).forEach(([key, value]) => {
        if (key === 'job_name') return;

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            lines.push(`    ${key}: ${value}`);
        } else if (Array.isArray(value)) {
            lines.push(`    ${key}:`);
            value.forEach(item => {
                if (typeof item === 'object') {
                    lines.push(`      - ${JSON.stringify(item).replace(/"/g, '').replace(/:/g, ': ').replace(/,/g, '\n        ')}`);
                } else {
                    lines.push(`      - ${item}`);
                }
            });
        } else if (typeof value === 'object' && value !== null) {
            lines.push(`    ${key}:`);
            Object.entries(value).forEach(([k, v]) => {
                lines.push(`      ${k}: ${v}`);
            });
        }
    });

    return lines.join('\n');
}).join('\n\n')}
`,
            },
        },
        { provider: args.provider }
    );

    // Create PersistentVolumeClaim for metrics storage
    const pvc = new k8s.core.v1.PersistentVolumeClaim(
        "prometheus-pvc",
        {
            metadata: {
                name: "prometheus-pvc",
                namespace: args.namespace,
                labels,
            },
            spec: {
                accessModes: ["ReadWriteOnce"],
                storageClassName: args.storageClassName,
                resources: {
                    requests: {
                        storage: args.storageSize,
                    },
                },
            },
        },
        { provider: args.provider }
    );

    // Create StatefulSet for Prometheus
    const statefulSet = new k8s.apps.v1.StatefulSet(
        "prometheus",
        {
            metadata: {
                name: "prometheus",
                namespace: args.namespace,
                labels,
            },
            spec: {
                serviceName: "prometheus",
                replicas: args.replicas,
                selector: {
                    matchLabels: {
                        app: "prometheus",
                    },
                },
                template: {
                    metadata: {
                        labels: {
                            app: "prometheus",
                            "app.kubernetes.io/name": "prometheus",
                            "app.kubernetes.io/component": "monitoring",
                        },
                    },
                    spec: {
                        serviceAccountName: serviceAccount.metadata.name,
                        // Security context to ensure Prometheus can write to persistent volume
                        securityContext: {
                            runAsUser: 65534, // Run as 'nobody' user
                            runAsNonRoot: true,
                            runAsGroup: 65534,
                            fsGroup: 65534,
                        },
                        containers: [
                            {
                                name: "prometheus",
                                image: `prom/prometheus:${args.imageVersion}`,
                                args: [
                                    `--config.file=/etc/prometheus/prometheus.yml`,
                                    `--storage.tsdb.path=/prometheus`,
                                    `--storage.tsdb.retention.time=${args.retentionTime}`,
                                    `--web.console.libraries=/usr/share/prometheus/console_libraries`,
                                    `--web.console.templates=/usr/share/prometheus/consoles`,
                                ],
                                ports: [
                                    {
                                        name: "http",
                                        containerPort: 9090,
                                        protocol: "TCP",
                                    },
                                ],
                                volumeMounts: [
                                    {
                                        name: "config",
                                        mountPath: "/etc/prometheus",
                                    },
                                    {
                                        name: "storage",
                                        mountPath: "/prometheus",
                                    },
                                ],
                                resources: args.resources,
                                livenessProbe: {
                                    httpGet: {
                                        path: "/-/healthy",
                                        port: "http",
                                    },
                                    initialDelaySeconds: 30,
                                    periodSeconds: 10,
                                    timeoutSeconds: 5,
                                },
                                readinessProbe: {
                                    httpGet: {
                                        path: "/-/ready",
                                        port: "http",
                                    },
                                    initialDelaySeconds: 10,
                                    periodSeconds: 5,
                                    timeoutSeconds: 3,
                                },
                            },
                        ],
                        volumes: [
                            {
                                name: "config",
                                configMap: {
                                    name: configMap.metadata.name,
                                },
                            },
                            {
                                name: "storage",
                                persistentVolumeClaim: {
                                    claimName: pvc.metadata.name,
                                },
                            },
                        ],
                    },
                },
            },
        },
        { provider: args.provider, dependsOn: [configMap, pvc, serviceAccount] }
    );

    // Create Service for Prometheus
    const service = new k8s.core.v1.Service(
        "prometheus",
        {
            metadata: {
                name: "prometheus",
                namespace: args.namespace,
                labels,
            },
            spec: {
                type: "ClusterIP",
                selector: {
                    app: "prometheus",
                },
                ports: [
                    {
                        name: "http",
                        port: 9090,
                        targetPort: "http",
                        protocol: "TCP",
                    },
                ],
            },
        },
        { provider: args.provider }
    );

    return {
        statefulSet: statefulSet.metadata,
        service: service.metadata,
        pvc: pvc.metadata,
        configMap: configMap.metadata,
        serviceAccount: serviceAccount.metadata,
        clusterRole: clusterRole.metadata,
        clusterRoleBinding: clusterRoleBinding.metadata,
    };
}
