import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { HelmChartArgs } from "./types";

/**
 * Installs cert-manager with Gateway API support
 *
 * @param args - Helm chart configuration
 * @param dependsOn - Optional resources to wait for
 * @returns Helm Chart resource
 */
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
                // Resource limits for cert-manager components
                resources: {
                    requests: {
                        cpu: "50m",
                        memory: "128Mi",
                    },
                    limits: {
                        cpu: "100m",
                        memory: "256Mi",
                    },
                },
                webhook: {
                    resources: {
                        requests: {
                            cpu: "25m",
                            memory: "64Mi",
                        },
                        limits: {
                            cpu: "50m",
                            memory: "128Mi",
                        },
                    },
                },
                cainjector: {
                    resources: {
                        requests: {
                            cpu: "50m",
                            memory: "256Mi",
                        },
                        limits: {
                            cpu: "100m",
                            memory: "512Mi",
                        },
                    },
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

/**
 * Transform function to ignore DigitalOcean-managed annotations on LoadBalancer Service (v4 syntax)
 *
 * DO cloud controller adds these annotations after deployment, causing drift.
 *
 * @param args - Resource transform arguments
 * @returns Transform result with ignoreChanges options
 * @internal - Exported for testing only
 */
export function ignoreDigitalOceanServiceAnnotationsV4(args: pulumi.ResourceTransformArgs) {
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

/**
 * Installs nginx-gateway-fabric (Gateway API implementation)
 *
 * @param args - Helm chart configuration
 * @param dependsOn - Optional resources to wait for
 * @returns Helm Chart resource
 */
export function installNginxGateway(
    args: HelmChartArgs,
    dependsOn?: pulumi.Resource[]
): k8s.helm.v4.Chart {
    // Build resource options - transforms not supported in Pulumi mock runtime (tests)
    const resourceOptions: pulumi.CustomResourceOptions = {
        provider: args.provider,
        dependsOn: dependsOn || [],
    };

    // Only add transforms in non-test environments (mock runtime doesn't support them)
    /* istanbul ignore next - production-only transform configuration */
    if (process.env.NODE_ENV !== "test") {
        resourceOptions.transforms = [ignoreDigitalOceanServiceAnnotationsV4];
    }

    return new k8s.helm.v4.Chart(
        "nginx-gateway",
        {
            chart: "oci://ghcr.io/nginxinc/charts/nginx-gateway-fabric",
            version: args.version,
            namespace: args.namespace,
            values: args.values || {},
        },
        resourceOptions
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

/**
 * Installs kube-prometheus-stack (Prometheus Operator + Prometheus + kube-state-metrics)
 *
 * @param args - Helm chart configuration
 * @param dependsOn - Optional resources to wait for
 * @returns Helm Chart resource
 */
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
            // v4 Chart installs CRDs by default (skipCrds: false is default)
            // This properly handles the CRD subchart dependency
            // Note: Admission webhooks are disabled in monitoring.ts to avoid Helm hook issues
            values: {
                // Enable CRD subchart dependency (required for kube-prometheus-stack)
                // The chart has a "crds" subchart that is conditionally included
                crds: {
                    enabled: true,
                },
                /* istanbul ignore next - defensive fallback, args.values always provided in practice */
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
 * Installs cert-manager and nginx-gateway-fabric with correct dependency ordering
 *
 * @param args - Configuration for base Helm charts
 * @returns cert-manager and nginx-gateway Chart resources
 */
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
            values: {
                nginxGateway: {
                    snippetsFilters: {
                        enable: true,
                    },
                },
            },
        },
        nginxGatewayDependencies
    );

    return {
        certManager,
        nginxGateway,
    };
}
