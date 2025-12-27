import { describe, it, expect } from "@jest/globals";
import { createKubernetesCluster } from "../../src/components/kubernetes";
import * as pulumi from "@pulumi/pulumi";

describe("createKubernetesCluster", () => {
    beforeAll(() => {
        pulumi.runtime.setMocks({
            newResource: (args: pulumi.runtime.MockResourceArgs): { id: string; state: Record<string, unknown> } => {
                return {
                    id: args.inputs.name ? `${args.name}-id` : `${args.type}-id`,
                    state: {
                        ...args.inputs,
                        kubeConfigs: [
                            {
                                rawConfig: "mock-kubeconfig",
                                clusterCaCertificate: "mock-ca-cert",
                            },
                        ],
                        endpoint: "https://mock-endpoint.k8s.ondigitalocean.com",
                    },
                };
            },
            call: (args: pulumi.runtime.MockCallArgs): Record<string, unknown> => {
                return args.inputs;
            },
        });
    });

    it("should create cluster with default settings", () => {
        const result = createKubernetesCluster({
            name: "test-cluster",
        });

        expect(result.cluster).toBeDefined();
        expect(result.clusterId).toBeDefined();
        expect(result.endpoint).toBeDefined();
        expect(result.kubeconfig).toBeDefined();
        expect(result.clusterCaCertificate).toBeDefined();
    });

    it("should create cluster with custom settings", () => {
        const result = createKubernetesCluster({
            name: "test-cluster",
            region: "sfo3",
            version: "1.34.1-do.0",
            nodeSize: "s-4vcpu-8gb",
            nodeCount: 3,
            autoScale: true,
            minNodes: 2,
            maxNodes: 10,
            autoUpgrade: false,
            surgeUpgrade: true,
            ha: true,
        });

        expect(result.cluster).toBeDefined();
        expect(result.clusterId).toBeDefined();
    });

    it("should create cluster with tags and labels", () => {
        const result = createKubernetesCluster({
            name: "test-cluster",
            tags: ["production", "k8s"],
            labels: {
                environment: "production",
                team: "platform",
            },
        });

        expect(result.cluster).toBeDefined();
    });

    it("should create cluster with VPC", () => {
        const result = createKubernetesCluster({
            name: "test-cluster",
            vpcUuid: "mock-vpc-uuid",
        });

        expect(result.cluster).toBeDefined();
    });

    it("should use default values when not specified", () => {
        const result = createKubernetesCluster({
            name: "minimal-cluster",
        });

        expect(result.cluster).toBeDefined();
        expect(result.endpoint).toBeDefined();
        expect(result.kubeconfig).toBeDefined();
    });
});
