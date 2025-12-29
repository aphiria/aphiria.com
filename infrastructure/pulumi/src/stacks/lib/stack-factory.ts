import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {
    installBaseHelmCharts,
    createPostgreSQL,
    createGateway,
    createNamespace,
    createDatabaseCreationJob,
    createWebDeployment,
    createAPIDeployment,
    createDBMigrationJob,
    createHTTPRoute,
    createHTTPSRedirectRoute,
    createWWWRedirectRoute,
    createDNSRecords,
} from "../../components";
import { StackConfig } from "./types";
import {
    WebDeploymentResult,
    APIDeploymentResult,
    PostgreSQLResult,
    GatewayResult,
    NamespaceResult,
} from "../../components/types";

/**
 * Stack resources returned by createStack factory
 */
export interface StackResources {
    helmCharts?: { certManager: k8s.helm.v3.Chart; nginxGateway: k8s.helm.v3.Chart };
    postgres?: PostgreSQLResult;
    gateway?: GatewayResult;
    namespace?: NamespaceResult;
    dbInitJob?: k8s.batch.v1.Job;
    web?: WebDeploymentResult;
    api?: APIDeploymentResult;
    migration?: k8s.batch.v1.Job;
    webRoute?: k8s.apiextensions.CustomResource;
    apiRoute?: k8s.apiextensions.CustomResource;
    httpsRedirect?: k8s.apiextensions.CustomResource;
    wwwRedirect?: k8s.apiextensions.CustomResource;
}

/**
 * Creates a complete infrastructure stack based on configuration
 *
 * This factory function centralizes all infrastructure creation logic,
 * eliminating duplication across local, preview-base, preview-pr, and production stacks.
 *
 * @param config Stack configuration (environment-specific parameters)
 * @param k8sProvider Kubernetes provider for resource creation
 * @returns Object containing all created resources
 */
