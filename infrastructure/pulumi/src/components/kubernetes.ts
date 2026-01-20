import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";
import { KubernetesClusterArgs, KubernetesClusterResult } from "./types/kubernetes";

/** Creates DigitalOcean Kubernetes cluster with auto-scaling node pool */
export function createKubernetesCluster(args: KubernetesClusterArgs): KubernetesClusterResult {
    const cluster = new digitalocean.KubernetesCluster(
        args.name,
        {
            name: args.name,
            region: args.region,
            version: args.version,
            autoUpgrade: args.autoUpgrade,
            surgeUpgrade: args.surgeUpgrade,
            ha: args.ha,
            vpcUuid: args.vpcUuid,
            nodePool: {
                name: `${args.name}-pool`,
                size: args.nodeSize,
                nodeCount: args.nodeCount,
                autoScale: args.autoScale,
                minNodes: args.minNodes,
                maxNodes: args.maxNodes,
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

    // Fetch fresh kubeconfig from DigitalOcean on every operation
    // This ensures credentials never expire (DO rotates them every 7 days)
    // Using getKubernetesClusterOutput() waits for cluster to exist in DO API before fetching
    // This works on both first deployment and subsequent updates
    // @internal - useStaticKubeconfig flag allows tests to use static config (prevents async issues during Jest teardown)
    /* v8 ignore start - production dynamic kubeconfig path, tested via integration */
    const kubeconfig = args.useStaticKubeconfig
        ? cluster.kubeConfigs[0].rawConfig
        : digitalocean
              .getKubernetesClusterOutput({
                  name: cluster.name,
              })
              .kubeConfigs.apply((configs) => configs[0].rawConfig);
    /* v8 ignore stop */

    // Create Kubernetes provider for this cluster
    const provider = new k8s.Provider(
        `${args.name}-k8s`,
        {
            kubeconfig: kubeconfig,
            // Disable SSA to prevent field manager conflicts between deployments
            // SSA field manager IDs change when provider is recreated, causing conflicts
            enableServerSideApply: false,
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
