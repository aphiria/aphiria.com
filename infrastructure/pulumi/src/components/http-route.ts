import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { HTTPRouteArgs } from "./types";

/** Creates Gateway API HTTPRoute with optional rate limiting */
export function createHTTPRoute(args: HTTPRouteArgs): k8s.apiextensions.CustomResource {
    const labels = {
        "app.kubernetes.io/name": `httproute-${args.name}`,
        "app.kubernetes.io/component": "routing",
        ...(args.labels || {}),
    };

    // Build annotations for rate limiting if enabled
    const annotations: Record<string, string> = {};
    if (args.enableRateLimiting) {
        // nginx-gateway-fabric rate limiting annotations
        // These are connection-level limits to prevent abuse
        annotations["nginx.org/rate-limit"] = "10r/s"; // 10 requests per second per IP
        annotations["nginx.org/rate-limit-burst"] = "20"; // Allow bursts up to 20 requests
    }

    return new k8s.apiextensions.CustomResource(
        args.name,
        {
            apiVersion: "gateway.networking.k8s.io/v1",
            kind: "HTTPRoute",
            metadata: {
                name: args.name,
                namespace: args.namespace,
                labels,
                annotations: Object.keys(annotations).length > 0 ? annotations : undefined,
            },
            spec: {
                hostnames: [args.hostname],
                parentRefs: [
                    {
                        name: args.gatewayName,
                        namespace: args.gatewayNamespace,
                        // sectionName omitted - Gateway auto-matches based on hostname
                    },
                ],
                rules: [
                    {
                        backendRefs: [
                            {
                                name: args.serviceName,
                                namespace: args.serviceNamespace,
                                port: args.servicePort,
                            },
                        ],
                        matches: [
                            {
                                path: {
                                    type: "PathPrefix",
                                    value: "/",
                                },
                            },
                        ],
                    },
                ],
            },
        },
        {
            // Ensure Gateway exists before creating HTTPRoute
            dependsOn: [], // Caller should add Gateway as dependency if needed
            provider: args.provider,
        }
    );
}

/** Creates HTTP → HTTPS redirect route */
export interface HTTPSRedirectArgs {
    namespace: pulumi.Input<string>;
    gatewayName: string;
    gatewayNamespace?: pulumi.Input<string>;
    provider: k8s.Provider;
}

export function createHTTPSRedirectRoute(
    args: HTTPSRedirectArgs
): k8s.apiextensions.CustomResource {
    return new k8s.apiextensions.CustomResource(
        "https-redirect",
        {
            apiVersion: "gateway.networking.k8s.io/v1",
            kind: "HTTPRoute",
            metadata: {
                name: "https-redirect",
                namespace: args.namespace,
            },
            spec: {
                parentRefs: [
                    {
                        name: args.gatewayName,
                        namespace: args.gatewayNamespace || args.namespace,
                        sectionName: "http-subdomains",
                    },
                ],
                rules: [
                    {
                        filters: [
                            {
                                type: "RequestRedirect",
                                requestRedirect: {
                                    scheme: "https",
                                    port: 443,
                                },
                            },
                        ],
                    },
                ],
            },
        },
        { provider: args.provider }
    );
}

/** Creates root → www redirect route (e.g., aphiria.com → www.aphiria.com) */
export interface WWWRedirectArgs {
    namespace: pulumi.Input<string>;
    gatewayName: string;
    gatewayNamespace?: pulumi.Input<string>;
    rootDomain: string;
    wwwDomain: string;
    provider: k8s.Provider;
}

export function createWWWRedirectRoute(args: WWWRedirectArgs): k8s.apiextensions.CustomResource {
    return new k8s.apiextensions.CustomResource(
        "www-redirect",
        {
            apiVersion: "gateway.networking.k8s.io/v1",
            kind: "HTTPRoute",
            metadata: {
                name: "www-redirect",
                namespace: args.namespace,
            },
            spec: {
                parentRefs: [
                    {
                        name: args.gatewayName,
                        namespace: args.gatewayNamespace || args.namespace,
                        sectionName: "https-root",
                    },
                    {
                        name: args.gatewayName,
                        namespace: args.gatewayNamespace || args.namespace,
                        sectionName: "http-root",
                    },
                ],
                hostnames: [args.rootDomain],
                rules: [
                    {
                        filters: [
                            {
                                type: "RequestRedirect",
                                requestRedirect: {
                                    scheme: "https",
                                    hostname: args.wwwDomain,
                                    port: 443,
                                },
                            },
                        ],
                    },
                ],
            },
        },
        { provider: args.provider }
    );
}
