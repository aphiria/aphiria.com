import { createGatewayResources } from "../../../../src/stacks/lib/factories/gateway";
import { GatewayConfig } from "../../../../src/stacks/lib/config/types";
import * as k8s from "@pulumi/kubernetes";

// Mock the component functions
jest.mock("../../../../src/components", () => ({
    createGateway: jest.fn(),
    createDNSRecords: jest.fn(),
}));

import { createGateway, createDNSRecords } from "../../../../src/components";

describe("createGatewayResources", () => {
    const k8sProvider = new k8s.Provider("test-provider", {
        kubeconfig: "fake-kubeconfig",
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("gateway creation", () => {
        it("should create Gateway in nginx-gateway namespace", () => {
            const gatewayConfig: GatewayConfig = {
                requireRootAndWildcard: true,
                tlsMode: "self-signed",
                domains: ["local.aphiria.com"],
            };

            (createGateway as jest.Mock).mockReturnValue({
                gateway: {},
                httproutes: [],
            });

            createGatewayResources({
                env: "local",
                provider: k8sProvider,
                gatewayConfig,
            });

            expect(createGateway).toHaveBeenCalledWith(
                expect.objectContaining({
                    namespace: "nginx-gateway",
                    name: "nginx-gateway",
                })
            );
        });

        it("should pass requireRootAndWildcard from config to Gateway", () => {
            const gatewayConfig: GatewayConfig = {
                requireRootAndWildcard: false,
                tlsMode: "self-signed",
                domains: ["local.aphiria.com"],
            };

            (createGateway as jest.Mock).mockReturnValue({
                gateway: {},
                httproutes: [],
            });

            createGatewayResources({
                env: "local",
                provider: k8sProvider,
                gatewayConfig,
            });

            expect(createGateway).toHaveBeenCalledWith(
                expect.objectContaining({
                    requireRootAndWildcard: false,
                })
            );
        });

        it("should pass tlsMode from config to Gateway", () => {
            const gatewayConfig: GatewayConfig = {
                requireRootAndWildcard: true,
                tlsMode: "letsencrypt-prod",
                domains: ["aphiria.com"],
            };

            (createGateway as jest.Mock).mockReturnValue({
                gateway: {},
                httproutes: [],
            });

            createGatewayResources({
                env: "production",
                provider: k8sProvider,
                gatewayConfig,
            });

            expect(createGateway).toHaveBeenCalledWith(
                expect.objectContaining({
                    tlsMode: "letsencrypt-prod",
                })
            );
        });

        it("should pass domains from config to Gateway", () => {
            const gatewayConfig: GatewayConfig = {
                requireRootAndWildcard: true,
                tlsMode: "self-signed",
                domains: ["local.aphiria.com", "*.local.aphiria.com"],
            };

            (createGateway as jest.Mock).mockReturnValue({
                gateway: {},
                httproutes: [],
            });

            createGatewayResources({
                env: "local",
                provider: k8sProvider,
                gatewayConfig,
            });

            expect(createGateway).toHaveBeenCalledWith(
                expect.objectContaining({
                    domains: ["local.aphiria.com", "*.local.aphiria.com"],
                })
            );
        });

        it("should pass DigitalOcean DNS token to Gateway when provided", () => {
            const gatewayConfig: GatewayConfig = {
                requireRootAndWildcard: true,
                tlsMode: "letsencrypt-prod",
                domains: ["aphiria.com"],
                digitaloceanDnsToken: "test-token",
            };

            (createGateway as jest.Mock).mockReturnValue({
                gateway: {},
                httproutes: [],
            });

            createGatewayResources({
                env: "production",
                provider: k8sProvider,
                gatewayConfig,
            });

            expect(createGateway).toHaveBeenCalledWith(
                expect.objectContaining({
                    dnsToken: "test-token",
                })
            );
        });

        it("should pass cert-manager Chart dependency to Gateway when base infrastructure is provided", () => {
            const gatewayConfig: GatewayConfig = {
                requireRootAndWildcard: true,
                tlsMode: "self-signed",
                domains: ["local.aphiria.com"],
            };

            const mockCertManagerChart = {} as k8s.helm.v4.Chart;

            (createGateway as jest.Mock).mockReturnValue({
                gateway: {},
                httproutes: [],
            });

            createGatewayResources({
                env: "local",
                provider: k8sProvider,
                gatewayConfig,
                baseInfrastructure: {
                    helmCharts: {
                        certManager: mockCertManagerChart,
                        nginxGateway: {} as k8s.helm.v4.Chart,
                    },
                },
            });

            expect(createGateway).toHaveBeenCalledWith(
                expect.objectContaining({
                    certManagerDependency: mockCertManagerChart,
                })
            );
        });
    });

    describe("DNS record creation", () => {
        it("should not create DNS records when dns config is not provided", () => {
            const gatewayConfig: GatewayConfig = {
                requireRootAndWildcard: true,
                tlsMode: "self-signed",
                domains: ["local.aphiria.com"],
            };

            (createGateway as jest.Mock).mockReturnValue({
                gateway: {},
                httproutes: [],
            });

            createGatewayResources({
                env: "local",
                provider: k8sProvider,
                gatewayConfig,
            });

            expect(createDNSRecords).not.toHaveBeenCalled();
        });

        it("should not create DNS records when base infrastructure is not provided", () => {
            const gatewayConfig: GatewayConfig = {
                requireRootAndWildcard: true,
                tlsMode: "letsencrypt-prod",
                domains: ["aphiria.com"],
                dns: {
                    domain: "aphiria.com",
                    records: [
                        { name: "@", resourceName: "root" },
                        { name: "www", resourceName: "www" },
                    ],
                    ttl: 300,
                },
            };

            (createGateway as jest.Mock).mockReturnValue({
                gateway: {},
                httproutes: [],
            });

            createGatewayResources({
                env: "production",
                provider: k8sProvider,
                gatewayConfig,
            });

            expect(createDNSRecords).not.toHaveBeenCalled();
        });
    });
});
