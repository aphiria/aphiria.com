import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { HelmChartArgs } from "./types";

/** Installs cert-manager with Gateway API support */
export function installCertManager(
    args: HelmChartArgs,
    dependsOn?: pulumi.Resource[]
): k8s.helm.v4.Chart {
    return new k8s.helm.v4.Chart(
        "cert-manager",
        {
            chart: "cert-manager",
            version: args.version,
            namespace: args.namespace,
            repositoryOpts: {
                repo: args.repository,
            },
            // v4 Chart installs CRDs by default (skipCrds: false is default)
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
        }
    );
}

/**
 * Transform function to ignore DigitalOcean-managed annotations on LoadBalancer Service (v4 syntax)
 * DO cloud controller adds these annotations after deployment, causing drift
 */
function ignoreDigitalOceanServiceAnnotationsV4(args: pulumi.ResourceTransformArgs) {
    if (args.type === "kubernetes:core/v1:Service") {
        return {
            props: args.props,
            opts: pulumi.mergeOptions(args.opts, {
                ignoreChanges: [
                    'metadata.annotations["kubernetes.digitalocean.com/load-balancer-id"]',
                    'metadata.annotations["service.beta.kubernetes.io/do-loadbalancer-type"]',
                ],
            }),
        };
    }
    return undefined;
}

/** Installs nginx-gateway-fabric (Gateway API implementation) */
export function installNginxGateway(
    args: HelmChartArgs,
    dependsOn?: pulumi.Resource[]
): k8s.helm.v4.Chart {
    return new k8s.helm.v4.Chart(
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
            transforms: [ignoreDigitalOceanServiceAnnotationsV4],
        }
    );
}

/** Installs cert-manager and nginx-gateway-fabric with correct dependency ordering */
export interface BaseHelmChartsArgs {
    /** Environment */
    env: "local" | "preview" | "production";
    /** Kubernetes provider */
    provider: k8s.Provider;
    /** Additional dependencies for nginx-gateway (e.g., Gateway API CRDs for local) */
    nginxGatewayDependencies?: pulumi.Resource[];
}

export interface BaseHelmChartsResult {
    certManager: k8s.helm.v4.Chart;
    nginxGateway: k8s.helm.v4.Chart;
}

/** Installs kube-prometheus-stack (Prometheus Operator + Prometheus + kube-state-metrics) */
export function installKubePrometheusStack(
    args: HelmChartArgs,
    dependsOn?: pulumi.Resource[]
): k8s.helm.v4.Chart {
    return new k8s.helm.v4.Chart(
        "kube-prometheus-stack",
        {
            chart: "kube-prometheus-stack",
            version: args.version,
            namespace: args.namespace,
            repositoryOpts: {
                repo: args.repository,
            },
            // Skip waiting for resources to be ready to avoid deadlock:
            // Operator Deployment needs Secret from webhook Jobs, but Jobs run via Helm hooks
            // which only execute after chart upgrade completes. Setting skipAwait breaks this cycle.
            skipAwait: true,
            // v4 Chart installs CRDs by default (skipCrds: false is default)
            // This properly handles the CRD subchart dependency
            values: {
                // Enable CRD subchart dependency (required for kube-prometheus-stack)
                // The chart has a "crds" subchart that is conditionally included
                crds: {
                    enabled: true,
                },
                ...(args.values || {}),
            },
        },
        {
            provider: args.provider,
            dependsOn,
        }
    );
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

    // Install nginx-gateway-fabric
    // NOTE: Chart does NOT install Gateway API CRDs - they must be installed separately
    // - Local: Stack passes CRDs via nginxGatewayDependencies
    // - Preview/Production: DigitalOcean Kubernetes pre-installs them via Cilium
    const nginxGatewayDependencies = [
        nginxGatewayNamespace,
        ...(args.nginxGatewayDependencies || []),
    ];
    const nginxGateway = installNginxGateway(
        {
            env: args.env,
            chartName: "nginx-gateway-fabric",
            repository: "oci://ghcr.io/nginxinc/charts",
            version: "1.2.0",
            namespace: "nginx-gateway",
            provider: args.provider,
        },
        nginxGatewayDependencies
    );

    return {
        certManager,
        nginxGateway,
    };
}
