import * as k8s from "@pulumi/kubernetes";
import { Environment } from "../types";
import { installBaseHelmCharts } from "../../../components";

/**
 * Base infrastructure resources
 */
export interface BaseInfrastructureResources {
    helmCharts: { certManager: k8s.helm.v4.Chart; nginxGateway: k8s.helm.v4.Chart };
    gatewayApiCrds?: k8s.yaml.ConfigFile;
}

/**
 * Arguments for creating base infrastructure resources
 */
export interface BaseInfrastructureResourcesArgs {
    env: Environment;
    provider: k8s.Provider;
}

/**
 * Creates base infrastructure resources (cert-manager, nginx-gateway, Gateway API CRDs)
 *
 * This factory handles environment-specific base infrastructure setup:
 * - Local: Installs Gateway API CRDs, GatewayClass, then Helm charts
 * - Cloud (preview/production): Only installs Helm charts (DigitalOcean pre-installs CRDs via Cilium)
 *
 * @param args - Base infrastructure resources configuration
 * @returns Base infrastructure resources
 */
export function createBaseInfrastructureResources(
    args: BaseInfrastructureResourcesArgs
): BaseInfrastructureResources {
    const { env, provider } = args;

    const baseInfrastructure: Partial<BaseInfrastructureResources> = {};

    // For local environment: Install Gateway API CRDs first
    // DigitalOcean Kubernetes (preview/production) pre-installs these via Cilium
    if (env === "local") {
        const gatewayApiCrds = new k8s.yaml.ConfigFile(
            "gateway-api-crds",
            {
                file: "https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml",
            },
            {
                provider,
            }
        );

        // Install Helm charts with nginx-gateway depending on CRDs
        // NOTE: nginx-gateway-fabric Helm chart creates the GatewayClass automatically
        baseInfrastructure.helmCharts = installBaseHelmCharts({
            env,
            provider,
            nginxGatewayDependencies: [gatewayApiCrds],
        });

        baseInfrastructure.gatewayApiCrds = gatewayApiCrds;
    } else {
        // Preview/Production: No CRDs needed, just install Helm charts
        baseInfrastructure.helmCharts = installBaseHelmCharts({
            env,
            provider,
        });
    }

    return baseInfrastructure as BaseInfrastructureResources;
}
