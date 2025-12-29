import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createHTTPRoute, createHTTPSRedirectRoute } from "../http-route";

export interface GrafanaIngressArgs {
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Grafana service name */
    serviceName: string;
    /** Grafana service port */
    servicePort: number;
    /** Gateway name to attach to */
    gatewayName: string;
    /** Gateway namespace */
    gatewayNamespace: pulumi.Input<string>;
    /** Hostname for Grafana (e.g., "grafana.aphiria.com") */
    hostname: string;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

export interface GrafanaIngressResult {
    httpsRoute: k8s.apiextensions.CustomResource;
    httpRedirectRoute: k8s.apiextensions.CustomResource;
}

/**
 * Creates HTTPRoute for Grafana with HTTP → HTTPS redirect
 */
export function createGrafanaIngress(args: GrafanaIngressArgs): GrafanaIngressResult {
    // Create HTTPS route for Grafana
    const httpsRoute = createHTTPRoute({
        namespace: args.namespace,
        name: "grafana-https",
        hostname: args.hostname,
        serviceName: args.serviceName,
        serviceNamespace: args.namespace,
        servicePort: args.servicePort,
        gatewayName: args.gatewayName,
        gatewayNamespace: args.gatewayNamespace,
        sectionName: "https",
        enableRateLimiting: false,
        labels: args.labels,
        provider: args.provider,
    });

    // Create HTTP → HTTPS redirect for Grafana
    const httpRedirectRoute = createHTTPSRedirectRoute({
        namespace: args.namespace,
        gatewayName: args.gatewayName,
        gatewayNamespace: args.gatewayNamespace,
        domains: [args.hostname],
        skipRootListener: false,
        provider: args.provider,
    });

    return {
        httpsRoute,
        httpRedirectRoute,
    };
}
