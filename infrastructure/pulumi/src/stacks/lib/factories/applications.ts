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
    const appConfig = new pulumi.Config("app");
    const postgresqlConfig = new pulumi.Config("postgresql");
    const prometheusConfig = new pulumi.Config("prometheus");
    const ghcrConfig = new pulumi.Config("ghcr");
    const namespaceConfig = new pulumi.Config("namespace");

    const gatewayNamespace = "nginx-gateway";

    // Determine database connection details
    const createDatabase = postgresqlConfig.getBoolean("createDatabase");
    const dbHost = createDatabase
        ? postgresqlConfig.require("dbHost")
        : env === "local"
          ? "db"
          : "db.default.svc.cluster.local";

    const dbName = postgresqlConfig.get("databaseName") || "postgres";
    const dbUser = postgresqlConfig.require("user");
    const dbPassword = postgresqlConfig.requireSecret("password");

    // Get PR number from namespace name if it's a preview-pr
    const prNumber = hasNamespaceConfig
        ? namespaceConfig.require("name").replace("preview-pr-", "")
        : undefined;

    // Web deployment
    const web = createWebDeployment({
        namespace,
        replicas: appConfig.requireNumber("web:replicas"),
        image: appConfig.require("web:image"),
        imagePullPolicy: appConfig.require("imagePullPolicy"),
        appEnv: env,
        jsConfigData: {
            apiUri: appConfig.require("api:url"),
            cookieDomain: appConfig.require("web:cookieDomain"),
        },
        baseUrl: appConfig.require("web:url"),
        prNumber: env === "preview" && hasNamespaceConfig ? prNumber : undefined,
        imagePullSecrets:
            hasNamespaceConfig && ghcrConfig.get("username") ? ["ghcr-pull-secret"] : undefined,
        resources: appConfig.requireObject("web:resources") as any,
        podDisruptionBudget: appConfig.getObject("web:podDisruptionBudget") as any,
        provider,
    });

    // API deployment
    const api = createAPIDeployment({
        namespace,
        replicas: appConfig.requireNumber("api:replicas"),
        image: appConfig.require("api:image"),
        imagePullPolicy: appConfig.require("imagePullPolicy"),
        appEnv: env,
        dbHost,
        dbName,
        dbUser,
        dbPassword,
        apiUrl: appConfig.require("api:url"),
        webUrl: appConfig.require("web:url"),
        logLevel: appConfig.require("api:logLevel"),
        prNumber: env === "preview" && hasNamespaceConfig ? prNumber : undefined,
        imagePullSecrets:
            hasNamespaceConfig && ghcrConfig.get("username") ? ["ghcr-pull-secret"] : undefined,
        resources: appConfig.requireObject("api:resources") as any,
        podDisruptionBudget: appConfig.getObject("api:podDisruptionBudget") as any,
        prometheusAuthToken: prometheusConfig.getSecret("authToken"),
        provider,
    });

    // Database migration job
    const migration = createDBMigrationJob({
        namespace,
        image: appConfig.require("api:image"),
        imagePullPolicy: appConfig.require("imagePullPolicy"),
        dbHost,
        dbName,
        dbUser,
        dbPassword,
        runSeeder: true,
        imagePullSecrets:
            hasNamespaceConfig && ghcrConfig.get("username") ? ["ghcr-pull-secret"] : undefined,
        resources: appConfig.requireObject("migration:resources") as any,
        provider,
    });

    // HTTPRoutes (always in same namespace as services to avoid cross-namespace ReferenceGrant)
    // Explicitly attach to HTTPS listeners using sectionName to prevent attaching to HTTP listeners
    // (which would prevent HTTP→HTTPS redirects from working)
    const webRoute = createHTTPRoute({
        namespace: namespace,
        name: "web",
        hostname: new URL(appConfig.require("web:url")).hostname,
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
        hostname: new URL(appConfig.require("api:url")).hostname,
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
    const authToken = prometheusConfig.getSecret("authToken");
    if (authToken) {
        resources.apiServiceMonitor = createApiServiceMonitor({
            namespace: namespace,
            serviceName: "api",
            targetPort: 80,
            metricsPath: "/metrics",
            scrapeInterval: prometheusConfig.require("scrapeInterval"),
            authToken: authToken,
            provider,
        });
    }

    // HTTP→HTTPS redirect for preview-pr (specific hostnames beat wildcard redirects)
    // This ensures http://123.pr.aphiria.com redirects to https://123.pr.aphiria.com
    if (env === "preview" && hasNamespaceConfig) {
        const webHostname = new URL(appConfig.require("web:url")).hostname;
        const apiHostname = new URL(appConfig.require("api:url")).hostname;

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
