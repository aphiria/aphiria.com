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
} from "../components";
import { StackConfig } from "./types";

/**
 * Stack resources returned by createStack factory
 */
export interface StackResources {
    helmCharts?: any;
    postgres?: any;
    gateway?: any;
    namespace?: any;
    dbInitJob?: any;
    web?: any;
    api?: any;
    migration?: any;
    webRoute?: any;
    apiRoute?: any;
    httpsRedirect?: any;
    wwwRedirect?: any;
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
 *
 * @example Local environment
 * ```typescript
 * const k8sProvider = new k8s.Provider("minikube", { context: "minikube" });
 * const stack = createStack({
 *   env: "local",
 *   database: { replicas: 1, persistentStorage: true, storageSize: "5Gi", dbUser: "postgres", dbPassword: "postgres" },
 *   gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
 *   app: { webReplicas: 1, apiReplicas: 1, webUrl: "https://www.aphiria.com", apiUrl: "https://api.aphiria.com", ... }
 * }, k8sProvider);
 * ```
 */
export function createStack(config: StackConfig, k8sProvider: k8s.Provider): StackResources {
    const resources: StackResources = {};

    // Determine namespace (default or custom)
    const namespace = config.namespace?.name || "default";
    const gatewayNamespace = config.env === "local" ? "nginx-gateway" : "nginx-gateway";

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

    // Install Helm charts (cert-manager, nginx-gateway) - skip for local (already installed)
    if (config.env !== "local") {
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
            replicas: config.database.replicas,
            persistentStorage: config.database.persistentStorage,
            storageSize: config.database.storageSize,
            dbUser: String(config.database.dbUser),
            dbPassword: config.database.dbPassword,
            provider: k8sProvider,
        });
    }

    // Create Gateway with TLS
    resources.gateway = createGateway({
        env: config.env,
        namespace: gatewayNamespace,
        name: "nginx-gateway",
        tlsMode: config.gateway.tlsMode,
        domains: config.gateway.domains,
        dnsToken: config.gateway.dnsToken,
        provider: k8sProvider,
    });

    // Deploy applications (skip for preview-base)
    if (config.app) {
        // Determine database connection details
        const dbHost = config.database.createDatabase
            ? config.database.dbHost!
            : (config.env === "local" ? "db" : "db.default.svc.cluster.local");

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
                cookieDomain: config.app.cookieDomain || (config.env === "local" ? ".aphiria.com" : ".pr.aphiria.com"),
            },
            baseUrl: config.app.webUrl,
            envConfig: config.env === "preview" && config.namespace ? {
                appEnv: "preview",
                logLevel: "debug",
                prNumber: config.namespace.name.replace("preview-pr-", ""),
            } : undefined,
            imagePullSecrets: config.namespace?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
            resources: config.app.webResources,
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
            envConfig: config.env === "preview" && config.namespace ? {
                appEnv: "preview",
                logLevel: "debug",
                cookieDomain: config.app.cookieDomain || ".pr.aphiria.com",
                prNumber: config.namespace.name.replace("preview-pr-", ""),
            } : undefined,
            imagePullSecrets: config.namespace?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
            resources: config.app.apiResources,
            provider: k8sProvider,
        });

        // Database migration job
        resources.migration = createDBMigrationJob({
            env: config.env,
            namespace,
            image: config.app.apiImage,
            dbHost: String(dbHost),
            dbName,
            dbUser: String(dbUser),
            dbPassword,
            runSeeder: true,
            provider: k8sProvider,
        });

        // HTTPRoutes
        resources.webRoute = createHTTPRoute({
            namespace: config.namespace ? gatewayNamespace : namespace,
            name: config.namespace ? `${config.namespace.name}-web` : "web",
            hostname: new URL(config.app.webUrl).hostname,
            serviceName: "web",
            servicePort: 80,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            provider: k8sProvider,
        });

        resources.apiRoute = createHTTPRoute({
            namespace: config.namespace ? gatewayNamespace : namespace,
            name: config.namespace ? `${config.namespace.name}-api` : "api",
            hostname: new URL(config.app.apiUrl).hostname,
            serviceName: "api",
            servicePort: 80,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            provider: k8sProvider,
        });

        // HTTP/HTTPS redirect routes (local only)
        if (config.env === "local") {
            resources.httpsRedirect = createHTTPSRedirectRoute({
                namespace: gatewayNamespace,
                gatewayName: "nginx-gateway",
                gatewayNamespace: gatewayNamespace,
                provider: k8sProvider,
            });

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
