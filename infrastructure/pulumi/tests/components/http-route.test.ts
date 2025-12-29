import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {
    createHTTPRoute,
    createHTTPSRedirectRoute,
    createWWWRedirectRoute,
} from "../../src/components/http-route";

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
        it("should create HTTPRoute without rate limiting", (done) => {
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

            pulumi
                .all([route.metadata.name, route.metadata.namespace, route.metadata.annotations])
                .apply(([name, namespace, annotations]) => {
                    expect(name).toBe("web-route");
                    expect(namespace).toBe("web-ns");
                    expect(annotations).toBeUndefined(); // No rate limiting = no annotations
                    done();
                });
        });

        it("should create HTTPRoute with rate limiting annotations", (done) => {
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

            pulumi
                .all([route.metadata.name, route.metadata.annotations])
                .apply(([name, annotations]) => {
                    expect(name).toBe("api-route");
                    expect(annotations).toBeDefined();
                    expect(annotations).toMatchObject({
                        "nginx.org/rate-limit": "10r/s",
                        "nginx.org/rate-limit-burst": "20",
                    });
                    done();
                });
        });

        it("should merge custom labels with default labels", (done) => {
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

            route.metadata.labels.apply((labels: any) => {
                expect(labels).toMatchObject({
                    "app.kubernetes.io/name": "httproute-custom-route",
                    "app.kubernetes.io/component": "routing",
                    "custom-label": "custom-value",
                    environment: "testing",
                });
                done();
            });
        });

        it("should attach to specific listener using sectionName when provided", (done) => {
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
            (route as any).spec.apply((spec: any) => {
                expect(spec.parentRefs).toBeDefined();
                expect(spec.parentRefs[0].sectionName).toBe("https-subdomains-1");
                done();
            });
        });

        it("should not include sectionName when not provided", (done) => {
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
            (route as any).spec.apply((spec: any) => {
                expect(spec.parentRefs).toBeDefined();
                expect(spec.parentRefs[0].sectionName).toBeUndefined();
                done();
            });
        });
    });

    describe("createHTTPSRedirectRoute", () => {
        it("should create HTTPS redirect route for root and wildcard domains", (done) => {
            const route = createHTTPSRedirectRoute({
                namespace: "redirect-ns",
                gatewayName: "gateway",
                gatewayNamespace: "gateway-ns",
                domains: ["aphiria.com", "*.aphiria.com"],
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            pulumi
                .all([route.metadata.name, route.metadata.namespace])
                .apply(([name, namespace]) => {
                    expect(name).toBe("https-redirect");
                    expect(namespace).toBe("redirect-ns");
                    done();
                });
        });

        it("should create HTTPS redirect route for multiple wildcard domains", (done) => {
            const route = createHTTPSRedirectRoute({
                namespace: "default",
                gatewayName: "gateway",
                domains: ["*.pr.aphiria.com", "*.pr-api.aphiria.com"],
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            pulumi
                .all([route.metadata.name, route.metadata.namespace])
                .apply(([name, namespace]) => {
                    expect(name).toBe("https-redirect");
                    expect(namespace).toBe("default");
                    done();
                });
        });

        it("should create HTTPS redirect route for wildcard-only domain", (done) => {
            const route = createHTTPSRedirectRoute({
                namespace: "default",
                gatewayName: "gateway",
                domains: ["*.example.com"],
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            pulumi
                .all([route.metadata.name, route.metadata.namespace])
                .apply(([name, namespace]) => {
                    expect(name).toBe("https-redirect");
                    expect(namespace).toBe("default");
                    done();
                });
        });

        it("should skip http-root listener when skipRootListener is true", (done) => {
            const route = createHTTPSRedirectRoute({
                namespace: "default",
                gatewayName: "gateway",
                domains: ["aphiria.com", "*.aphiria.com"],
                skipRootListener: true,
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            pulumi
                .all([route.metadata.name, route.metadata.namespace])
                .apply(([name, namespace]) => {
                    expect(name).toBe("https-redirect");
                    expect(namespace).toBe("default");
                    done();
                });
        });

        it("should create hostname-based redirect for preview PR domains", (done) => {
            const route = createHTTPSRedirectRoute({
                namespace: "preview-pr-117",
                gatewayName: "nginx-gateway",
                domains: ["117.pr.aphiria.com", "117.pr-api.aphiria.com"],
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            pulumi
                .all([route.metadata.name, route.metadata.namespace])
                .apply(([name, namespace]) => {
                    expect(name).toBe("https-redirect");
                    expect(namespace).toBe("preview-pr-117");
                    done();
                });
        });

        it("should attach to HTTP listeners using sectionName for specific hostnames", (done) => {
            const route = createHTTPSRedirectRoute({
                namespace: "preview-pr-117",
                gatewayName: "nginx-gateway",
                domains: ["117.pr.aphiria.com", "117.pr-api.aphiria.com"],
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            // Cast to any to access spec property (not in mock types)
            (route as any).spec.apply((spec: any) => {
                expect(spec.parentRefs).toBeDefined();
                expect(spec.parentRefs.length).toBe(2); // Both web and api listeners
                expect(spec.parentRefs[0].sectionName).toBe("http-subdomains-1");
                expect(spec.parentRefs[1].sectionName).toBe("http-subdomains-2");
                done();
            });
        });
    });

    describe("createWWWRedirectRoute", () => {
        it("should create WWW redirect route with explicit gateway namespace", (done) => {
            const route = createWWWRedirectRoute({
                namespace: "redirect-ns",
                gatewayName: "gateway",
                gatewayNamespace: "gateway-ns",
                rootDomain: "aphiria.com",
                wwwDomain: "www.aphiria.com",
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            pulumi
                .all([route.metadata.name, route.metadata.namespace])
                .apply(([name, namespace]) => {
                    expect(name).toBe("www-redirect");
                    expect(namespace).toBe("redirect-ns");
                    done();
                });
        });

        it("should create WWW redirect route with default gateway namespace", (done) => {
            const route = createWWWRedirectRoute({
                namespace: "default",
                gatewayName: "gateway",
                rootDomain: "aphiria.com",
                wwwDomain: "www.aphiria.com",
                provider: k8sProvider,
            });

            expect(route).toBeDefined();

            pulumi
                .all([route.metadata.name, route.metadata.namespace])
                .apply(([name, namespace]) => {
                    expect(name).toBe("www-redirect");
                    expect(namespace).toBe("default");
                    done();
                });
        });
    });
});
