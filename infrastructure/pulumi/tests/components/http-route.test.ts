import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {
    createHTTPRoute,
    createHTTPSRedirectRoute,
    createWWWRedirectRoute,
} from "../../src/components/http-route";
import { promiseOf } from "../test-utils";

describe("http-route components", () => {
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

    describe("createHTTPRoute", () => {
        it("should create HTTPRoute without rate limiting", async () => {
            const route = createHTTPRoute({
                name: "web-route",
                namespace: "web-ns",
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

            const [name, namespace, annotations] = await Promise.all([
                promiseOf(route.metadata.name),
                promiseOf(route.metadata.namespace),
                promiseOf(route.metadata.annotations),
            ]);

            expect(name).toBe("web-route");
            expect(namespace).toBe("web-ns");
            expect(annotations).toBeUndefined();
        });

        it("should create HTTPRoute with rate limiting annotations", async () => {
            const route = createHTTPRoute({
                name: "api-route",
                namespace: "api-ns",
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

            const [name, annotations] = await Promise.all([
                promiseOf(route.metadata.name),
                promiseOf(route.metadata.annotations),
            ]);

            expect(name).toBe("api-route");
            expect(annotations).toBeDefined();
            expect(annotations).toMatchObject({
                "nginx.org/rate-limit": "10r/s",
                "nginx.org/rate-limit-burst": "20",
            });
        });

        it("should merge custom labels with default labels", async () => {
            const route = createHTTPRoute({
                name: "custom-route",
                namespace: "custom-ns",
                hostname: "www.aphiria.com",
                gatewayName: "gateway",
                gatewayNamespace: "default",
                serviceName: "web",
                serviceNamespace: "default",
                servicePort: 80,
                enableRateLimiting: false,
                labels: {
                    "custom-label": "custom-value",
                    environment: "testing",
                },
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            const labels = await promiseOf(route.metadata.labels);
            expect(labels).toMatchObject({
                "app.kubernetes.io/name": "httproute-custom-route",
                "app.kubernetes.io/component": "routing",
                "custom-label": "custom-value",
                environment: "testing",
            });
        });

        it("should attach to specific listener using sectionName when provided", async () => {
            const route = createHTTPRoute({
                name: "web-route",
                namespace: "default",
                hostname: "117.pr.aphiria.com",
                gatewayName: "nginx-gateway",
                gatewayNamespace: "nginx-gateway",
                serviceName: "web",
                serviceNamespace: "default",
                servicePort: 80,
                sectionName: "https-subdomains-1",
                enableRateLimiting: false,
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            // Cast to any to access spec property (not in mock types)
            const spec: any = await promiseOf((route as any).spec);
            expect(spec.parentRefs).toBeDefined();
            expect(spec.parentRefs[0].sectionName).toBe("https-subdomains-1");
        });

        it("should not include sectionName when not provided", async () => {
            const route = createHTTPRoute({
                name: "web-route",
                namespace: "default",
                hostname: "www.aphiria.com",
                gatewayName: "nginx-gateway",
                gatewayNamespace: "nginx-gateway",
                serviceName: "web",
                serviceNamespace: "default",
                servicePort: 80,
                enableRateLimiting: false,
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            // Cast to any to access spec property (not in mock types)
            const spec: any = await promiseOf((route as any).spec);
            expect(spec.parentRefs).toBeDefined();
            expect(spec.parentRefs[0].sectionName).toBeUndefined();
        });
    });

    describe("createHTTPSRedirectRoute", () => {
        it("should create HTTPS redirect route for root and wildcard domains", async () => {
            const route = createHTTPSRedirectRoute({
                namespace: "redirect-ns",
                gatewayName: "gateway",
                gatewayNamespace: "gateway-ns",
                domains: ["aphiria.com", "*.aphiria.com"],
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            const [name, namespace] = await Promise.all([
                promiseOf(route.metadata.name),
                promiseOf(route.metadata.namespace),
            ]);

            expect(name).toBe("https-redirect");
            expect(namespace).toBe("redirect-ns");
        });

        it("should create HTTPS redirect route for multiple wildcard domains", async () => {
            const route = createHTTPSRedirectRoute({
                namespace: "default",
                gatewayName: "gateway",
                domains: ["*.pr.aphiria.com", "*.pr-api.aphiria.com"],
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            const [name, namespace] = await Promise.all([
                promiseOf(route.metadata.name),
                promiseOf(route.metadata.namespace),
            ]);

            expect(name).toBe("https-redirect");
            expect(namespace).toBe("default");
        });

        it("should create HTTPS redirect route for wildcard-only domain", async () => {
            const route = createHTTPSRedirectRoute({
                namespace: "default",
                gatewayName: "gateway",
                domains: ["*.example.com"],
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            const [name, namespace] = await Promise.all([
                promiseOf(route.metadata.name),
                promiseOf(route.metadata.namespace),
            ]);

            expect(name).toBe("https-redirect");
            expect(namespace).toBe("default");
        });

        it("should skip http-root listener when skipRootListener is true", async () => {
            const route = createHTTPSRedirectRoute({
                namespace: "default",
                gatewayName: "gateway",
                domains: ["aphiria.com", "*.aphiria.com"],
                skipRootListener: true,
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            const [name, namespace] = await Promise.all([
                promiseOf(route.metadata.name),
                promiseOf(route.metadata.namespace),
            ]);

            expect(name).toBe("https-redirect");
            expect(namespace).toBe("default");
        });

        it("should create hostname-based redirect for preview PR domains", async () => {
            const route = createHTTPSRedirectRoute({
                namespace: "preview-pr-117",
                gatewayName: "nginx-gateway",
                domains: ["117.pr.aphiria.com", "117.pr-api.aphiria.com"],
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            const [name, namespace] = await Promise.all([
                promiseOf(route.metadata.name),
                promiseOf(route.metadata.namespace),
            ]);

            expect(name).toBe("https-redirect");
            expect(namespace).toBe("preview-pr-117");
        });

        it("should attach to HTTP listeners using sectionName for specific hostnames", async () => {
            const route = createHTTPSRedirectRoute({
                namespace: "preview-pr-117",
                gatewayName: "nginx-gateway",
                domains: ["117.pr.aphiria.com", "117.pr-api.aphiria.com"],
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            // Cast to any to access spec property (not in mock types)
            const spec: any = await promiseOf((route as any).spec);
            expect(spec.parentRefs).toBeDefined();
            expect(spec.parentRefs.length).toBe(2); // Both web and api listeners
            expect(spec.parentRefs[0].sectionName).toBe("http-subdomains-1");
            expect(spec.parentRefs[1].sectionName).toBe("http-subdomains-2");
        });

        it("should attach only to web listener when only web hostname is provided", async () => {
            const route = createHTTPSRedirectRoute({
                namespace: "preview-pr-117",
                gatewayName: "nginx-gateway",
                domains: ["117.pr.aphiria.com"],
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            const spec: any = await promiseOf((route as any).spec);
            expect(spec.parentRefs).toBeDefined();
            expect(spec.parentRefs.length).toBe(1);
            expect(spec.parentRefs[0].sectionName).toBe("http-subdomains-1");
        });

        it("should attach only to api listener when only api hostname is provided", async () => {
            const route = createHTTPSRedirectRoute({
                namespace: "preview-pr-117",
                gatewayName: "nginx-gateway",
                domains: ["117.pr-api.aphiria.com"],
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            const spec: any = await promiseOf((route as any).spec);
            expect(spec.parentRefs).toBeDefined();
            expect(spec.parentRefs.length).toBe(1);
            expect(spec.parentRefs[0].sectionName).toBe("http-subdomains-2");
        });
    });

    describe("createWWWRedirectRoute", () => {
        it("should create WWW redirect route with explicit gateway namespace", async () => {
            const route = createWWWRedirectRoute({
                namespace: "redirect-ns",
                gatewayName: "gateway",
                gatewayNamespace: "gateway-ns",
                rootDomain: "aphiria.com",
                wwwDomain: "www.aphiria.com",
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            const [name, namespace] = await Promise.all([
                promiseOf(route.metadata.name),
                promiseOf(route.metadata.namespace),
            ]);

            expect(name).toBe("www-redirect");
            expect(namespace).toBe("redirect-ns");
        });

        it("should create WWW redirect route with default gateway namespace", async () => {
            const route = createWWWRedirectRoute({
                namespace: "default",
                gatewayName: "gateway",
                rootDomain: "aphiria.com",
                wwwDomain: "www.aphiria.com",
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            const [name, namespace] = await Promise.all([
                promiseOf(route.metadata.name),
                promiseOf(route.metadata.namespace),
            ]);

            expect(name).toBe("www-redirect");
            expect(namespace).toBe("default");
        });
    });
});
