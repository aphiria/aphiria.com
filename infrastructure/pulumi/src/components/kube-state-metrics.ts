import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { KubeStateMetricsResult } from "./types";
import { buildLabels } from "./labels";

/**
 * Arguments for kube-state-metrics component
 */
export interface KubeStateMetricsArgs {
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Creates kube-state-metrics Deployment and Service
 *
 * kube-state-metrics is a service that listens to the Kubernetes API server
 * and generates metrics about the state of objects (Deployments, Nodes, Pods, etc.)
 * These metrics are consumed by Prometheus and used in Grafana dashboards.
 */
export function createKubeStateMetrics(args: KubeStateMetricsArgs): KubeStateMetricsResult {
    const labels = buildLabels("kube-state-metrics", "monitoring", args.labels);

    // Create ServiceAccount for kube-state-metrics
    const serviceAccount = new k8s.core.v1.ServiceAccount(
        "kube-state-metrics",
        {
            metadata: {
                name: "kube-state-metrics",
                namespace: args.namespace,
                labels,
            },
        },
        { provider: args.provider }
    );

    // Create ClusterRole with permissions to read cluster resources
    const clusterRole = new k8s.rbac.v1.ClusterRole(
        "kube-state-metrics",
        {
            metadata: {
                name: "kube-state-metrics",
                labels,
            },
            rules: [
                {
                    apiGroups: [""],
                    resources: [
                        "configmaps",
                        "secrets",
                        "nodes",
                        "pods",
                        "services",
                        "serviceaccounts",
                        "resourcequotas",
                        "replicationcontrollers",
                        "limitranges",
                        "persistentvolumeclaims",
                        "persistentvolumes",
                        "namespaces",
                        "endpoints",
                    ],
                    verbs: ["list", "watch"],
                },
                {
                    apiGroups: ["apps"],
                    resources: ["statefulsets", "daemonsets", "deployments", "replicasets"],
                    verbs: ["list", "watch"],
                },
                {
                    apiGroups: ["batch"],
                    resources: ["cronjobs", "jobs"],
                    verbs: ["list", "watch"],
                },
                {
                    apiGroups: ["autoscaling"],
                    resources: ["horizontalpodautoscalers"],
                    verbs: ["list", "watch"],
                },
                {
                    apiGroups: ["policy"],
                    resources: ["poddisruptionbudgets"],
                    verbs: ["list", "watch"],
                },
                {
                    apiGroups: ["certificates.k8s.io"],
                    resources: ["certificatesigningrequests"],
                    verbs: ["list", "watch"],
                },
                {
                    apiGroups: ["storage.k8s.io"],
                    resources: ["storageclasses", "volumeattachments"],
                    verbs: ["list", "watch"],
                },
                {
                    apiGroups: ["admissionregistration.k8s.io"],
                    resources: ["mutatingwebhookconfigurations", "validatingwebhookconfigurations"],
                    verbs: ["list", "watch"],
                },
                {
                    apiGroups: ["networking.k8s.io"],
                    resources: ["networkpolicies", "ingresses"],
                    verbs: ["list", "watch"],
                },
                {
                    apiGroups: ["coordination.k8s.io"],
                    resources: ["leases"],
                    verbs: ["list", "watch"],
                },
            ],
        },
        { provider: args.provider }
    );

    // Create ClusterRoleBinding
    const clusterRoleBinding = new k8s.rbac.v1.ClusterRoleBinding(
        "kube-state-metrics",
        {
            metadata: {
                name: "kube-state-metrics",
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

    // Create Deployment
    const deployment = new k8s.apps.v1.Deployment(
        "kube-state-metrics",
        {
            metadata: {
                name: "kube-state-metrics",
                namespace: args.namespace,
                labels,
            },
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: {
                        app: "kube-state-metrics",
                    },
                },
                template: {
                    metadata: {
                        labels: {
                            app: "kube-state-metrics",
                            "app.kubernetes.io/name": "kube-state-metrics",
                            "app.kubernetes.io/component": "monitoring",
                        },
                        annotations: {
                            "prometheus.io/scrape": "true",
                            "prometheus.io/port": "8080",
                        },
                    },
                    spec: {
                        serviceAccountName: serviceAccount.metadata.name,
                        securityContext: {
                            runAsNonRoot: true,
                            runAsUser: 65534,
                            fsGroup: 65534,
                        },
                        containers: [
                            {
                                name: "kube-state-metrics",
                                image: "registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.13.0",
                                ports: [
                                    {
                                        name: "http-metrics",
                                        containerPort: 8080,
                                        protocol: "TCP",
                                    },
                                    {
                                        name: "telemetry",
                                        containerPort: 8081,
                                        protocol: "TCP",
                                    },
                                ],
                                livenessProbe: {
                                    httpGet: {
                                        path: "/healthz",
                                        port: "http-metrics",
                                    },
                                    initialDelaySeconds: 5,
                                    periodSeconds: 10,
                                },
                                readinessProbe: {
                                    httpGet: {
                                        path: "/",
                                        port: "telemetry",
                                    },
                                    initialDelaySeconds: 5,
                                    periodSeconds: 10,
                                },
                                resources: {
                                    requests: {
                                        cpu: "100m",
                                        memory: "128Mi",
                                    },
                                    limits: {
                                        cpu: "200m",
                                        memory: "256Mi",
                                    },
                                },
                            },
                        ],
                    },
                },
            },
        },
        { provider: args.provider, dependsOn: [serviceAccount, clusterRoleBinding] }
    );

    // Create Service
    const service = new k8s.core.v1.Service(
        "kube-state-metrics",
        {
            metadata: {
                name: "kube-state-metrics",
                namespace: args.namespace,
                labels,
                annotations: {
                    "prometheus.io/scrape": "true",
                    "prometheus.io/port": "8080",
                },
            },
            spec: {
                type: "ClusterIP",
                selector: {
                    app: "kube-state-metrics",
                },
                ports: [
                    {
                        name: "http-metrics",
                        port: 8080,
                        targetPort: "http-metrics",
                        protocol: "TCP",
                    },
                    {
                        name: "telemetry",
                        port: 8081,
                        targetPort: "telemetry",
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
        deployment: deployment.metadata,
        service: service.metadata,
    };
}
