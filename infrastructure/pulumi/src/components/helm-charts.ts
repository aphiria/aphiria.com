import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { HelmChartArgs } from "./types";

/** Transformation function to validate namespace resources match expected namespace */
export function namespaceTransformation(namespace: pulumi.Input<string>) {
    return (obj: any) => {
        // Ensure namespace exists and matches
        if (obj.kind === "Namespace" && obj.metadata?.name === namespace) {
            return obj;
        }
    };
}

/** Installs cert-manager with Gateway API support */
export function installCertManager(
    args: HelmChartArgs,
    dependsOn?: pulumi.Resource[]
): k8s.helm.v3.Chart {
    return new k8s.helm.v3.Chart(
        "cert-manager",
        {
            chart: "cert-manager",
            version: args.version,
            namespace: args.namespace,
            fetchOpts: {
                repo: args.repository,
            },
            values: {
                crds: {
                    enabled: true,
                },
                extraArgs: ["--feature-gates=ExperimentalGatewayAPISupport=true"],
                ...(args.values || {}),
            },
        },
        {
            provider: args.provider,
            dependsOn,
            transformations: [namespaceTransformation(args.namespace)],
        }
    );
}

/** Installs nginx-gateway-fabric (Gateway API implementation) */
export function installNginxGateway(
    args: HelmChartArgs,
    dependsOn?: pulumi.Resource[]
): k8s.helm.v3.Chart {
    return new k8s.helm.v3.Chart(
        "nginx-gateway",
        {
            chart: "oci://ghcr.io/nginxinc/charts/nginx-gateway-fabric",
            version: args.version,
            namespace: args.namespace,
            values: args.values || {},
        },
        {
            provider: args.provider,
            dependsOn: dependsOn || [],
        }
    );
}

/** Installs cert-manager and nginx-gateway-fabric with correct dependency ordering */
export interface BaseHelmChartsArgs {
    /** Environment */
    env: "local" | "preview" | "production";
    /** Kubernetes provider */
    provider: k8s.Provider;
}

export interface BaseHelmChartsResult {
    certManager: k8s.helm.v3.Chart;
    nginxGateway: k8s.helm.v3.Chart;
}

export function installBaseHelmCharts(args: BaseHelmChartsArgs): BaseHelmChartsResult {
    // Create namespaces
    const certManagerNamespace = new k8s.core.v1.Namespace(
        "cert-manager-namespace",
        {
            metadata: {
                name: "cert-manager",
            },
        },
        { provider: args.provider }
    );

    const nginxGatewayNamespace = new k8s.core.v1.Namespace(
        "nginx-gateway-namespace",
        {
            metadata: {
                name: "nginx-gateway",
            },
        },
        { provider: args.provider }
    );

    // Install cert-manager
    const certManager = installCertManager(
        {
            env: args.env,
            chartName: "cert-manager",
            repository: "https://charts.jetstack.io",
            version: "v1.16.1",
            namespace: "cert-manager",
            provider: args.provider,
        },
        [certManagerNamespace]
    );

    // Install nginx-gateway-fabric (installs Gateway API CRDs automatically)
    const nginxGateway = installNginxGateway(
        {
            env: args.env,
            chartName: "nginx-gateway-fabric",
            repository: "oci://ghcr.io/nginxinc/charts",
            version: "1.2.0",
            namespace: "nginx-gateway",
            provider: args.provider,
        },
        [nginxGatewayNamespace]
    );

    return {
        certManager,
        nginxGateway,
    };
}
