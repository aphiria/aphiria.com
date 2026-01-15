import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as digitalocean from "@pulumi/digitalocean";
import { createKubernetesCluster } from "../../../components";
import { loadConfig } from "../config/loader";

/**
 * Result of cluster provisioning
 */
export interface ProviderResult {
    provider: k8s.Provider;
    cluster: digitalocean.KubernetesCluster;
    clusterId: pulumi.Output<string>;
    kubeconfig: pulumi.Output<string>;
}

/**
 * Creates a new DigitalOcean Kubernetes cluster and returns provider
 *
 * This factory is used by preview-base and production stacks to provision
 * new clusters. It requires cluster configuration in Pulumi config.
 *
 * Local and preview-pr stacks do NOT use this - they create their own providers:
 * - local: connects to existing minikube
 * - preview-pr: connects to preview-base cluster via StackReference
 *
 * @param env Environment name (preview or production)
 * @returns Provider and cluster info
 */
export function createProvider(env: "preview" | "production"): ProviderResult {
    const config = loadConfig();

    if (!config.cluster) {
        throw new Error(
            `Environment ${env} requires cluster configuration but none was found. ` +
                `Check Pulumi.${env}.yml for cluster: config block.`
        );
    }

    const clusterResult = createKubernetesCluster({
        name: config.cluster.name,
        region: config.cluster.region,
        version: config.cluster.version,
        autoUpgrade: config.cluster.autoUpgrade,
        surgeUpgrade: config.cluster.surgeUpgrade,
        ha: config.cluster.ha,
        nodeSize: config.cluster.nodeSize,
        nodeCount: config.cluster.nodeCount,
        autoScale: config.cluster.autoScale,
        minNodes: config.cluster.minNodes,
        maxNodes: config.cluster.maxNodes,
        vpcUuid: config.cluster.vpcUuid,
    });

    return {
        provider: clusterResult.provider,
        cluster: clusterResult.cluster,
        clusterId: clusterResult.clusterId,
        kubeconfig: clusterResult.kubeconfig,
    };
}
