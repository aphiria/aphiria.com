import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import { promiseOf } from "../test-utils";

// Mock the createStack function before importing the stack file
const mockCreateStack = jest.fn();
jest.mock("../../src/stacks/lib/stack-factory", () => ({
    createStack: mockCreateStack,
}));

describe("preview-base stack", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        pulumi.runtime.setMocks({
            newResource: function (args: pulumi.runtime.MockResourceArgs): {
                id: string;
                state: any;
            } {
                return {
                    id: args.inputs.name ? `${args.inputs.name}_id` : args.name + "_id",
                    state: args.inputs,
                };
            },
            call: function (args: pulumi.runtime.MockCallArgs) {
                return args.inputs;
            },
        });
    });

    it("should export cluster name from stack result", async () => {
        const mockCluster = {
            name: pulumi.output("aphiria-com-preview-cluster"),
        };

        mockCreateStack.mockReturnValue({
            config: {
                postgresql: {
                    host: "db.default.svc.cluster.local",
                },
            },
            cluster: mockCluster,
            clusterId: pulumi.output("cluster-123"),
            kubeconfig: pulumi.output("kubeconfig-content"),
            monitoring: {
                prometheus: {},
            },
        });

        // Import the stack file to trigger execution
        const stack = await import("../../src/stacks/preview-base");

        // Verify createStack was called with correct environment
        expect(mockCreateStack).toHaveBeenCalledWith("preview");

        // Verify exports are set correctly
        const clusterName = await promiseOf(stack.clusterName);
        expect(clusterName).toBe("aphiria-com-preview-cluster");

        const clusterId = await promiseOf(stack.clusterId!);
        expect(clusterId).toBe("cluster-123");

        const kubeconfig = await promiseOf(stack.kubeconfig!);
        expect(kubeconfig).toBe("kubeconfig-content");
    });

    it("should export postgresql host from config", async () => {
        mockCreateStack.mockReturnValue({
            config: {
                postgresql: {
                    host: "db.default.svc.cluster.local",
                },
            },
            cluster: {
                name: pulumi.output("test-cluster"),
            },
            clusterId: pulumi.output("cluster-123"),
            kubeconfig: pulumi.output("kubeconfig-content"),
            monitoring: {
                prometheus: {},
            },
        });

        const stack = await import("../../src/stacks/preview-base");

        const postgresqlHost = stack.postgresqlHost;
        expect(postgresqlHost).toBe("db.default.svc.cluster.local");
    });

    it("should export prometheus endpoint when monitoring is present", async () => {
        mockCreateStack.mockReturnValue({
            config: {
                postgresql: {
                    host: "db.default.svc.cluster.local",
                },
            },
            cluster: {
                name: pulumi.output("test-cluster"),
            },
            clusterId: pulumi.output("cluster-123"),
            kubeconfig: pulumi.output("kubeconfig-content"),
            monitoring: {
                prometheus: {},
            },
        });

        const stack = await import("../../src/stacks/preview-base");

        const prometheusEndpoint = await promiseOf(stack.prometheusEndpoint!);
        expect(prometheusEndpoint).toBe(
            "http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090"
        );
    });

    it("should not export prometheus endpoint when monitoring is not present", async () => {
        // Clear module cache to ensure fresh import
        jest.resetModules();

        mockCreateStack.mockReturnValue({
            config: {
                postgresql: {
                    host: "db.default.svc.cluster.local",
                },
            },
            cluster: {
                name: pulumi.output("test-cluster"),
            },
            clusterId: pulumi.output("cluster-123"),
            kubeconfig: pulumi.output("kubeconfig-content"),
            monitoring: undefined,
        });

        const stack = await import("../../src/stacks/preview-base");

        // When monitoring is undefined, prometheusEndpoint should be undefined
        expect(stack.prometheusEndpoint).toBeUndefined();
    });
});
