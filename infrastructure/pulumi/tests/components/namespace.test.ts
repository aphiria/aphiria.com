import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createNamespace } from "../../src/components/namespace";

describe("createNamespace", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        pulumi.runtime.setMocks({
            newResource: (
                args: pulumi.runtime.MockResourceArgs
            ): { id: string; state: Record<string, unknown> } => {
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

    it("should create namespace with basic configuration", (done) => {
        const result = createNamespace({
            name: "test-namespace",
            env: "preview",
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.resourceQuota).toBeUndefined();
        expect(result.networkPolicy).toBeUndefined();
        expect(result.imagePullSecret).toBeUndefined();

        pulumi
            .all([result.namespace.metadata.name, result.namespace.metadata.labels])
            .apply(([name, labels]) => {
                expect(name).toBe("test-namespace");
                expect(labels).toMatchObject({
                    "app.kubernetes.io/name": "aphiria",
                    "app.kubernetes.io/environment": "preview",
                });
                done();
            });
    });

    it("should create namespace with ResourceQuota", (done) => {
        const result = createNamespace({
            name: "quota-namespace",
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

        pulumi
            .all([
                result.resourceQuota!.metadata.name,
                result.resourceQuota!.metadata.namespace,
                result.resourceQuota!.spec.hard,
            ])
            .apply(([quotaName, namespace, hard]) => {
                expect(quotaName).toBe("quota-namespace-quota");
                expect(namespace).toBe("quota-namespace");
                expect(hard).toMatchObject({
                    "requests.cpu": "2",
                    "requests.memory": "4Gi",
                    "limits.cpu": "2",
                    "limits.memory": "4Gi",
                    pods: "10",
                });
                done();
            });
    });

    it("should create namespace with NetworkPolicy", (done) => {
        const result = createNamespace({
            name: "netpol-namespace",
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

        pulumi
            .all([result.networkPolicy!.metadata.name, result.networkPolicy!.metadata.namespace])
            .apply(([policyName, namespace]) => {
                expect(policyName).toBe("netpol-namespace-network-policy");
                expect(namespace).toBe("netpol-namespace");
                done();
            });
    });

    it("should create namespace with imagePullSecret", (done) => {
        const result = createNamespace({
            name: "secret-namespace",
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

        pulumi
            .all([
                result.imagePullSecret!.metadata.name,
                result.imagePullSecret!.metadata.namespace,
                result.imagePullSecret!.type,
            ])
            .apply(([secretName, namespace, type]) => {
                expect(secretName).toBe("ghcr-pull-secret");
                expect(namespace).toBe("secret-namespace");
                expect(type).toBe("kubernetes.io/dockerconfigjson");
                done();
            });
    });

    it("should merge custom labels with default labels", (done) => {
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
                team: "platform",
            },
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.resourceQuota).toBeDefined();
        expect(result.networkPolicy).toBeDefined();
        expect(result.imagePullSecret).toBeDefined();

        pulumi
            .all([
                result.namespace.metadata.name,
                result.namespace.metadata.labels,
                result.resourceQuota!.metadata.name,
                result.networkPolicy!.metadata.name,
                result.imagePullSecret!.metadata.name,
            ])
            .apply(([nsName, nsLabels, quotaName, policyName, secretName]) => {
                expect(nsName).toBe("preview-pr-123");
                expect(nsLabels).toMatchObject({
                    "app.kubernetes.io/name": "aphiria",
                    "app.kubernetes.io/environment": "preview",
                    "pr-number": "123",
                    team: "platform",
                });
                expect(quotaName).toBe("preview-pr-123-quota");
                expect(policyName).toBe("preview-pr-123-network-policy");
                expect(secretName).toBe("ghcr-pull-secret");
                done();
            });
    });
});
