import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createGateway } from "../../src/components/gateway";

describe("createGateway", () => {
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

    it("should create gateway with self-signed certificate for local environment", () => {
        const result = createGateway({
            env: "local",
            name: "gateway",
            namespace: "default",
            tlsMode: "self-signed",
            domains: ["*.aphiria.com"],
            provider: k8sProvider,
        });

        expect(result.gateway).toBeDefined();
        expect(result.certificate).toBeDefined();
    });

    it("should create gateway with Let's Encrypt certificate for production", () => {
        const result = createGateway({
            env: "production",
            name: "gateway",
            namespace: "default",
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.gateway).toBeDefined();
        expect(result.certificate).toBeDefined();
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

    it("should allow wildcard-only domains for preview environment", () => {
        const result = createGateway({
            env: "preview",
            name: "gateway",
            namespace: "preview-pr-123",
            tlsMode: "letsencrypt-prod",
            domains: ["*.pr.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.gateway).toBeDefined();
    });

    it("should handle custom labels", () => {
        const result = createGateway({
            env: "local",
            name: "gateway",
            namespace: "default",
            tlsMode: "self-signed",
            domains: ["*.aphiria.com"],
            labels: {
                "custom-label": "custom-value",
            },
            provider: k8sProvider,
        });

        expect(result.gateway).toBeDefined();
    });

    it("should handle multiple wildcard domains", () => {
        const result = createGateway({
            env: "production",
            name: "gateway",
            namespace: "default",
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com", "*.api.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.gateway).toBeDefined();
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

    it("should use HTTP-01 ACME challenge when dnsToken not provided for non-wildcard domains", () => {
        const result = createGateway({
            env: "preview",
            name: "gateway",
            namespace: "default",
            tlsMode: "letsencrypt-prod",
            domains: ["example.com"],
            provider: k8sProvider,
        });

        expect(result.gateway).toBeDefined();
        expect(result.certificate).toBeDefined();
    });

    it("should use DNS-01 ACME challenge when dnsToken provided", () => {
        const result = createGateway({
            env: "production",
            name: "gateway",
            namespace: "default",
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com"],
            dnsToken: pulumi.output("fake-dns-token"),
            provider: k8sProvider,
        });

        expect(result.gateway).toBeDefined();
        expect(result.certificate).toBeDefined();
    });
});
