import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as digitalocean from "@pulumi/digitalocean";

/**
 * Environment type for stack configuration
 */
export type Environment = "local" | "preview" | "production";

/**
 * PodDisruptionBudget configuration for high availability
 * Ensures minimum pod availability during voluntary disruptions (node drains, upgrades)
 */
export interface PodDisruptionBudgetConfig {
    /** Minimum number of pods that must be available (e.g., 1) */
    minAvailable?: number;
    /** Maximum number of pods that can be unavailable (e.g., 1) */
    maxUnavailable?: number;
}

/**
 * Common arguments shared across all deployment components
 */
export interface CommonDeploymentArgs {
    /** Environment this deployment targets */
    env: Environment;
    /** Kubernetes namespace to deploy into */
    namespace: pulumi.Input<string>;
    /** Resource labels for Kubernetes resources */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

// Component-specific Args have been moved to their respective component files.
// Only shared types remain in this file.

/**
 * Arguments for Helm chart component
 */
export interface HelmChartArgs {
    /** Environment this chart targets */
    env: Environment;
    /** Chart name */
    chartName: string;
    /** Chart repository URL or OCI registry */
    repository: string;
    /** Chart version */
    version: string;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Helm values */
    values?: Record<string, unknown>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Return type for namespace component
 */
export interface NamespaceResult {
    namespace: k8s.core.v1.Namespace;
    resourceQuota?: k8s.core.v1.ResourceQuota;
    networkPolicy?: k8s.networking.v1.NetworkPolicy;
    imagePullSecret?: k8s.core.v1.Secret;
}

/**
 * Return type for web deployment component
 */
export interface WebDeploymentResult {
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    configMap: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    podDisruptionBudget?: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Return type for API deployment component
 */
export interface APIDeploymentResult {
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    secret: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    podDisruptionBudget?: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Return type for PostgreSQL component
 */
export interface PostgreSQLResult {
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    pvc?: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>; // Only present if persistentStorage=true
}

/**
 * Return type for Gateway component
 */
export interface GatewayResult {
    name: pulumi.Output<string>;
    namespace: pulumi.Output<string>;
    urn: pulumi.Output<string>;
    certificate?: pulumi.Output<string>; // Only present for non-self-signed
    ip?: pulumi.Output<string>; // LoadBalancer IP (populated by factory after gateway creation)
    dnsRecords?: digitalocean.DnsRecord[]; // DNS records pointing to gateway IP (populated by factory if configured)
}

/**
 * Arguments for Kubernetes cluster component
 */
export interface KubernetesClusterArgs {
    /** Cluster name */
    name: string;
    /** DigitalOcean region (default: nyc1) */
    region?: string;
    /** Kubernetes version (default: 1.34.1-do.0) */
    version?: string;
    /** Enable automatic Kubernetes version upgrades */
    autoUpgrade?: boolean;
    /** Enable surge upgrades (more aggressive) */
    surgeUpgrade?: boolean;
    /** Enable high availability control plane */
    ha?: boolean;
    /** VPC UUID to attach cluster to */
    vpcUuid?: string;
    /** Node pool machine size (default: s-2vcpu-4gb) */
    nodeSize?: string;
    /** Initial node count (default: 2) */
    nodeCount?: number;
    /** Enable auto-scaling (default: true) */
    autoScale?: boolean;
    /** Minimum nodes when auto-scaling (default: 1) */
    minNodes?: number;
    /** Maximum nodes when auto-scaling (default: 5) */
    maxNodes?: number;
    /** Resource tags */
    tags?: string[];
    /** Node labels */
    labels?: Record<string, string>;
    /**
     * Use static kubeconfig from cluster resource instead of dynamic fetch.
     * Set to true in unit tests to avoid network calls.
     * @internal
     */
    useStaticKubeconfig?: boolean;
}

/**
 * Return type for Kubernetes cluster component
 */
export interface KubernetesClusterResult {
    cluster: digitalocean.KubernetesCluster;
    clusterId: pulumi.Output<string>;
    endpoint: pulumi.Output<string>;
    kubeconfig: pulumi.Output<string>;
    clusterCaCertificate: pulumi.Output<string>;
    provider: k8s.Provider;
}

/**
 * Return type for Prometheus component
 */
export interface PrometheusResult {
    serviceAccount: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    clusterRole: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    clusterRoleBinding: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    statefulSet: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    pvc: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    configMap: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Return type for kube-state-metrics component
 */
export interface KubeStateMetricsResult {
    serviceAccount: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    clusterRole: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    clusterRoleBinding: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Return type for Grafana component
 */
export interface GrafanaResult {
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    pvc: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    configMap: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    secret: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}
