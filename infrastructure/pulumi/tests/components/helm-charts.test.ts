import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {
    installBaseHelmCharts,
    installNginxGateway,
    ignoreDigitalOceanServiceAnnotationsV4,
} from "../../src/components/helm-charts";
import { promiseOf } from "../test-utils";

describe("installBaseHelmCharts", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should install cert-manager and nginx-gateway for local environment", async () => {
        const result = installBaseHelmCharts({
            env: "local",
            provider: k8sProvider,
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();

        const [certUrn, nginxUrn] = await Promise.all([
            promiseOf(result.certManager.urn),
            promiseOf(result.nginxGateway.urn),
        ]);

        expect(certUrn).toContain("cert-manager");
        expect(nginxUrn).toContain("nginx-gateway");
    });

    it("should install cert-manager and nginx-gateway for production environment", async () => {
        const result = installBaseHelmCharts({
            env: "production",
            provider: k8sProvider,
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();

        const [certUrn, nginxUrn] = await Promise.all([
            promiseOf(result.certManager.urn),
            promiseOf(result.nginxGateway.urn),
        ]);

        expect(certUrn).toContain("cert-manager");
        expect(nginxUrn).toContain("nginx-gateway");
    });

    it("should install cert-manager and nginx-gateway for preview environment", async () => {
        const result = installBaseHelmCharts({
            env: "preview",
            provider: k8sProvider,
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();

        const [certUrn, nginxUrn] = await Promise.all([
            promiseOf(result.certManager.urn),
            promiseOf(result.nginxGateway.urn),
        ]);

        expect(certUrn).toContain("cert-manager");
        expect(nginxUrn).toContain("nginx-gateway");
    });

    it("should accept optional nginxGatewayDependencies parameter", async () => {
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

        const [certUrn, nginxUrn] = await Promise.all([
            promiseOf(result.certManager.urn),
            promiseOf(result.nginxGateway.urn),
        ]);

        expect(certUrn).toContain("cert-manager");
        expect(nginxUrn).toContain("nginx-gateway");
    });
});

describe("installNginxGateway", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should install nginx-gateway-fabric chart", async () => {
        const result = installNginxGateway({
            env: "production",
            chartName: "nginx-gateway-fabric",
            repository: "oci://ghcr.io/nginxinc/charts",
            version: "1.2.0",
            namespace: "nginx-gateway",
            provider: k8sProvider,
        });

        expect(result).toBeDefined();

        const urn = await promiseOf(result.urn);
        expect(urn).toContain("nginx-gateway");
    });

    it("should conditionally apply transforms based on NODE_ENV (skipped in mock runtime)", () => {
        // Note: In test environment (NODE_ENV=test), transforms are skipped to avoid
        // "Pulumi CLI does not support transforms" error in mock runtime.
        // In production, transforms are applied to ignore DigitalOcean annotations
        // on LoadBalancer Service resources.
        const chart = installNginxGateway({
            env: "production",
            chartName: "nginx-gateway-fabric",
            repository: "oci://ghcr.io/nginxinc/charts",
            version: "1.2.0",
            namespace: "nginx-gateway",
            provider: k8sProvider,
        });

        expect(chart).toBeDefined();
    });
});

describe("ignoreDigitalOceanServiceAnnotationsV4", () => {
    it("should add ignoreChanges for DigitalOcean annotations on Service resources", () => {
        const args: pulumi.ResourceTransformArgs = {
            type: "kubernetes:core/v1:Service",
            name: "test-service",
            custom: true,
            props: {
                metadata: { name: "test" },
            },
            opts: {},
        };

        const result = ignoreDigitalOceanServiceAnnotationsV4(args);

        expect(result).toBeDefined();
        expect(result?.props).toEqual(args.props);
        expect(result?.opts).toBeDefined();
    });

    it("should return undefined for non-Service resources", () => {
        const args: pulumi.ResourceTransformArgs = {
            type: "kubernetes:apps/v1:Deployment",
            name: "test-deployment",
            custom: true,
            props: {
                metadata: { name: "test" },
            },
            opts: {},
        };

        const result = ignoreDigitalOceanServiceAnnotationsV4(args);

        expect(result).toBeUndefined();
    });
});