export function createStack(config: StackConfig, k8sProvider: k8s.Provider): StackResources {
    const resources: StackResources = {};

    const gatewayNamespace = "nginx-gateway";

    // Create custom namespace with ResourceQuota and NetworkPolicy (preview-pr only)
    if (config.namespace) {
        resources.namespace = createNamespace({
            name: config.namespace.name,
            env: config.env,
            resourceQuota: config.namespace.resourceQuota,
            networkPolicy: config.namespace.networkPolicy,
            imagePullSecret: config.namespace.imagePullSecret,
            provider: k8sProvider,
        });
    }

    // Determine namespace (use created namespace or default)
    const namespace = resources.namespace?.namespace.metadata.name || "default";

    // Install Helm charts (cert-manager, nginx-gateway) if not skipped
    if (!config.skipBaseInfrastructure) {
        resources.helmCharts = installBaseHelmCharts({
            env: config.env,
            provider: k8sProvider,
        });
    }

    // Create database (shared PostgreSQL instance OR per-PR database)
    if (config.database.createDatabase && config.database.databaseName) {
        // Preview-PR: Create database on shared instance
        resources.dbInitJob = createDatabaseCreationJob({
            env: config.env,
            namespace,
            databaseName: config.database.databaseName,
            dbHost: config.database.dbHost!,
            dbAdminUser: config.database.dbAdminUser!,
            dbAdminPassword: config.database.dbAdminPassword!,
            provider: k8sProvider,
        });
    } else {
        // Local/Preview-Base: Create PostgreSQL instance
        resources.postgres = createPostgreSQL({
            env: config.env,
            namespace,
            persistentStorage: config.database.persistentStorage,
            storageSize: config.database.storageSize,
            dbUser: String(config.database.dbUser),
            dbPassword: config.database.dbPassword,
            provider: k8sProvider,
        });
    }

    // Create Gateway with TLS if not skipped
    if (!config.skipBaseInfrastructure) {
        resources.gateway = createGateway({
            env: config.env,
            namespace: gatewayNamespace,
            name: "nginx-gateway",
            tlsMode: config.gateway.tlsMode,
            domains: config.gateway.domains,
            dnsToken: config.gateway.dnsToken,
            provider: k8sProvider,
        });

        // Get LoadBalancer IP from nginx-gateway Service
        const gatewayService = k8s.core.v1.Service.get(
            "nginx-gateway-svc",
            pulumi.interpolate`${gatewayNamespace}/nginx-gateway-nginx-gateway-fabric`,
            { provider: k8sProvider }
        );

        resources.gateway.ip = gatewayService.status.loadBalancer.ingress[0].ip;

        // Create DNS records if configured
        if (config.gateway.dns) {
            const dnsResult = createDNSRecords({
                domain: config.gateway.dns.domain,
                loadBalancerIp: resources.gateway.ip,
                records: config.gateway.dns.records,
                ttl: config.gateway.dns.ttl,
            });
            resources.gateway.dnsRecords = dnsResult.records;
        }
    }

    // Deploy applications (skip for preview-base)
    if (config.app) {
        // Determine database connection details
        const dbHost = config.database.createDatabase
            ? config.database.dbHost!
            : config.env === "local"
              ? "db"
              : "db.default.svc.cluster.local";

        const dbName = config.database.databaseName || "postgres";
        const dbUser = config.database.createDatabase
            ? config.database.dbAdminUser!
            : config.database.dbUser;
        const dbPassword = config.database.createDatabase
            ? config.database.dbAdminPassword!
            : config.database.dbPassword;

        // Web deployment
        resources.web = createWebDeployment({
            env: config.env,
            namespace,
            replicas: config.app.webReplicas,
            image: config.app.webImage,
            jsConfigData: {
                apiUri: config.app.apiUrl,
                cookieDomain: config.app.cookieDomain,
            },
            baseUrl: config.app.webUrl,
            logLevel: config.env === "production" ? "warning" : "debug",
            prNumber:
                config.env === "preview" && config.namespace
                    ? config.namespace.name.replace("preview-pr-", "")
                    : undefined,
            imagePullSecrets: config.namespace?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
            resources: config.app.webResources,
            podDisruptionBudget: config.app.webPodDisruptionBudget,
            provider: k8sProvider,
        });

        // API deployment
        resources.api = createAPIDeployment({
            env: config.env,
            namespace,
            replicas: config.app.apiReplicas,
            image: config.app.apiImage,
            dbHost,
            dbName,
            dbUser,
            dbPassword,
            apiUrl: config.app.apiUrl,
            webUrl: config.app.webUrl,
            logLevel: config.env === "production" ? "warning" : "debug",
            cookieDomain: config.app.cookieDomain,
            cookieSecure: config.env !== "local",
            prNumber:
                config.env === "preview" && config.namespace
                    ? config.namespace.name.replace("preview-pr-", "")
                    : undefined,
            imagePullSecrets: config.namespace?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
            resources: config.app.apiResources,
            podDisruptionBudget: config.app.apiPodDisruptionBudget,
            provider: k8sProvider,
        });

        // Database migration job
        resources.migration = createDBMigrationJob({
            env: config.env,
            namespace,
            image: config.app.apiImage,
            dbHost,
            dbName,
            dbUser,
            dbPassword,
            runSeeder: true,
            imagePullSecrets: config.namespace?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
            resources: config.app.migrationResources,
            provider: k8sProvider,
        });

        // HTTPRoutes (always in same namespace as services to avoid cross-namespace ReferenceGrant)
        // For preview-PR, explicitly attach to HTTPS listeners using sectionName
        const isPreviewPR = config.env === "preview" && config.namespace;

        resources.webRoute = createHTTPRoute({
            namespace: namespace,
            name: "web",
            hostname: new URL(config.app.webUrl).hostname,
            serviceName: "web",
            serviceNamespace: namespace,
            servicePort: 80,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            sectionName: isPreviewPR ? "https-subdomains-1" : undefined,
            provider: k8sProvider,
        });

        resources.apiRoute = createHTTPRoute({
            namespace: namespace,
            name: "api",
            hostname: new URL(config.app.apiUrl).hostname,
            serviceName: "api",
            serviceNamespace: namespace,
            servicePort: 80,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            sectionName: isPreviewPR ? "https-subdomains-2" : undefined,
            provider: k8sProvider,
        });

        // HTTP→HTTPS redirect for preview-pr (specific hostnames beat wildcard redirects)
        // This ensures http://123.pr.aphiria.com redirects to https://123.pr.aphiria.com
        if (config.env === "preview" && config.namespace) {
            const webHostname = new URL(config.app.webUrl).hostname;
            const apiHostname = new URL(config.app.apiUrl).hostname;

            resources.httpsRedirect = createHTTPSRedirectRoute({
                namespace: namespace,
                gatewayName: "nginx-gateway",
                gatewayNamespace: gatewayNamespace,
                domains: [webHostname, apiHostname],
                provider: k8sProvider,
            });
        }
    }

    // HTTP→HTTPS redirect (all Gateway-creating stacks)
    if (!config.skipBaseInfrastructure) {
        // Determine if WWW redirect will be created (local and production only)
        const hasWWWRedirect = config.env !== "preview";

        resources.httpsRedirect = createHTTPSRedirectRoute({
            namespace: gatewayNamespace,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            domains: config.gateway.domains,
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
