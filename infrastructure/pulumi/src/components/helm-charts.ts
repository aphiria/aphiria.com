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
 * Transformation to inject init container that waits for Prometheus CRDs
 *
 * Problem: Helm installs CRDs and operator pods in parallel, causing race condition
 * where operator starts before CRDs are registered in Kubernetes API.
 *
 * Solution: Inject init container into operator deployment that blocks pod startup
 * until critical CRDs are established.
 *
 * @param obj - Kubernetes resource object from Helm chart
 * @returns Transformed object with init container added to operator deployment
 * @internal - Exported for testing only
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function injectPrometheusCRDWaitInitContainer(obj: any): any {
    // Only transform the Prometheus Operator deployment
    if (
        obj.kind === "Deployment" &&
        obj.metadata?.name?.includes("kube-prometheus-stack-operator")
    ) {
        // Add init container that waits for CRDs to be established
        obj.spec.template.spec.initContainers = [
            ...(obj.spec.template.spec.initContainers || []),
            {
                name: "wait-for-prometheus-crds",
                image: "bitnami/kubectl:1.28",
                command: ["sh", "-c"],
                args: [
                    `
                        echo "⏳ Waiting for Prometheus CRDs to be established..."
                        kubectl wait --for condition=established --timeout=300s \
                            crd/prometheuses.monitoring.coreos.com \
                            crd/servicemonitors.monitoring.coreos.com \
                            crd/prometheusrules.monitoring.coreos.com 2>/dev/null || {
                            echo "⚠️  kubectl wait failed, falling back to polling..."
                            TIMEOUT=300
                            ELAPSED=0
                            for crd in prometheuses.monitoring.coreos.com servicemonitors.monitoring.coreos.com prometheusrules.monitoring.coreos.com; do
                                until kubectl get crd $crd 2>/dev/null; do
                                    if [ $ELAPSED -ge $TIMEOUT ]; then
                                        echo "❌ Timeout waiting for CRD $crd after \${TIMEOUT}s"
                                        exit 1
                                    fi
                                    echo "CRD $crd not ready yet, waiting... (\${ELAPSED}s elapsed)"
                                    sleep 2
                                    ELAPSED=$((ELAPSED + 2))
                                done
                                echo "✅ CRD $crd is ready"
                            done
                        }
                        echo "✅ All Prometheus CRDs are ready, operator can start"
                    `,
                ],
                securityContext: {
                    allowPrivilegeEscalation: false,
                    readOnlyRootFilesystem: true,
                    runAsNonRoot: true,
                    runAsUser: 65534, // nobody user
                    capabilities: {
                        drop: ["ALL"],
                    },
                },
            },
        ];
    }
    return obj;
}

/**
 * Installs kube-prometheus-stack (Prometheus Operator + Prometheus + kube-state-metrics)
 *
 * Race condition fix: Uses Pulumi transformations to inject an init container into the
 * Prometheus Operator deployment. The init container waits for CRDs to be established
 * before allowing the operator pod to start, preventing the operator from starting
 * before CRDs are registered in the Kubernetes API.
 *
 * @param args - Helm chart configuration
 * @param dependsOn - Optional resources to wait for
 * @returns Helm Chart resource
 */
export function installKubePrometheusStack(
    args: HelmChartArgs,
    dependsOn?: pulumi.Resource[]
): k8s.helm.v4.Chart {
    // Build resource options with transformation
    const resourceOptions: pulumi.CustomResourceOptions = {
        provider: args.provider,
        dependsOn,
    };

    // Only add transformation in non-test environments (mock runtime doesn't support them)
    /* istanbul ignore next - production-only transformation */
    if (process.env.NODE_ENV !== "test") {
        resourceOptions.transformations = [injectPrometheusCRDWaitInitContainer];
    }

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
            // Helm installs CRDs and workloads in parallel, but our transformation
            // ensures the operator waits for CRDs via init container
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
        resourceOptions
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
