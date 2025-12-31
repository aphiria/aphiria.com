import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";
import { KubernetesClusterArgs, KubernetesClusterResult } from "./types";

/** Creates DigitalOcean Kubernetes cluster with auto-scaling node pool */
export function createKubernetesCluster(args: KubernetesClusterArgs): KubernetesClusterResult {
    const cluster = new digitalocean.KubernetesCluster(
        args.name,
        {
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
        },
        {
            // Ignore node count change if auto scaling is enabled so we don't get alerts about drift detection
            ignoreChanges: args.autoScale ? ["nodePool.nodeCount"] : [],
        }
    );

    // Conditionally use static or dynamic kubeconfig
    // Production: Dynamically fetch fresh kubeconfig to avoid token expiration issues
    //   - DigitalOcean tokens expire after 7 days by default
    //   - This ensures we always get fresh credentials on every pulumi operation
    //   - See: https://github.com/pulumi/pulumi-digitalocean/issues/77
    // Tests: Use static kubeconfig to avoid network calls
    //   - Pulumi's call mock doesn't prevent network requests
    //   - See: https://github.com/pulumi/pulumi/issues/11037
    const kubeconfig = args.useStaticKubeconfig
        ? cluster.kubeConfigs[0].rawConfig
        : cluster.name.apply((name) =>
            digitalocean.getKubernetesCluster({ name }).then((c) => c.kubeConfigs[0].rawConfig)
        );

    // Create Kubernetes provider for this cluster
    const provider = new k8s.Provider(
        `${args.name}-k8s`,
        {
            kubeconfig: kubeconfig,
            enableServerSideApply: true,
        },
        {
            dependsOn: [cluster],
        }
    );

    return {
        cluster,
        clusterId: cluster.id,
        endpoint: cluster.endpoint,
        kubeconfig: kubeconfig,
        clusterCaCertificate: cluster.kubeConfigs[0].clusterCaCertificate,
        provider: provider,
    };
}
