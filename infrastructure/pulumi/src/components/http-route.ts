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

/**
 * Creates HTTP → HTTPS redirect route for all domains
 *
 * When skipRootListener is true (typically when WWW redirect is enabled), this route
 * will NOT attach to the http-root listener, allowing the WWW redirect to handle
 * http://example.com → https://www.example.com in a single hop.
 */
export interface HTTPSRedirectArgs {
    namespace: pulumi.Input<string>;
    gatewayName: string;
    gatewayNamespace?: pulumi.Input<string>;
    domains: string[];
    /** Skip http-root listener (used when WWW redirect handles root domain) */
    skipRootListener?: boolean;
    provider: k8s.Provider;
}

export function createHTTPSRedirectRoute(
    args: HTTPSRedirectArgs
): k8s.apiextensions.CustomResource {
    // Separate wildcard domains from specific hostnames
    const rootDomain = args.domains.find((d) => !d.startsWith("*") && !d.includes(".pr."));
    const wildcardDomains = args.domains.filter((d) => d.startsWith("*"));
    const specificHostnames = args.domains.filter((d) => !d.startsWith("*") && d.includes(".pr."));

    // If we have specific hostnames (e.g., "117.pr.aphiria.com"), use hostname-based matching
    // instead of sectionName - let Gateway auto-match based on hostname
    if (specificHostnames.length > 0) {
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
                            // No sectionName - let Gateway auto-match based on hostnames
                        },
                    ],
                    hostnames: specificHostnames,
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

    // Build parentRefs for all HTTP listeners (for wildcard/root domains)
    const parentRefs: Array<{
        name: string;
        namespace: pulumi.Input<string>;
        sectionName: string;
    }> = [];

    // Add root domain HTTP listener if exists and not skipped
    // (Skip when WWW redirect is enabled to avoid conflicts)
    if (rootDomain && !args.skipRootListener) {
        parentRefs.push({
            name: args.gatewayName,
            namespace: args.gatewayNamespace || args.namespace,
            sectionName: "http-root",
        });
    }

    // Add wildcard domain HTTP listeners
    wildcardDomains.forEach((_, index) => {
        parentRefs.push({
            name: args.gatewayName,
            namespace: args.gatewayNamespace || args.namespace,
            sectionName:
                wildcardDomains.length === 1 ? "http-subdomains" : `http-subdomains-${index + 1}`,
        });
    });

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
                parentRefs,
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
