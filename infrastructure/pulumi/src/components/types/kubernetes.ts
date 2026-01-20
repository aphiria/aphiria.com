import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as digitalocean from "@pulumi/digitalocean";

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
 * Arguments for Kubernetes cluster component
 */
export interface KubernetesClusterArgs {
    /** Cluster name */
    name: string;
    /** DigitalOcean region */
    region: string;
    /** Kubernetes version */
    version: string;
    /** Enable automatic Kubernetes version upgrades */
    autoUpgrade: boolean;
    /** Enable surge upgrades (more aggressive) */
    surgeUpgrade: boolean;
    /** Enable high availability control plane */
    ha: boolean;
    /** VPC UUID to attach cluster to */
    vpcUuid: string;
    /** Node pool machine size */
    nodeSize: string;
    /** Initial node count */
    nodeCount: number;
    /** Enable auto-scaling */
    autoScale: boolean;
    /** Minimum nodes when auto-scaling */
    minNodes: number;
    /** Maximum nodes when auto-scaling */
    maxNodes: number;
    /** Resource tags */
    tags?: string[];
    /** Node labels */
    labels?: Record<string, string>;
    /**
     * @internal Use static kubeconfig from cluster resource instead of fetching fresh credentials.
     * Set to true in tests to prevent async getKubernetesCluster() calls during Jest teardown.
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
 * Return type for namespace component
 */
export interface NamespaceResult {
    namespace: k8s.core.v1.Namespace;
    resourceQuota?: k8s.core.v1.ResourceQuota;
    networkPolicy?: k8s.networking.v1.NetworkPolicy;
    imagePullSecret?: k8s.core.v1.Secret;
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
