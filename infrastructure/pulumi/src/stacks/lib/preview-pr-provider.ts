/**
 * Preview PR Provider
 *
 * Creates a Kubernetes provider for preview-pr stacks that connects to the preview-base cluster
 */

import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

/**
 * Creates a Kubernetes provider connected to the preview-base cluster
 *
 * This function:
 * - Reads baseStackReference from Pulumi config
 * - Fetches cluster name from preview-base StackReference
 * - Retrieves fresh kubeconfig from DigitalOcean API
 * - Creates a Kubernetes provider for the preview-pr namespace
 *
 * @returns Kubernetes provider configured for preview-base cluster
 */
/* istanbul ignore next */
export function createPreviewPRProvider(): k8s.Provider {
    const config = new pulumi.Config();
    const baseStackReference = new pulumi.StackReference(config.require("baseStackReference"));

    // Get base stack outputs
    const clusterName = baseStackReference.requireOutput("clusterName");

    // Fetch fresh kubeconfig from DigitalOcean on every operation
    // This ensures credentials never expire (DO rotates them every 7 days)
    // Using getKubernetesClusterOutput() waits for cluster to exist in DO API
    const kubeconfig = digitalocean
        .getKubernetesClusterOutput({
            name: clusterName,
        })
        .kubeConfigs.apply((configs) => configs[0].rawConfig);

    // Create provider using the preview-base cluster's kubeconfig
    return new k8s.Provider(
        "aphiria-com-preview-pr-k8s",
        {
            kubeconfig: kubeconfig,
            deleteUnreachable: true,
            // Disable SSA to prevent field manager conflicts between deployments
            enableServerSideApply: false,
        },
        {
            dependsOn: [baseStackReference],
        }
    );
}
