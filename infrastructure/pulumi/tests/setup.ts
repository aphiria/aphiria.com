/**
 * Jest setup file - configures Pulumi mocking and ensures proper cleanup
 *
 * This prevents worker processes from hanging due to lingering async operations.
 * Pulumi's runtime is process-global, so we must:
 * 1. Set mocks ONCE globally before any tests run
 * 2. Disconnect after all tests complete
 */
import * as pulumi from "@pulumi/pulumi";

// CRITICAL: Set mocks globally BEFORE any test imports Pulumi resources
// This prevents real provider initialization and network calls
beforeAll(() => {
    pulumi.runtime.setMocks(
        {
            newResource: (args: pulumi.runtime.MockResourceArgs): { id: string; state: Record<string, unknown> } => {
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
        "test-stack",   // stack name
        true            // preview mode - prevents real provider behavior
    );
});

afterAll(async () => {
    // CRITICAL: Disconnect Pulumi runtime to clean up pending async work
    // Without this, worker processes hang waiting for unresolved promises/outputs
    await pulumi.runtime.disconnect();
});
