import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { Environment } from "../types";
import {
    createWebDeployment,
    createAPIDeployment,
    createDBMigrationJob,
    createHTTPRoute,
    createHTTPSRedirectRoute,
} from "../../../components";
import { createApiServiceMonitor } from "../../../components/api-service-monitor";
import { WebDeploymentResult, APIDeploymentResult } from "../../../components/types";
import { ApiServiceMonitorResult } from "../../../components/api-service-monitor";
import { AppConfig, PostgreSQLConfig, PrometheusConfig, NamespaceConfig } from "../config/types";

/**
 * Application resources
 */
export interface ApplicationResources {
    web: WebDeploymentResult;
    api: APIDeploymentResult;
    migration: k8s.batch.v1.Job;
    webRoute: k8s.apiextensions.CustomResource;
    apiRoute: k8s.apiextensions.CustomResource;
    apiServiceMonitor?: ApiServiceMonitorResult;
    httpsRedirect?: k8s.apiextensions.CustomResource;
}

/**
 * Arguments for creating application resources
 */
export interface ApplicationResourcesArgs {
    env: Environment;
    provider: k8s.Provider;
    namespace: pulumi.Output<string> | string;
    isPreviewPR: boolean;
    hasNamespaceConfig: boolean;
    appConfig: AppConfig;
    postgresqlConfig: PostgreSQLConfig;
    prometheusConfig: PrometheusConfig;
    namespaceConfig?: NamespaceConfig;
}

/**
 * Creates application resources (web, API, migrations, routes, monitoring)
 *
 * This factory handles:
 * - Web deployment (nginx + static files)
 * - API deployment (nginx + PHP-FPM)
 * - Database migration job
 * - HTTPRoutes for web and API
 * - ServiceMonitor for API metrics (if configured)
 * - HTTP->HTTPS redirect for preview-pr (if applicable)
 *
 * @param args - Application resources configuration
 * @returns Application resources
 */
export function createApplicationResources(args: ApplicationResourcesArgs): ApplicationResources {
    const gatewayNamespace = "nginx-gateway";

    // Determine database connection details
    const createDatabase = args.postgresqlConfig.createDatabase;
    const dbHost = args.postgresqlConfig.host;

    // databaseName is required when createDatabase is true (preview-PR pattern)
    if (createDatabase && !args.postgresqlConfig.databaseName) {
        throw new Error("postgresqlConfig.databaseName is required when createDatabase is true");
    }
    const dbName = args.postgresqlConfig.databaseName || "postgres";

    const dbUser = args.postgresqlConfig.user;
    const dbPassword = args.postgresqlConfig.password;

    // Get PR number from namespace name if it's a preview-pr
    const prNumber =
        args.hasNamespaceConfig && args.namespaceConfig?.name
            ? args.namespaceConfig.name.replace("preview-pr-", "")
            : undefined;

    // Web deployment
    const web = createWebDeployment({
        namespace: args.namespace,
        replicas: args.appConfig.web.replicas,
        image: args.appConfig.web.image,
        imagePullPolicy: args.appConfig.imagePullPolicy,
        appEnv: args.env,
        jsConfigData: {
            apiUri: args.appConfig.api.url,
            cookieDomain: args.appConfig.web.cookieDomain,
        },
        baseUrl: args.appConfig.web.url,
        prNumber: args.env === "preview" && args.hasNamespaceConfig ? prNumber : undefined,
        imagePullSecrets: args.namespaceConfig?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
        resources: args.appConfig.web.resources,
        podDisruptionBudget: args.appConfig.web.podDisruptionBudget,
        provider: args.provider,
    });

    // API deployment
    const api = createAPIDeployment({
        namespace: args.namespace,
        replicas: args.appConfig.api.replicas,
        image: args.appConfig.api.image,
        imagePullPolicy: args.appConfig.imagePullPolicy,
        appEnv: args.env,
        dbHost,
        dbName,
        dbUser,
        dbPassword,
        apiUrl: args.appConfig.api.url,
        webUrl: args.appConfig.web.url,
        logLevel: args.appConfig.api.logLevel,
        prNumber: args.env === "preview" && args.hasNamespaceConfig ? prNumber : undefined,
        imagePullSecrets: args.namespaceConfig?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
        resources: args.appConfig.api.resources,
        podDisruptionBudget: args.appConfig.api.podDisruptionBudget,
        prometheusAuthToken: pulumi.secret(args.prometheusConfig.authToken),
        provider: args.provider,
    });

    // Database migration job
    const migration = createDBMigrationJob({
        namespace: args.namespace,
        image: args.appConfig.api.image,
        imagePullPolicy: args.appConfig.imagePullPolicy,
        dbHost,
        dbName,
        dbUser,
        dbPassword,
        runSeeder: true,
        imagePullSecrets: args.namespaceConfig?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
        resources: args.appConfig.migration.resources,
        provider: args.provider,
    });

    // HTTPRoutes (always in same namespace as services to avoid cross-namespace ReferenceGrant)
    // Explicitly attach to HTTPS listeners using sectionName to prevent attaching to HTTP listeners
    // (which would prevent HTTP→HTTPS redirects from working)
    const webRoute = createHTTPRoute({
        namespace: args.namespace,
        name: "web",
        hostname: new URL(args.appConfig.web.url).hostname,
        serviceName: "web",
        serviceNamespace: args.namespace,
        servicePort: 80,
        gatewayName: "nginx-gateway",
        gatewayNamespace: gatewayNamespace,
        sectionName: args.isPreviewPR ? "https-subdomains-1" : "https-subdomains",
        provider: args.provider,
    });

    const apiRoute = createHTTPRoute({
        namespace: args.namespace,
        name: "api",
        hostname: new URL(args.appConfig.api.url).hostname,
        serviceName: "api",
        serviceNamespace: args.namespace,
        servicePort: 80,
        gatewayName: "nginx-gateway",
        gatewayNamespace: gatewayNamespace,
        sectionName: args.isPreviewPR ? "https-subdomains-2" : "https-subdomains",
        provider: args.provider,
    });

    const resources: ApplicationResources = {
        web,
        api,
        migration,
        webRoute,
        apiRoute,
    };

    // ServiceMonitor for API metrics (if prometheus auth token is configured)
    resources.apiServiceMonitor = createApiServiceMonitor({
        namespace: args.namespace,
        serviceName: "api",
        targetPort: 80,
        metricsPath: "/metrics",
        scrapeInterval: args.prometheusConfig.scrapeInterval,
        authToken: pulumi.secret(args.prometheusConfig.authToken),
        provider: args.provider,
    });

    // HTTP→HTTPS redirect for preview-pr (specific hostnames beat wildcard redirects)
    // This ensures http://123.pr.aphiria.com redirects to https://123.pr.aphiria.com
    if (args.isPreviewPR) {
        const webHostname = new URL(args.appConfig.web.url).hostname;
        const apiHostname = new URL(args.appConfig.api.url).hostname;

        resources.httpsRedirect = createHTTPSRedirectRoute({
            namespace: args.namespace,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            domains: [webHostname, apiHostname],
            provider: args.provider,
        });
    }

    return resources;
}
