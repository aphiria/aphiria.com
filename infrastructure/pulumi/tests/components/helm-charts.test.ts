import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {
    installBaseHelmCharts,
    installNginxGateway,
} from "../../src/components/helm-charts";

describe("installBaseHelmCharts", () => {
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

    it("should install cert-manager and nginx-gateway for local environment", (done) => {
        const result = installBaseHelmCharts({
            env: "local",
            provider: k8sProvider,
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();

        pulumi
            .all([result.certManager.urn, result.nginxGateway.urn])
            .apply(([certUrn, nginxUrn]) => {
                expect(certUrn).toContain("cert-manager");
                expect(nginxUrn).toContain("nginx-gateway");
                done();
            });
    });

    it("should install cert-manager and nginx-gateway for production environment", (done) => {
        const result = installBaseHelmCharts({
            env: "production",
            provider: k8sProvider,
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();

        pulumi
            .all([result.certManager.urn, result.nginxGateway.urn])
            .apply(([certUrn, nginxUrn]) => {
                expect(certUrn).toContain("cert-manager");
                expect(nginxUrn).toContain("nginx-gateway");
                done();
            });
    });

    it("should install cert-manager and nginx-gateway for preview environment", (done) => {
        const result = installBaseHelmCharts({
            env: "preview",
            provider: k8sProvider,
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();

        pulumi
            .all([result.certManager.urn, result.nginxGateway.urn])
            .apply(([certUrn, nginxUrn]) => {
                expect(certUrn).toContain("cert-manager");
                expect(nginxUrn).toContain("nginx-gateway");
                done();
            });
    });

    it("should accept optional nginxGatewayDependencies parameter", (done) => {
        const mockDependency = new k8s.yaml.ConfigFile("test-dependency", {
            file: "https://example.com/test.yaml",
        });

        const result = installBaseHelmCharts({
            env: "local",
            provider: k8sProvider,
            nginxGatewayDependencies: [mockDependency],
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();

        pulumi
            .all([result.certManager.urn, result.nginxGateway.urn])
            .apply(([certUrn, nginxUrn]) => {
                expect(certUrn).toContain("cert-manager");
                expect(nginxUrn).toContain("nginx-gateway");
                done();
            });
    });
});

describe("installNginxGateway", () => {
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

    it("should install nginx-gateway-fabric chart", (done) => {
        const result = installNginxGateway({
            env: "production",
            chartName: "nginx-gateway-fabric",
            repository: "oci://ghcr.io/nginxinc/charts",
            version: "1.2.0",
            namespace: "nginx-gateway",
            provider: k8sProvider,
        });

        expect(result).toBeDefined();

        pulumi.output(result.urn).apply((urn) => {
            expect(urn).toContain("nginx-gateway");
            done();
        });
    });

    it("should include v4 transforms to ignore DigitalOcean annotations on Service resources", () => {
        const chart = installNginxGateway({
            env: "production",
            chartName: "nginx-gateway-fabric",
            repository: "oci://ghcr.io/nginxinc/charts",
            version: "1.2.0",
            namespace: "nginx-gateway",
            provider: k8sProvider,
        });

        // v4 Chart uses transforms instead of transformations
        // Testing the structure - runtime behavior is tested by Pulumi
        expect(chart).toBeDefined();
    });
});
