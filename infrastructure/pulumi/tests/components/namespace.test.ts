import { describe, it, expect, beforeAll } from "vitest";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createNamespace } from "../../src/components/namespace";
import { promiseOf } from "../test-utils";

describe("createNamespace", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create namespace with basic configuration", async () => {
        const result = createNamespace({
            environmentLabel: "test",
            name: "test-namespace",
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.resourceQuota).toBeUndefined();
        expect(result.networkPolicy).toBeUndefined();
        expect(result.imagePullSecret).toBeUndefined();

        const [name, labels] = await Promise.all([
            promiseOf(result.namespace.metadata.name),
            promiseOf(result.namespace.metadata.labels),
        ]);
        expect(name).toBe("test-namespace");
        expect(labels).toMatchObject({
            "app.kubernetes.io/name": "aphiria",
            "app.kubernetes.io/environment": "test",
        });
    });

    it("should create namespace with ResourceQuota", async () => {
        const result = createNamespace({
            environmentLabel: "test",
            name: "quota-namespace",
            resourceQuota: {
                cpu: "2",
                memory: "4Gi",
                pods: "10",
            },
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.resourceQuota).toBeDefined();

        const [quotaName, namespace, hard] = await Promise.all([
            promiseOf(result.resourceQuota!.metadata.name),
            promiseOf(result.resourceQuota!.metadata.namespace),
            promiseOf(result.resourceQuota!.spec.hard),
        ]);
        expect(quotaName).toBe("quota-namespace-quota");
        expect(namespace).toBe("quota-namespace");
        expect(hard).toMatchObject({
            "requests.cpu": "2",
            "requests.memory": "4Gi",
            "limits.cpu": "2",
            "limits.memory": "4Gi",
            pods: "10",
        });
    });

    it("should create namespace with NetworkPolicy allowing all options", async () => {
        const result = createNamespace({
            environmentLabel: "test",
            name: "netpol-namespace",
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

        const [policyName, namespace] = await Promise.all([
            promiseOf(result.networkPolicy!.metadata.name),
            promiseOf(result.networkPolicy!.metadata.namespace),
        ]);
        expect(policyName).toBe("netpol-namespace-network-policy");
        expect(namespace).toBe("netpol-namespace");
    });

    it("should create namespace with NetworkPolicy allowing only DNS", async () => {
        const result = createNamespace({
            environmentLabel: "test",
            name: "netpol-dns-only",
            networkPolicy: {
                allowDNS: true,
                allowHTTPS: false,
            },
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.networkPolicy).toBeDefined();

        const policyName = await promiseOf(result.networkPolicy!.metadata.name);
        expect(policyName).toBe("netpol-dns-only-network-policy");
    });

    it("should create namespace with NetworkPolicy allowing only HTTPS", async () => {
        const result = createNamespace({
            environmentLabel: "test",
            name: "netpol-https-only",
            networkPolicy: {
                allowDNS: false,
                allowHTTPS: true,
            },
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.networkPolicy).toBeDefined();

        const policyName = await promiseOf(result.networkPolicy!.metadata.name);
        expect(policyName).toBe("netpol-https-only-network-policy");
    });

    it("should create namespace with NetworkPolicy allowing only PostgreSQL", async () => {
        const result = createNamespace({
            environmentLabel: "test",
            name: "netpol-postgres-only",
            networkPolicy: {
                allowDNS: false,
                allowHTTPS: false,
                allowPostgreSQL: {
                    host: "db.default.svc.cluster.local",
                    port: 5432,
                },
            },
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.networkPolicy).toBeDefined();

        const policyName = await promiseOf(result.networkPolicy!.metadata.name);
        expect(policyName).toBe("netpol-postgres-only-network-policy");
    });

    it("should create namespace with imagePullSecret", async () => {
        const result = createNamespace({
            environmentLabel: "test",
            name: "secret-namespace",
            imagePullSecret: {
                registry: "ghcr.io",
                username: pulumi.output("user"),
                token: pulumi.output("ghp_token"),
            },
            provider: k8sProvider,
        });

        expect(result.namespace).toBeDefined();
        expect(result.imagePullSecret).toBeDefined();

        const [secretName, namespace, type] = await Promise.all([
            promiseOf(result.imagePullSecret!.metadata.name),
            promiseOf(result.imagePullSecret!.metadata.namespace),
            promiseOf(result.imagePullSecret!.type),
        ]);
        expect(secretName).toBe("ghcr-pull-secret");
        expect(namespace).toBe("secret-namespace");
        expect(type).toBe("kubernetes.io/dockerconfigjson");
    });

    it("should merge custom labels with default labels", async () => {
        const result = createNamespace({
            environmentLabel: "test",
            name: "preview-pr-123",
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

        const [nsName, nsLabels, quotaName, policyName, secretName] = await Promise.all([
            promiseOf(result.namespace.metadata.name),
            promiseOf(result.namespace.metadata.labels),
            promiseOf(result.resourceQuota!.metadata.name),
            promiseOf(result.networkPolicy!.metadata.name),
            promiseOf(result.imagePullSecret!.metadata.name),
        ]);
        expect(nsName).toBe("preview-pr-123");
        expect(nsLabels).toMatchObject({
            "app.kubernetes.io/name": "aphiria",
            "app.kubernetes.io/environment": "test",
            "pr-number": "123",
            team: "platform",
        });
        expect(quotaName).toBe("preview-pr-123-quota");
        expect(policyName).toBe("preview-pr-123-network-policy");
        expect(secretName).toBe("ghcr-pull-secret");
    });

    it("should use Namespace.get() for default namespace instead of creating it", async () => {
        const result = createNamespace({
            environmentLabel: "test",
            name: "default",
            imagePullSecret: {
                registry: "ghcr.io",
                username: pulumi.output("user"),
                token: pulumi.output("ghp_token"),
            },
            provider: k8sProvider,
        });

        // Verify namespace and imagePullSecret are created
        expect(result.namespace).toBeDefined();
        expect(result.imagePullSecret).toBeDefined();

        // Verify URN contains the namespace type - this confirms the resource was created/retrieved
        const urn = await promiseOf(result.namespace.urn);
        expect(urn).toContain("kubernetes:core/v1:Namespace");

        // Verify imagePullSecret was created
        const secretName = await promiseOf(result.imagePullSecret!.metadata.name);
        expect(secretName).toBe("ghcr-pull-secret");
    });
});
