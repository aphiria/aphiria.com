import * as digitalocean from "@pulumi/digitalocean";

export function createKubernetesCluster() {
    const cluster = new digitalocean.KubernetesCluster("aphiria-com-cluster", {
        name: "aphiria-com-cluster",
        region: "nyc3",
        version: "1.34.1-do.0",
        nodePool: {
            name: "worker-pool",
            size: "s-2vcpu-2gb",
            nodeCount: 1,
        },
    });

    return {
        cluster,
        clusterId: cluster.id,
        clusterEndpoint: cluster.endpoint,
        clusterKubeConfigToken: cluster.kubeConfigs[0].token,
        clusterCaCertificate: cluster.kubeConfigs[0].clusterCaCertificate,
    };
}
