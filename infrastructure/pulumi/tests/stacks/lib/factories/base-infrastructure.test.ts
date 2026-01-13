import { describe, it, expect, beforeEach } from "@jest/globals";
import * as k8s from "@pulumi/kubernetes";
import { createBaseInfrastructureResources } from "../../../../src/stacks/lib/factories/base-infrastructure";

// Mock the components
jest.mock("../../../../src/components", () => ({
    installBaseHelmCharts: jest.fn(),
}));

import { installBaseHelmCharts } from "../../../../src/components";

describe("createBaseInfrastructureResources", () => {
    const k8sProvider = new k8s.Provider("test-provider", {
        kubeconfig: "fake-kubeconfig",
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("local environment", () => {
        it("should create Gateway API CRDs for local environment", () => {
            (installBaseHelmCharts as jest.Mock).mockReturnValue({
                certManager: {},
                nginxGateway: {},
            });

            const result = createBaseInfrastructureResources({
                env: "local",
                provider: k8sProvider,
            });

            expect(result.gatewayApiCrds).toBeDefined();
        });

        it("should create GatewayClass for nginx-gateway-fabric in local environment", () => {
            (installBaseHelmCharts as jest.Mock).mockReturnValue({
                certManager: {},
                nginxGateway: {},
            });

            const result = createBaseInfrastructureResources({
                env: "local",
                provider: k8sProvider,
            });

            expect(result.gatewayClass).toBeDefined();
        });

        it("should call installBaseHelmCharts with CRD and GatewayClass dependencies for local", () => {
            (installBaseHelmCharts as jest.Mock).mockReturnValue({
                certManager: {},
                nginxGateway: {},
            });

            const result = createBaseInfrastructureResources({
                env: "local",
                provider: k8sProvider,
            });

            expect(installBaseHelmCharts).toHaveBeenCalledWith(
                expect.objectContaining({
                    env: "local",
                    provider: k8sProvider,
                    nginxGatewayDependencies: expect.arrayContaining([
                        result.gatewayApiCrds,
                        result.gatewayClass,
                    ]),
                })
            );
        });

        it("should install Helm charts with correct environment for local", () => {
            (installBaseHelmCharts as jest.Mock).mockReturnValue({
                certManager: {},
                nginxGateway: {},
            });

            createBaseInfrastructureResources({
                env: "local",
                provider: k8sProvider,
            });

            expect(installBaseHelmCharts).toHaveBeenCalledWith(
                expect.objectContaining({
                    env: "local",
                })
            );
        });

        it("should return helmCharts from installBaseHelmCharts for local", () => {
            const mockCharts = {
                certManager: { id: "cert-manager-chart" },
                nginxGateway: { id: "nginx-gateway-chart" },
            };
            (installBaseHelmCharts as jest.Mock).mockReturnValue(mockCharts);

            const result = createBaseInfrastructureResources({
                env: "local",
                provider: k8sProvider,
            });

            expect(result.helmCharts).toBe(mockCharts);
            expect(result.helmCharts.certManager).toEqual({ id: "cert-manager-chart" });
            expect(result.helmCharts.nginxGateway).toEqual({ id: "nginx-gateway-chart" });
        });
    });

    describe("preview environment", () => {
        it("should not create Gateway API CRDs for preview environment", () => {
            (installBaseHelmCharts as jest.Mock).mockReturnValue({
                certManager: {},
                nginxGateway: {},
            });

            const result = createBaseInfrastructureResources({
                env: "preview",
                provider: k8sProvider,
            });

            expect(result.gatewayApiCrds).toBeUndefined();
        });

        it("should not create GatewayClass for preview environment", () => {
            (installBaseHelmCharts as jest.Mock).mockReturnValue({
                certManager: {},
                nginxGateway: {},
            });

            const result = createBaseInfrastructureResources({
                env: "preview",
                provider: k8sProvider,
            });

            expect(result.gatewayClass).toBeUndefined();
        });

        it("should call installBaseHelmCharts without dependencies for preview", () => {
            (installBaseHelmCharts as jest.Mock).mockReturnValue({
                certManager: {},
                nginxGateway: {},
            });

            createBaseInfrastructureResources({
                env: "preview",
                provider: k8sProvider,
            });

            expect(installBaseHelmCharts).toHaveBeenCalledWith({
                env: "preview",
                provider: k8sProvider,
            });
            expect(installBaseHelmCharts).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    nginxGatewayDependencies: expect.anything(),
                })
            );
        });

        it("should install Helm charts with correct environment for preview", () => {
            (installBaseHelmCharts as jest.Mock).mockReturnValue({
                certManager: {},
                nginxGateway: {},
            });

            createBaseInfrastructureResources({
                env: "preview",
                provider: k8sProvider,
            });

            expect(installBaseHelmCharts).toHaveBeenCalledWith(
                expect.objectContaining({
                    env: "preview",
                })
            );
        });

        it("should return helmCharts from installBaseHelmCharts for preview", () => {
            const mockCharts = {
                certManager: { id: "cert-manager-preview" },
                nginxGateway: { id: "nginx-gateway-preview" },
            };
            (installBaseHelmCharts as jest.Mock).mockReturnValue(mockCharts);

            const result = createBaseInfrastructureResources({
                env: "preview",
                provider: k8sProvider,
            });

            expect(result.helmCharts).toBe(mockCharts);
        });
    });

    describe("production environment", () => {
        it("should not create Gateway API CRDs for production environment", () => {
            (installBaseHelmCharts as jest.Mock).mockReturnValue({
                certManager: {},
                nginxGateway: {},
            });

            const result = createBaseInfrastructureResources({
                env: "production",
                provider: k8sProvider,
            });

            expect(result.gatewayApiCrds).toBeUndefined();
        });

        it("should not create GatewayClass for production environment", () => {
            (installBaseHelmCharts as jest.Mock).mockReturnValue({
                certManager: {},
                nginxGateway: {},
            });

            const result = createBaseInfrastructureResources({
                env: "production",
                provider: k8sProvider,
            });

            expect(result.gatewayClass).toBeUndefined();
        });

        it("should call installBaseHelmCharts without dependencies for production", () => {
            (installBaseHelmCharts as jest.Mock).mockReturnValue({
                certManager: {},
                nginxGateway: {},
            });

            createBaseInfrastructureResources({
                env: "production",
                provider: k8sProvider,
            });

            expect(installBaseHelmCharts).toHaveBeenCalledWith({
                env: "production",
                provider: k8sProvider,
            });
            expect(installBaseHelmCharts).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    nginxGatewayDependencies: expect.anything(),
                })
            );
        });

        it("should install Helm charts with correct environment for production", () => {
            (installBaseHelmCharts as jest.Mock).mockReturnValue({
                certManager: {},
                nginxGateway: {},
            });

            createBaseInfrastructureResources({
                env: "production",
                provider: k8sProvider,
            });

            expect(installBaseHelmCharts).toHaveBeenCalledWith(
                expect.objectContaining({
                    env: "production",
                })
            );
        });

        it("should return helmCharts from installBaseHelmCharts for production", () => {
            const mockCharts = {
                certManager: { id: "cert-manager-prod" },
                nginxGateway: { id: "nginx-gateway-prod" },
            };
            (installBaseHelmCharts as jest.Mock).mockReturnValue(mockCharts);

            const result = createBaseInfrastructureResources({
                env: "production",
                provider: k8sProvider,
            });

            expect(result.helmCharts).toBe(mockCharts);
        });
    });
});
