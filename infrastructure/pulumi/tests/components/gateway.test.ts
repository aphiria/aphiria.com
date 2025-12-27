import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createGateway } from "../../src/components/gateway";

describe("createGateway", () => {
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

    it("should create gateway with self-signed certificate for local environment", (done) => {
        const result = createGateway({
            env: "local",
            name: "test-gateway",
            namespace: "test-namespace",
            tlsMode: "self-signed",
            domains: ["*.aphiria.com"],
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();
        expect(result.certificate).toBeDefined();

        pulumi.all([result.urn, result.certificate]).apply(([gatewayUrn, certUrn]) => {
            expect(gatewayUrn).toContain("test-gateway");
            expect(certUrn).toBeDefined();
            done();
        });
    });

    it("should create gateway with Let's Encrypt certificate for production", (done) => {
        const result = createGateway({
            env: "production",
            name: "prod-gateway",
            namespace: "production",
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();
        expect(result.certificate).toBeDefined();

        result.urn.apply((gatewayUrn: string) => {
            expect(gatewayUrn).toContain("prod-gateway");
            done();
        });
    });

    it("should require dnsToken for wildcard domains with Let's Encrypt", () => {
        expect(() => {
            createGateway({
                env: "preview",
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
                env: "production",
                name: "gateway",
                namespace: "default",
                tlsMode: "letsencrypt-prod",
                domains: ["*.aphiria.com"],
                dnsToken: pulumi.output("fake-dns-token"),
                provider: k8sProvider,
            });
        }).toThrow("Production gateway requires a root domain");
    });

    it("should require wildcard domain for production environment", () => {
        expect(() => {
            createGateway({
                env: "production",
                name: "gateway",
                namespace: "default",
                tlsMode: "letsencrypt-prod",
                domains: ["aphiria.com"],
                provider: k8sProvider,
            });
        }).toThrow("Production gateway requires a wildcard domain");
    });

    it("should allow wildcard-only domains for preview environment", (done) => {
        const result = createGateway({
            env: "preview",
            name: "preview-gateway",
            namespace: "preview-pr-123",
            tlsMode: "letsencrypt-prod",
            domains: ["*.pr.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();

        result.urn.apply((gatewayUrn: string) => {
            expect(gatewayUrn).toContain("preview-gateway");
            done();
        });
    });

    it("should merge custom labels with default labels", (done) => {
        const result = createGateway({
            env: "local",
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

        result.urn.apply((gatewayUrn: string) => {
            expect(gatewayUrn).toContain("custom-gateway");
            done();
        });
    });

    it("should handle multiple wildcard domains", (done) => {
        const result = createGateway({
            env: "production",
            name: "multi-domain-gateway",
            namespace: "default",
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com", "*.api.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();

        result.urn.apply((gatewayUrn: string) => {
            expect(gatewayUrn).toContain("multi-domain-gateway");
            done();
        });
    });

    it("should require at least one domain for non-production environments", () => {
        expect(() => {
            createGateway({
                env: "local",
                name: "gateway",
                namespace: "default",
                tlsMode: "self-signed",
                domains: [],
                provider: k8sProvider,
            });
        }).toThrow("Gateway requires at least one domain");
    });

    it("should use HTTP-01 ACME challenge when dnsToken not provided for non-wildcard domains", (done) => {
        const result = createGateway({
            env: "preview",
            name: "http01-gateway",
            namespace: "preview-ns",
            tlsMode: "letsencrypt-prod",
            domains: ["example.com"],
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();
        expect(result.certificate).toBeDefined();

        result.urn.apply((gatewayUrn: string) => {
            expect(gatewayUrn).toContain("http01-gateway");
            done();
        });
    });

    it("should use DNS-01 ACME challenge when dnsToken provided", (done) => {
        const result = createGateway({
            env: "production",
            name: "dns01-gateway",
            namespace: "production",
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.urn).toBeDefined();
        expect(result.certificate).toBeDefined();

        result.urn.apply((gatewayUrn: string) => {
            expect(gatewayUrn).toContain("dns01-gateway");
            done();
        });
    });
});
