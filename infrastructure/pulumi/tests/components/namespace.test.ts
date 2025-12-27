import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createNamespace } from "../../src/components/namespace";

describe("createNamespace", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        pulumi.runtime.setMocks({
            newResource: (args: pulumi.runtime.MockResourceArgs): { id: string; state: Record<string, unknown> } => {
                return {
                    id: args.inputs.name ? `${args.name}-id` : `${args.type}-id`,
                    state: {
                        ...args.inputs,
                    },
                };
            },
            call: (args: pulumi.runtime.MockCallArgs): Record<string, unknown> => {
                return args.inputs;
            },
        });

        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create namespace with basic configuration", () => {
        const result = createNamespace({
            name: "test-namespace",
            env: "preview",
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.resourceQuota).toBeUndefined();
        expect(result.networkPolicy).toBeUndefined();
        expect(result.imagePullSecret).toBeUndefined();
    });

    it("should create namespace with ResourceQuota", () => {
        const result = createNamespace({
            name: "test-namespace",
            env: "preview",
            resourceQuota: {
                cpu: "2",
                memory: "4Gi",
                pods: "10",
            },
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.resourceQuota).toBeDefined();
    });

    it("should create namespace with NetworkPolicy", () => {
        const result = createNamespace({
            name: "test-namespace",
            env: "preview",
            networkPolicy: {
                allowDNS: true,
                allowHTTPS: true,
                allowPostgreSQL: {
                    host: "db.default.svc.cluster.local",
                    port: 5432,
                },
            },
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.networkPolicy).toBeDefined();
    });

    it("should create namespace with imagePullSecret", () => {
        const result = createNamespace({
            name: "test-namespace",
            env: "preview",
            imagePullSecret: {
                registry: "ghcr.io",
                username: pulumi.output("user"),
                token: pulumi.output("ghp_token"),
            },
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.imagePullSecret).toBeDefined();
    });

    it("should create namespace with all features", () => {
        const result = createNamespace({
            name: "preview-pr-123",
            env: "preview",
            resourceQuota: {
                cpu: "2",
                memory: "4Gi",
                pods: "10",
            },
            networkPolicy: {
                allowDNS: true,
                allowHTTPS: true,
                allowPostgreSQL: {
                    host: "db.default.svc.cluster.local",
                    port: 5432,
                },
            },
            imagePullSecret: {
                registry: "ghcr.io",
                username: pulumi.output("user"),
                token: pulumi.output("ghp_token"),
            },
            labels: {
                "pr-number": "123",
            },
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.resourceQuota).toBeDefined();
        expect(result.networkPolicy).toBeDefined();
        expect(result.imagePullSecret).toBeDefined();
    });
});
