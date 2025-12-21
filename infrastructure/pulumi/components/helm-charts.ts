import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { HelmChartArgs } from "./types";

/** Installs cert-manager with Gateway API support */
export function installCertManager(args: HelmChartArgs, provider?: k8s.Provider): k8s.helm.v3.Chart {
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
                extraArgs: [
                    "--feature-gates=ExperimentalGatewayAPISupport=true",
                ],
                ...(args.values || {}),
            },
        },
        {
            provider,
            transformations: [
                (obj: any) => {
                    // Ensure namespace exists
                    if (obj.kind === "Namespace" && obj.metadata?.name === args.namespace) {
                        return obj;
                    }
                },
            ],
        }
    );
}

/** Installs Gateway API CRDs (required before nginx-gateway-fabric) */
export function installGatewayAPICRDs(provider?: k8s.Provider): k8s.yaml.ConfigFile {
    return new k8s.yaml.ConfigFile(
        "gateway-api-crds",
        {
            file: "https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml",
        },
        {
            provider,
        }
    );
}

/** Installs nginx-gateway-fabric (Gateway API implementation) */
export function installNginxGateway(
    args: HelmChartArgs,
    provider?: k8s.Provider,
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
            provider,
            dependsOn: dependsOn || [],
        }
    );
}

/** Installs cert-manager and nginx-gateway-fabric with correct dependency ordering */
export interface BaseHelmChartsArgs {
    /** Environment */
    env: "local" | "preview" | "production";
    /** Optional Kubernetes provider */
    provider?: k8s.Provider;
}

export interface BaseHelmChartsResult {
    certManager: k8s.helm.v3.Chart;
    gatewayAPICRDs: k8s.yaml.ConfigFile;
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

    // Install Gateway API CRDs first
    const gatewayAPICRDs = installGatewayAPICRDs(args.provider);

    // Install cert-manager
    const certManager = installCertManager({
        env: args.env,
        chartName: "cert-manager",
        repository: "https://charts.jetstack.io",
        version: "v1.16.1",
        namespace: "cert-manager",
    }, args.provider);

    // Install nginx-gateway-fabric (depends on Gateway API CRDs)
    const nginxGateway = installNginxGateway(
        {
            env: args.env,
            chartName: "nginx-gateway-fabric",
            repository: "oci://ghcr.io/nginxinc/charts",
            version: "1.2.0",
            namespace: "nginx-gateway",
        },
        args.provider,
        [gatewayAPICRDs, nginxGatewayNamespace]
    );

    return {
        certManager,
        gatewayAPICRDs,
        nginxGateway,
    };
}
