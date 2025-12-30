import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createHTTPRoute } from "../http-route";

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
    /** Gateway listener sectionName (e.g., "https-subdomains-1" for preview-pr, "https-subdomains" for production) */
    sectionName: string;
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
 * Creates HTTPRoute for Grafana (HTTPS only, relies on stack-wide HTTP→HTTPS redirect)
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
        sectionName: args.sectionName,
        enableRateLimiting: false,
        labels: args.labels,
        provider: args.provider,
    });

    // Note: HTTP → HTTPS redirect is handled by the stack-wide redirect route
    // created in stack-factory.ts. We don't create a separate redirect here
    // to avoid duplicate resource URNs.

    return {
        httpsRoute,
        httpRedirectRoute: httpsRoute, // Return same route for backward compatibility
    };
}
