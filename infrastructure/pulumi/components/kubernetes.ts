import * as digitalocean from "@pulumi/digitalocean";
import { KubernetesClusterArgs, KubernetesClusterResult } from "./types";

/** Creates DigitalOcean Kubernetes cluster with auto-scaling node pool */
export function createKubernetesCluster(args: KubernetesClusterArgs): KubernetesClusterResult {
    const cluster = new digitalocean.KubernetesCluster(args.name, {
        name: args.name,
        region: args.region || "nyc1",
        version: args.version || "1.34.1-do.0",
        autoUpgrade: args.autoUpgrade ?? true,
        surgeUpgrade: args.surgeUpgrade ?? false,
        ha: args.ha ?? false,
        vpcUuid: args.vpcUuid,
        nodePool: {
            name: `${args.name}-pool`,
            size: args.nodeSize || "s-2vcpu-4gb",
            nodeCount: args.nodeCount || 2,
            autoScale: args.autoScale ?? true,
            minNodes: args.minNodes || 1,
            maxNodes: args.maxNodes || 5,
            tags: args.tags || [],
            labels: args.labels || {},
        },
        tags: args.tags || [],
    });

    return {
        cluster,
        clusterId: cluster.id,
        endpoint: cluster.endpoint,
        kubeconfig: cluster.kubeConfigs[0].rawConfig,
        clusterCaCertificate: cluster.kubeConfigs[0].clusterCaCertificate,
    };
}
