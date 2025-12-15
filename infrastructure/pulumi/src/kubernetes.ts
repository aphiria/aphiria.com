import * as digitalocean from "@pulumi/digitalocean";

export function createKubernetesCluster() {
    const cluster = new digitalocean.KubernetesCluster("aphiria-com-cluster", {
        name: "aphiria-com-cluster",
        region: digitalocean.Region.NYC3,
        version: "1.34.1-do.0",
        nodePool: {
            name: "worker-pool",
            size: "s-2vcpu-2gb",
        },
        amdGpuDeviceMetricsExporterPlugin: {
            enabled: false,
        },
        amdGpuDevicePlugin: {
            enabled: false,
        },
        clusterSubnet: "10.244.0.0/16",
        maintenancePolicy: {
            day: "any",
            startTime: "6:00",
        },
        routingAgent: {
            enabled: false,
        },
        serviceSubnet: "10.245.0.0/16",
        vpcUuid: "976f980d-dc84-11e8-80bc-3cfdfea9fba1",
    }, {
        protect: true,
    });

    return {
        cluster,
        clusterId: cluster.id,
        clusterEndpoint: cluster.endpoint,
        clusterKubeConfigToken: cluster.kubeConfigs[0].token,
        clusterCaCertificate: cluster.kubeConfigs[0].clusterCaCertificate,
    };
}
