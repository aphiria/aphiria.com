import * as k8s from "@pulumi/kubernetes";
import { PrometheusArgs, PrometheusResult } from "../types";
import { buildLabels } from "../labels";

/** Creates Prometheus StatefulSet with PersistentVolumeClaim for metrics storage */
export function createPrometheus(args: PrometheusArgs): PrometheusResult {
    const labels = buildLabels("prometheus", "monitoring", args.labels);
    const scrapeInterval = args.scrapeInterval || "15s";

    // Create ServiceAccount for Prometheus
    const serviceAccount = new k8s.core.v1.ServiceAccount(
        "prometheus",
        {
            metadata: {
                name: "prometheus",
                namespace: args.namespace,
                labels,
            },
        },
        { provider: args.provider }
    );

    // Create ClusterRole for Prometheus (read-only access to cluster resources)
    const clusterRole = new k8s.rbac.v1.ClusterRole(
        "prometheus",
        {
            metadata: {
                name: "prometheus",
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

    // Create ClusterRoleBinding to bind ClusterRole to ServiceAccount
    const clusterRoleBinding = new k8s.rbac.v1.ClusterRoleBinding(
        "prometheus",
        {
            metadata: {
                name: "prometheus",
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
  evaluation_interval: ${scrapeInterval}
  external_labels:
    environment: ${args.env}

scrape_configs:
  # Scrape Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Kubernetes API server
  - job_name: 'kubernetes-apiservers'
    kubernetes_sd_configs:
      - role: endpoints
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https

  # Kubernetes nodes
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

  # Kubernetes pods
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\\d+)?;(\\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: kubernetes_pod_name

  # Kubernetes services
  - job_name: 'kubernetes-services'
    kubernetes_sd_configs:
      - role: service
    metrics_path: /probe
    params:
      module: [http_2xx]
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_probe]
        action: keep
        regex: true
      - source_labels: [__address__]
        target_label: __param_target
      - target_label: __address__
        replacement: blackbox-exporter.monitoring.svc.cluster.local:9115
      - source_labels: [__param_target]
        target_label: instance
      - action: labelmap
        regex: __meta_kubernetes_service_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_service_name]
        target_label: kubernetes_service_name
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
                replicas: 1,
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
                        serviceAccountName: "prometheus",
                        // Security context to ensure Prometheus can write to persistent volume
                        // Matches official prometheus-community/prometheus Helm chart defaults
                        // See: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus/values.yaml
                        securityContext: {
                            runAsUser: 65534, // Run as 'nobody' user
                            runAsNonRoot: true, // Prevent running as root
                            runAsGroup: 65534, // Run as 'nobody' group
                            fsGroup: 65534, // Set volume ownership to GID 65534
                        },
                        containers: [
                            {
                                name: "prometheus",
                                image: "prom/prometheus:v2.53.0",
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
                                resources: {
                                    requests: {
                                        cpu: "250m",
                                        memory: "512Mi",
                                    },
                                    limits: {
                                        cpu: "500m",
                                        memory: "1Gi",
                                    },
                                },
                                livenessProbe: {
                                    httpGet: {
                                        path: "/-/healthy",
                                        port: "http",
                                    },
                                    initialDelaySeconds: 30,
                                    periodSeconds: 10,
                                },
                                readinessProbe: {
                                    httpGet: {
                                        path: "/-/ready",
                                        port: "http",
                                    },
                                    initialDelaySeconds: 5,
                                    periodSeconds: 5,
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
        { provider: args.provider, dependsOn: [serviceAccount, configMap, pvc] }
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
        serviceAccount: serviceAccount.metadata,
        clusterRole: clusterRole.metadata,
        clusterRoleBinding: clusterRoleBinding.metadata,
        statefulSet: statefulSet.metadata,
        service: service.metadata,
        pvc: pvc.metadata,
        configMap: configMap.metadata,
    };
}
