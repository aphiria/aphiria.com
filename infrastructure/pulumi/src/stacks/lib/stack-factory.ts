import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as digitalocean from "@pulumi/digitalocean";
import { Environment } from "./types";
import {
    createNamespace,
    createImagePullSecret,
    createHTTPSRedirectRoute,
    createWWWRedirectRoute,
} from "../../components";
import { createMonitoringResources, MonitoringResources } from "./factories/monitoring";
import {
    createBaseInfrastructureResources,
    BaseInfrastructureResources,
} from "./factories/base-infrastructure";
import { createGatewayResources, GatewayResources } from "./factories/gateway";
import { createDatabaseResources, DatabaseResources } from "./factories/database";
import { createApplicationResources, ApplicationResources } from "./factories/applications";
import { createProvider, ProviderResult } from "./factories/provider";
import { NamespaceResult } from "../../components/types";
import { loadConfig, Config } from "./config/loader";

/**
 * Stack resources returned by createStack factory
 */
export interface StackResources {
    // Configuration used to create this stack
    config: Config;

    // Cluster info (only populated for stacks that create clusters: preview-base, production)
    cluster?: digitalocean.KubernetesCluster;
    clusterId?: pulumi.Output<string>;
    kubeconfig?: pulumi.Output<string>;

    baseInfrastructure?: BaseInfrastructureResources;
    gateway?: GatewayResources;
    database?: DatabaseResources;
    namespace?: NamespaceResult;
    imagePullSecret?: k8s.core.v1.Secret;
    applications?: ApplicationResources;
    httpsRedirect?: k8s.apiextensions.CustomResource;
    wwwRedirect?: k8s.apiextensions.CustomResource;
    monitoring?: MonitoringResources;
}

/**
 * Creates a complete infrastructure stack based on configuration
 *
 * This factory function centralizes all infrastructure creation logic,
 * including cluster provisioning (for environments that need it).
 *
 * @param env Environment name (local, preview, production)
 * @param k8sProvider Optional pre-configured Kubernetes provider (for preview-pr)
 * @returns Object containing all created resources
 */
export function createStack(env: Environment, k8sProvider?: k8s.Provider): StackResources {
    // Load configuration
    const config = loadConfig();

    const resources: StackResources = {
        config,
    };

    // Get or create provider
    let provider: k8s.Provider;
    let providerResult: ProviderResult | undefined;

    if (k8sProvider) {
        // Explicit provider passed (local, preview-pr)
        provider = k8sProvider;
    } else {
        // No provider - create cluster (preview-base, production)
        providerResult = createProvider(env as "preview" | "production");
        provider = providerResult.provider;

        // Populate cluster info
        resources.cluster = providerResult.cluster;
        resources.clusterId = providerResult.clusterId;
        resources.kubeconfig = providerResult.kubeconfig;
    }

    const gatewayNamespace = "nginx-gateway";

    // Create custom namespace with ResourceQuota and NetworkPolicy (preview-pr only)
    if (config.namespace?.name) {
        resources.namespace = createNamespace({
            name: config.namespace.name,
            environmentLabel: env,
            resourceQuota: config.namespace.resourceQuota,
            networkPolicy: config.namespace.networkPolicy,
            imagePullSecret: config.namespace.imagePullSecret,
            provider,
        });
    }

    // Determine namespace (use created namespace or default)
    const namespace = resources.namespace?.namespace.metadata.name || "default";

    // Create imagePullSecret if config exists but no custom namespace was created
    // (for production which uses "default" namespace)
    if (config.namespace?.imagePullSecret && !resources.namespace) {
        const result = createImagePullSecret({
            name: "ghcr-pull-secret",
            namespace: "default",
            registry: config.namespace.imagePullSecret.registry,
            username: config.namespace.imagePullSecret.username,
            token: config.namespace.imagePullSecret.token,
            provider,
        });
        resources.imagePullSecret = result.secret;
    }

    // Determine if this is a preview-pr environment (used for Gateway listener sectionName routing)
    const isPreviewPR = env === "preview" && !!config.namespace;

    // Install base infrastructure (cert-manager, nginx-gateway) if not skipped
    if (!config.skipBaseInfrastructure) {
        resources.baseInfrastructure = createBaseInfrastructureResources({
            env,
            provider,
        });
    }

    // Create monitoring stack (if configured)
    const hasMonitoring = config.grafana?.hostname;
    if (hasMonitoring) {
        resources.monitoring = createMonitoringResources({
            env,
            provider,
            monitoringConfig: config.monitoring!,
            prometheusConfig: config.prometheus!,
            grafanaConfig: config.grafana!,
        });
    }

    // Create database (shared PostgreSQL instance OR per-PR database)
    resources.database = createDatabaseResources({
        env,
        provider,
        namespace,
        postgresqlConfig: config.postgresql!,
    });

    // Create Gateway with TLS if not skipped
    if (!config.skipBaseInfrastructure) {
        resources.gateway = createGatewayResources({
            env,
            provider,
            gatewayConfig: config.gateway!,
            baseInfrastructure: resources.baseInfrastructure,
        });
    }

    // Deploy applications (skip for preview-base)
    // Check if app config exists
    const hasAppConfig = config.app?.web?.url;
    if (hasAppConfig) {
        resources.applications = createApplicationResources({
            env,
            provider,
            namespace,
            isPreviewPR,
            hasNamespaceConfig: !!config.namespace,
            appConfig: config.app!,
            postgresqlConfig: config.postgresql!,
            prometheusConfig: config.prometheus!,
            namespaceConfig: config.namespace,
        });
    }

    // HTTP→HTTPS redirect (all Gateway-creating stacks)
    if (!config.skipBaseInfrastructure) {
        // Determine if WWW redirect will be created (local and production only)
        const hasWWWRedirect = env !== "preview";

        resources.httpsRedirect = createHTTPSRedirectRoute({
            namespace: gatewayNamespace,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            domains: config.gateway!.domains,
            // Skip http-root listener when WWW redirect exists to avoid conflicts
            // WWW redirect handles: http://aphiria.com → https://www.aphiria.com (single hop)
            skipRootListener: hasWWWRedirect,
            provider,
        });

        // Root domain → www redirect (only for environments using aphiria.com root domain)
        if (hasWWWRedirect) {
            resources.wwwRedirect = createWWWRedirectRoute({
                namespace: gatewayNamespace,
                gatewayName: "nginx-gateway",
                gatewayNamespace: gatewayNamespace,
                rootDomain: "aphiria.com",
                wwwDomain: "www.aphiria.com",
                provider,
            });
        }
    }

    return resources;
}
