import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { Environment } from "./types";
import {
    createNamespace,
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
import { NamespaceResult } from "../../components/types";

/**
 * Stack resources returned by createStack factory
 */
export interface StackResources {
    baseInfrastructure?: BaseInfrastructureResources;
    gateway?: GatewayResources;
    database?: DatabaseResources;
    namespace?: NamespaceResult;
    applications?: ApplicationResources;
    httpsRedirect?: k8s.apiextensions.CustomResource;
    wwwRedirect?: k8s.apiextensions.CustomResource;
    monitoring?: MonitoringResources;
}

/**
 * Creates a complete infrastructure stack based on configuration
 *
 * This factory function centralizes all infrastructure creation logic,
 * eliminating duplication across local, preview-base, preview-pr, and production stacks.
 *
 * @param env Environment name (local, preview, production)
 * @param k8sProvider Kubernetes provider for resource creation
 * @returns Object containing all created resources
 */
export function createStack(env: Environment, k8sProvider: k8s.Provider): StackResources {
    const resources: StackResources = {};

    // Read all configuration from Pulumi config
    const config = new pulumi.Config();
    const appConfig = new pulumi.Config("app");
    const gatewayConfig = new pulumi.Config("gateway");
    const grafanaConfig = new pulumi.Config("grafana");
    const namespaceConfig = new pulumi.Config("namespace");
    const ghcrConfig = new pulumi.Config("ghcr");

    const gatewayNamespace = "nginx-gateway";

    // Check if we need to skip base infrastructure (for preview-pr stacks)
    const skipBaseInfrastructure = config.getBoolean("skipBaseInfrastructure");

    // Create custom namespace with ResourceQuota and NetworkPolicy (preview-pr only)
    // Check if namespace config exists (only for preview-pr)
    const hasNamespaceConfig = namespaceConfig.get("name");
    if (hasNamespaceConfig) {
        const imagePullSecret = ghcrConfig.get("username")
            ? {
                  registry: "ghcr.io",
                  username: ghcrConfig.require("username"),
                  token: ghcrConfig.requireSecret("token"),
              }
            : undefined;

        resources.namespace = createNamespace({
            name: namespaceConfig.require("name"),
            environmentLabel: env,
            resourceQuota: namespaceConfig.getObject("resourceQuota"),
            networkPolicy: namespaceConfig.getObject("networkPolicy"),
            imagePullSecret: imagePullSecret,
            provider: k8sProvider,
        });
    }

    // Determine namespace (use created namespace or default)
    const namespace = resources.namespace?.namespace.metadata.name || "default";

    // Determine if this is a preview-pr environment (used for Gateway listener sectionName routing)
    const isPreviewPR = env === "preview" && hasNamespaceConfig;

    // Install base infrastructure (cert-manager, nginx-gateway) if not skipped
    if (!skipBaseInfrastructure) {
        resources.baseInfrastructure = createBaseInfrastructureResources({
            env,
            provider: k8sProvider,
        });
    }

    // Create monitoring stack (if configured)
    const hasMonitoring = grafanaConfig.get("hostname");
    if (hasMonitoring) {
        resources.monitoring = createMonitoringResources({
            env,
            provider: k8sProvider,
        });
    }

    // Create database (shared PostgreSQL instance OR per-PR database)
    resources.database = createDatabaseResources({
        env,
        provider: k8sProvider,
        namespace,
    });

    // Create Gateway with TLS if not skipped
    if (!skipBaseInfrastructure) {
        resources.gateway = createGatewayResources({
            env,
            provider: k8sProvider,
            baseInfrastructure: resources.baseInfrastructure,
        });
    }

    // Deploy applications (skip for preview-base)
    // Check if app config exists
    const hasAppConfig = appConfig.get("web:url");
    if (hasAppConfig) {
        resources.applications = createApplicationResources({
            env,
            provider: k8sProvider,
            namespace,
            isPreviewPR: !!isPreviewPR,
            hasNamespaceConfig: !!hasNamespaceConfig,
        });
    }

    // HTTP→HTTPS redirect (all Gateway-creating stacks)
    if (!skipBaseInfrastructure) {
        // Determine if WWW redirect will be created (local and production only)
        const hasWWWRedirect = env !== "preview";

        resources.httpsRedirect = createHTTPSRedirectRoute({
            namespace: gatewayNamespace,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            domains: gatewayConfig.requireObject<string[]>("domains"),
            // Skip http-root listener when WWW redirect exists to avoid conflicts
            // WWW redirect handles: http://aphiria.com → https://www.aphiria.com (single hop)
            skipRootListener: hasWWWRedirect,
            provider: k8sProvider,
        });

        // Root domain → www redirect (only for environments using aphiria.com root domain)
        if (hasWWWRedirect) {
            resources.wwwRedirect = createWWWRedirectRoute({
                namespace: gatewayNamespace,
                gatewayName: "nginx-gateway",
                gatewayNamespace: gatewayNamespace,
                rootDomain: "aphiria.com",
                wwwDomain: "www.aphiria.com",
                provider: k8sProvider,
            });
        }
    }

    return resources;
}
