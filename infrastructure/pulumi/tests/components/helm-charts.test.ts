import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { installBaseHelmCharts, namespaceTransformation } from "../../src/components/helm-charts";

describe("installBaseHelmCharts", () => {
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

    it("should install cert-manager and nginx-gateway for local environment", () => {
        const result = installBaseHelmCharts({
            env: "local",
            provider: k8sProvider,
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();
    });

    it("should install cert-manager and nginx-gateway for production environment", () => {
        const result = installBaseHelmCharts({
            env: "production",
            provider: k8sProvider,
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();
    });

    it("should install cert-manager and nginx-gateway for preview environment", () => {
        const result = installBaseHelmCharts({
            env: "preview",
            provider: k8sProvider,
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();
    });
});

describe("namespaceTransformation", () => {
    it("should return object when kind is Namespace and name matches", () => {
        const transformation = namespaceTransformation("cert-manager");
        const obj = {
            kind: "Namespace",
            metadata: {
                name: "cert-manager",
            },
        };

        const result = transformation(obj);
        expect(result).toBe(obj);
    });

    it("should return undefined when kind is not Namespace", () => {
        const transformation = namespaceTransformation("cert-manager");
        const obj = {
            kind: "Deployment",
            metadata: {
                name: "cert-manager",
            },
        };

        const result = transformation(obj);
        expect(result).toBeUndefined();
    });

    it("should return undefined when name does not match", () => {
        const transformation = namespaceTransformation("cert-manager");
        const obj = {
            kind: "Namespace",
            metadata: {
                name: "different-namespace",
            },
        };

        const result = transformation(obj);
        expect(result).toBeUndefined();
    });

    it("should return undefined when metadata is missing", () => {
        const transformation = namespaceTransformation("cert-manager");
        const obj = {
            kind: "Namespace",
        };

        const result = transformation(obj);
        expect(result).toBeUndefined();
    });
});

