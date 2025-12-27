import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createHTTPRoute, createHTTPSRedirectRoute, createWWWRedirectRoute } from "../../src/components/http-route";

describe("http-route components", () => {
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

    describe("createHTTPRoute", () => {
        it("should create HTTPRoute without rate limiting", () => {
            const route = createHTTPRoute({
                name: "web-route",
                namespace: "default",
                hostname: "www.aphiria.com",
                gatewayName: "gateway",
                gatewayNamespace: "default",
                serviceName: "web",
                serviceNamespace: "default",
                servicePort: 80,
                enableRateLimiting: false,
                provider: k8sProvider,
            });

            expect(route).toBeDefined();
        });

        it("should create HTTPRoute with rate limiting", () => {
            const route = createHTTPRoute({
                name: "api-route",
                namespace: "default",
                hostname: "api.aphiria.com",
                gatewayName: "gateway",
                gatewayNamespace: "default",
                serviceName: "api",
                serviceNamespace: "default",
                servicePort: 80,
                enableRateLimiting: true,
                provider: k8sProvider,
            });

            expect(route).toBeDefined();
        });

        it("should handle custom labels", () => {
            const route = createHTTPRoute({
                name: "web-route",
                namespace: "default",
                hostname: "www.aphiria.com",
                gatewayName: "gateway",
                gatewayNamespace: "default",
                serviceName: "web",
                serviceNamespace: "default",
                servicePort: 80,
                enableRateLimiting: false,
                labels: {
                    "custom-label": "custom-value",
                },
                provider: k8sProvider,
            });

            expect(route).toBeDefined();
        });
    });

    describe("createHTTPSRedirectRoute", () => {
        it("should create HTTPS redirect route", () => {
            const route = createHTTPSRedirectRoute({
                namespace: "default",
                gatewayName: "gateway",
                gatewayNamespace: "default",
                provider: k8sProvider,
            });

            expect(route).toBeDefined();
        });

        it("should create HTTPS redirect route with default gateway namespace", () => {
            const route = createHTTPSRedirectRoute({
                namespace: "default",
                gatewayName: "gateway",
                provider: k8sProvider,
            });

            expect(route).toBeDefined();
        });
    });

    describe("createWWWRedirectRoute", () => {
        it("should create WWW redirect route", () => {
            const route = createWWWRedirectRoute({
                namespace: "default",
                gatewayName: "gateway",
                gatewayNamespace: "default",
                rootDomain: "aphiria.com",
                wwwDomain: "www.aphiria.com",
                provider: k8sProvider,
            });

            expect(route).toBeDefined();
        });

        it("should create WWW redirect route with default gateway namespace", () => {
            const route = createWWWRedirectRoute({
                namespace: "default",
                gatewayName: "gateway",
                rootDomain: "aphiria.com",
                wwwDomain: "www.aphiria.com",
                provider: k8sProvider,
            });

            expect(route).toBeDefined();
        });
    });
});
