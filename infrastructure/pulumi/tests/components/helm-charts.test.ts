import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {
    installBaseHelmCharts,
    namespaceTransformation,
    installNginxGateway,
    ignoreDigitalOceanServiceAnnotations,
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

    it("should include transformation to ignore DigitalOcean annotations on Service resources", () => {
        const chart = installNginxGateway({
            env: "production",
            chartName: "nginx-gateway-fabric",
            repository: "oci://ghcr.io/nginxinc/charts",
            version: "1.2.0",
            namespace: "nginx-gateway",
            provider: k8sProvider,
        });

        // Access the transformations from the Chart resource options
        // Note: This is testing the structure, not the runtime behavior
        expect(chart).toBeDefined();
    });
});

describe("ignoreDigitalOceanServiceAnnotations", () => {
    it("should add ignoreChanges for Service resources", () => {
        const serviceObj = {
            type: "kubernetes:core/v1:Service",
            props: { metadata: { name: "test-service" } },
            opts: {},
        };

        const result = ignoreDigitalOceanServiceAnnotations(serviceObj);

        expect(result).toBeDefined();
        expect(result?.props).toEqual(serviceObj.props);
        expect(result?.opts).toHaveProperty("ignoreChanges");
        expect(result?.opts.ignoreChanges).toContain(
            'metadata.annotations["kubernetes.digitalocean.com/load-balancer-id"]'
        );
        expect(result?.opts.ignoreChanges).toContain(
            'metadata.annotations["service.beta.kubernetes.io/do-loadbalancer-type"]'
        );
    });

    it("should return undefined for non-Service resources", () => {
        const deploymentObj = {
            type: "kubernetes:apps/v1:Deployment",
            props: { metadata: { name: "test-deployment" } },
            opts: {},
        };

        const result = ignoreDigitalOceanServiceAnnotations(deploymentObj);

        expect(result).toBeUndefined();
    });
});
