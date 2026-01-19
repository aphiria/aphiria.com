import { describe, it, expect, beforeAll } from "vitest";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createGateway } from "../../src/components/gateway";
import { promiseOf } from "../test-utils";

describe("createGateway", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create gateway with self-signed certificate for local environment", async () => {
        const result = createGateway({
            requireRootAndWildcard: false,
            name: "test-gateway",
            namespace: "test-namespace",
            tlsMode: "self-signed",
            domains: ["*.aphiria.com"],
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();
        expect(result.certificate).toBeDefined();

        const [gatewayUrn, certUrn] = await Promise.all([
            promiseOf(result.urn),
            promiseOf(result.certificate!),
        ]);
        expect(gatewayUrn).toContain("test-gateway");
        expect(certUrn).toBeDefined();
    });

    it("should create gateway with self-signed certificate and cert-manager dependency", async () => {
        const mockDependency = new k8s.apiextensions.CustomResource("mock-cert-manager", {
            apiVersion: "v1",
            kind: "MockResource",
        });

        const result = createGateway({
            requireRootAndWildcard: false,
            name: "test-gateway-with-dep",
            namespace: "test-namespace",
            tlsMode: "self-signed",
            domains: ["*.aphiria.com"],
            certManagerDependency: mockDependency,
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();
        expect(result.certificate).toBeDefined();

        const gatewayUrn = await promiseOf(result.urn);
        expect(gatewayUrn).toContain("test-gateway-with-dep");
    });

    it("should create gateway with Let's Encrypt certificate for production", async () => {
        const result = createGateway({
            requireRootAndWildcard: false,
            name: "prod-gateway",
            namespace: "production",
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();
        expect(result.certificate).toBeDefined();

        const gatewayUrn = await promiseOf(result.urn);
        expect(gatewayUrn).toContain("prod-gateway");
    });

    it("should create gateway with Let's Encrypt certificate and cert-manager dependency", async () => {
        const mockDependency = new k8s.apiextensions.CustomResource("mock-cert-manager-le", {
            apiVersion: "v1",
            kind: "MockResource",
        });

        const result = createGateway({
            requireRootAndWildcard: false,
            name: "prod-gateway-with-dep",
            namespace: "production",
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            certManagerDependency: mockDependency,
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();
        expect(result.certificate).toBeDefined();

        const gatewayUrn = await promiseOf(result.urn);
        expect(gatewayUrn).toContain("prod-gateway-with-dep");
    });

    it("should require dnsToken for wildcard domains with Let's Encrypt", () => {
        expect(() => {
            createGateway({
                requireRootAndWildcard: false,
                name: "gateway",
                namespace: "default",
                tlsMode: "letsencrypt-prod",
                domains: ["*.pr.aphiria.com"],
                provider: k8sProvider,
            });
        }).toThrow("DNS-01 ACME challenge");
    });

    it("should require root domain for production environment", () => {
        expect(() => {
            createGateway({
                requireRootAndWildcard: true,
                name: "gateway",
                namespace: "default",
                tlsMode: "letsencrypt-prod",
                domains: ["*.aphiria.com"],
                dnsToken: pulumi.output("fake-dns-token"),
                provider: k8sProvider,
            });
        }).toThrow("Gateway requires a root domain");
    });

    it("should require wildcard domain for production environment", () => {
        expect(() => {
            createGateway({
                requireRootAndWildcard: true,
                name: "gateway",
                namespace: "default",
                tlsMode: "letsencrypt-prod",
                domains: ["aphiria.com"],
                dnsToken: pulumi.output("fake-dns-token"),
                provider: k8sProvider,
            });
        }).toThrow("Gateway requires a wildcard domain");
    });

    it("should accept both root and wildcard domains when requireRootAndWildcard is true", async () => {
        const result = createGateway({
            requireRootAndWildcard: true,
            name: "prod-gateway-full",
            namespace: "production",
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();
        expect(result.certificate).toBeDefined();

        const gatewayUrn = await promiseOf(result.urn);
        expect(gatewayUrn).toContain("prod-gateway-full");
    });

    it("should allow wildcard-only domains for preview environment", async () => {
        const result = createGateway({
            requireRootAndWildcard: false,
            name: "preview-gateway",
            namespace: "preview-pr-123",
            tlsMode: "letsencrypt-prod",
            domains: ["*.pr.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();

        const gatewayUrn = await promiseOf(result.urn);
        expect(gatewayUrn).toContain("preview-gateway");
    });

    it("should merge custom labels with default labels", async () => {
        const result = createGateway({
            requireRootAndWildcard: false,
            name: "custom-gateway",
            namespace: "default",
            tlsMode: "self-signed",
            domains: ["*.aphiria.com"],
            labels: {
                "custom-label": "custom-value",
                environment: "testing",
            },
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();

        const gatewayUrn = await promiseOf(result.urn);
        expect(gatewayUrn).toContain("custom-gateway");
    });

    it("should handle multiple wildcard domains", async () => {
        const result = createGateway({
            requireRootAndWildcard: false,
            name: "multi-domain-gateway",
            namespace: "default",
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com", "*.api.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();

        const gatewayUrn = await promiseOf(result.urn);
        expect(gatewayUrn).toContain("multi-domain-gateway");
    });

    it("should require at least one domain for non-production environments", () => {
        expect(() => {
            createGateway({
                requireRootAndWildcard: false,
                name: "gateway",
                namespace: "default",
                tlsMode: "self-signed",
                domains: [],
                provider: k8sProvider,
            });
        }).toThrow("Gateway requires at least one domain");
    });

    it("should use HTTP-01 ACME challenge when dnsToken not provided for non-wildcard domains", async () => {
        const result = createGateway({
            requireRootAndWildcard: false,
            name: "http01-gateway",
            namespace: "preview-ns",
            tlsMode: "letsencrypt-prod",
            domains: ["example.com"],
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();
        expect(result.certificate).toBeDefined();

        const gatewayUrn = await promiseOf(result.urn);
        expect(gatewayUrn).toContain("http01-gateway");
    });

    it("should use DNS-01 ACME challenge when dnsToken provided", async () => {
        const result = createGateway({
            requireRootAndWildcard: false,
            name: "dns01-gateway",
            namespace: "production",
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();
        expect(result.certificate).toBeDefined();

        const gatewayUrn = await promiseOf(result.urn);
        expect(gatewayUrn).toContain("dns01-gateway");
    });
});
