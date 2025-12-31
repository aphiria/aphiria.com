/**
 * Jest setup file - configures Pulumi mocking and ensures proper cleanup
 *
 * CRITICAL: This file runs BEFORE any test files are loaded.
 * Mocks must be set before any Pulumi resources are imported.
 */
import * as pulumi from "@pulumi/pulumi";

// Disable Pulumi's automatic behaviors that might trigger network calls
process.env.PULUMI_SKIP_UPDATE_CHECK = "true";
process.env.PULUMI_AUTOMATION_API_SKIP_VERSION_CHECK = "true";

// CRITICAL: Set mocks IMMEDIATELY at module load time (not in beforeAll)
// This ensures mocks are active before ANY test code runs
pulumi.runtime.setMocks(
    {
        newResource: (
            args: pulumi.runtime.MockResourceArgs
        ): { id: string; state: Record<string, unknown> } => {
            // Special handling for DigitalOcean Kubernetes Cluster
            // The kubeConfigs property is an output, not an input, so we must mock it explicitly
            if (args.type === "digitalocean:index/kubernetesCluster:KubernetesCluster") {
                return {
                    id: args.inputs.name ? `${args.name}_id` : `${args.type}_id`,
                    state: {
                        ...args.inputs,
                        endpoint: "https://mock-endpoint.k8s.ondigitalocean.com",
                        kubeConfigs: [
                            {
                                rawConfig: "mock-kubeconfig-static",
                                clusterCaCertificate: "mock-ca-cert",
                                clientCertificate: "mock-client-cert",
                                clientKey: "mock-client-key",
                                host: "https://mock-endpoint.k8s.ondigitalocean.com",
                            },
                        ],
                    },
                };
            }

            return {
                id: args.inputs.name ? `${args.name}_id` : `${args.type}_id`,
                state: {
                    ...args.inputs,
                },
            };
        },
        call: (args: pulumi.runtime.MockCallArgs) => {
            // Handle digitalocean:getKubernetesCluster function call
            if (args.token === "digitalocean:index/getKubernetesCluster:getKubernetesCluster") {
                return Promise.resolve({
                    ...args.inputs,
                    endpoint: "https://mock-endpoint.k8s.ondigitalocean.com",
                    kubeConfigs: [
                        {
                            rawConfig: "mock-kubeconfig-from-get",
                        },
                    ],
                });
            }
            // Default: return inputs as-is
            return args.inputs;
        },
    },
    "test-project", // project name
    "test-stack", // stack name
    false // Use false for unit tests (not preview mode)
);

afterAll(async () => {
    // CRITICAL: Disconnect Pulumi runtime to clean up pending async work
    // Without this, worker processes hang waiting for unresolved promises/outputs
    await pulumi.runtime.disconnect();
});
