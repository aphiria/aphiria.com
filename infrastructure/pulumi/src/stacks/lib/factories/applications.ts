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
    const { env, provider, namespace, isPreviewPR, hasNamespaceConfig } = args;

    // Read configuration
    const appConfig = new pulumi.Config("app").requireObject<AppConfig>("");
    const postgresqlConfig = new pulumi.Config("postgresql").requireObject<PostgreSQLConfig>("");
    const prometheusConfig = new pulumi.Config("prometheus").requireObject<PrometheusConfig>("");
    const namespaceConfig = new pulumi.Config("namespace").getObject<NamespaceConfig>("");

    const gatewayNamespace = "nginx-gateway";

    // Determine database connection details
    const createDatabase = postgresqlConfig.createDatabase;
    const dbHost = createDatabase
        ? postgresqlConfig.dbHost
        : env === "local"
          ? "db"
          : "db.default.svc.cluster.local";

    const dbName = postgresqlConfig.databaseName || "postgres";
    const dbUser = postgresqlConfig.user;
    const dbPassword = postgresqlConfig.password;

    // Get PR number from namespace name if it's a preview-pr
    const prNumber = hasNamespaceConfig && namespaceConfig
        ? namespaceConfig.name.replace("preview-pr-", "")
        : undefined;

    // Web deployment
    const web = createWebDeployment({
        namespace,
        replicas: appConfig.web.replicas,
        image: appConfig.web.image,
        imagePullPolicy: appConfig.imagePullPolicy,
        appEnv: env,
        jsConfigData: {
            apiUri: appConfig.api.url,
            cookieDomain: appConfig.web.cookieDomain,
        },
        baseUrl: appConfig.web.url,
        prNumber: env === "preview" && hasNamespaceConfig ? prNumber : undefined,
        imagePullSecrets:
            hasNamespaceConfig && namespaceConfig?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
        resources: appConfig.web.resources as any,
        podDisruptionBudget: appConfig.web.podDisruptionBudget as any,
        provider,
    });

    // API deployment
    const api = createAPIDeployment({
        namespace,
        replicas: appConfig.api.replicas,
        image: appConfig.api.image,
        imagePullPolicy: appConfig.imagePullPolicy,
        appEnv: env,
        dbHost,
        dbName,
        dbUser,
        dbPassword,
        apiUrl: appConfig.api.url,
        webUrl: appConfig.web.url,
        logLevel: appConfig.api.logLevel,
        prNumber: env === "preview" && hasNamespaceConfig ? prNumber : undefined,
        imagePullSecrets:
            hasNamespaceConfig && namespaceConfig?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
        resources: appConfig.api.resources as any,
        podDisruptionBudget: appConfig.api.podDisruptionBudget as any,
        prometheusAuthToken: pulumi.secret(prometheusConfig.authToken),
        provider,
    });

    // Database migration job
    const migration = createDBMigrationJob({
        namespace,
        image: appConfig.api.image,
        imagePullPolicy: appConfig.imagePullPolicy,
        dbHost,
        dbName,
        dbUser,
        dbPassword,
        runSeeder: true,
        imagePullSecrets:
            hasNamespaceConfig && namespaceConfig?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
        resources: appConfig.migration.resources as any,
        provider,
    });

    // HTTPRoutes (always in same namespace as services to avoid cross-namespace ReferenceGrant)
    // Explicitly attach to HTTPS listeners using sectionName to prevent attaching to HTTP listeners
    // (which would prevent HTTP→HTTPS redirects from working)
    const webRoute = createHTTPRoute({
        namespace: namespace,
        name: "web",
        hostname: new URL(appConfig.web.url).hostname,
        serviceName: "web",
        serviceNamespace: namespace,
        servicePort: 80,
        gatewayName: "nginx-gateway",
        gatewayNamespace: gatewayNamespace,
        sectionName: isPreviewPR ? "https-subdomains-1" : "https-subdomains",
        provider,
    });

    const apiRoute = createHTTPRoute({
        namespace: namespace,
        name: "api",
        hostname: new URL(appConfig.api.url).hostname,
        serviceName: "api",
        serviceNamespace: namespace,
        servicePort: 80,
        gatewayName: "nginx-gateway",
        gatewayNamespace: gatewayNamespace,
        sectionName: isPreviewPR ? "https-subdomains-2" : "https-subdomains",
        provider,
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
        namespace: namespace,
        serviceName: "api",
        targetPort: 80,
        metricsPath: "/metrics",
        scrapeInterval: prometheusConfig.scrapeInterval,
        authToken: pulumi.secret(prometheusConfig.authToken),
        provider,
    });

    // HTTP→HTTPS redirect for preview-pr (specific hostnames beat wildcard redirects)
    // This ensures http://123.pr.aphiria.com redirects to https://123.pr.aphiria.com
    if (env === "preview" && hasNamespaceConfig) {
        const webHostname = new URL(appConfig.web.url).hostname;
        const apiHostname = new URL(appConfig.api.url).hostname;

        resources.httpsRedirect = createHTTPSRedirectRoute({
            namespace: namespace,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            domains: [webHostname, apiHostname],
            provider,
        });
    }

    return resources;
}
