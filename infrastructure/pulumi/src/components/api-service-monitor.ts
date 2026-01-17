import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

/**
 * Arguments for API ServiceMonitor
 */
export interface ApiServiceMonitorArgs {
    /** Kubernetes namespace where API is deployed */
    namespace: pulumi.Input<string>;
    /** Name of the API service to scrape */
    serviceName: pulumi.Input<string>;
    /** Target port number on the pod to scrape (e.g., 80) */
    targetPort: pulumi.Input<number>;
    /** Path to scrape metrics from (e.g., "/metrics") */
    metricsPath: string;
    /** Scrape interval (e.g., "15s") */
    scrapeInterval: string;
    /** Auth token for Bearer authentication */
    authToken: pulumi.Input<string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Result from creating API ServiceMonitor
 */
export interface ApiServiceMonitorResult {
    /** Secret containing the auth token in the app namespace */
    secret: k8s.core.v1.Secret;
    /** Secret containing the auth token in the monitoring namespace (for Prometheus) */
    monitoringSecret: k8s.core.v1.Secret;
    /** ServiceMonitor resource */
    serviceMonitor: k8s.apiextensions.CustomResource;
}

/**
 * Creates a ServiceMonitor for the API /metrics endpoint with Bearer token authentication
 *
 * Prometheus Operator watches for ServiceMonitor resources and automatically configures
 * Prometheus to scrape the specified endpoints.
 *
 * @param args - Configuration for the ServiceMonitor
 * @returns Secret and ServiceMonitor metadata
 */
export function createApiServiceMonitor(args: ApiServiceMonitorArgs): ApiServiceMonitorResult {
    // Create Secret for auth token in the app namespace
    const secret = new k8s.core.v1.Secret(
        "prometheus-api-auth",
        {
            metadata: {
                name: "prometheus-api-auth",
                namespace: args.namespace,
            },
            type: "Opaque",
            stringData: {
                token: args.authToken,
            },
        },
        {
            provider: args.provider,
            protect: false,
            retainOnDelete: false,
            replaceOnChanges: ["*"],
            deleteBeforeReplace: true,
        }
    );

    // Create copy of secret in monitoring namespace for Prometheus Operator
    // Prometheus can only access secrets in its own namespace (monitoring)
    // Name is suffixed with app namespace to avoid conflicts (e.g., prometheus-api-auth-preview-pr-148)
    const monitoringSecret = new k8s.core.v1.Secret(
        "prometheus-api-auth-monitoring",
        {
            metadata: {
                name: pulumi.interpolate`prometheus-api-auth-${args.namespace}`,
                namespace: "monitoring",
            },
            type: "Opaque",
            stringData: {
                token: args.authToken,
            },
        },
        {
            provider: args.provider,
            protect: false,
            retainOnDelete: false,
            replaceOnChanges: ["*"],
            deleteBeforeReplace: true,
        }
    );

    // Create ServiceMonitor CRD
    // Note: bearerTokenSecret is the official Kubernetes API field name
    const serviceMonitor = new k8s.apiextensions.CustomResource(
        "api-metrics",
        {
            apiVersion: "monitoring.coreos.com/v1",
            kind: "ServiceMonitor",
            metadata: {
                name: "api-metrics",
                namespace: args.namespace,
                labels: {
                    app: "api",
                    component: "metrics",
                    release: "kube-prometheus-stack", // Required for Prometheus Operator to discover this ServiceMonitor
                },
            },
            spec: {
                selector: {
                    matchLabels: {
                        app: "api",
                    },
                },
                endpoints: [
                    {
                        targetPort: args.targetPort,
                        path: args.metricsPath,
                        interval: args.scrapeInterval,
                        bearerTokenSecret: {
                            name: monitoringSecret.metadata.name,
                            key: "token",
                        },
                    },
                ],
            },
        },
        { provider: args.provider, dependsOn: [secret, monitoringSecret] }
    );

    return { secret, monitoringSecret, serviceMonitor };
}
