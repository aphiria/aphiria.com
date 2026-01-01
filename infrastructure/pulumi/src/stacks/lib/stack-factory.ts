import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {
    installBaseHelmCharts,
    installKubePrometheusStack,
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
import { createGrafana } from "../../components/grafana";
import { createGrafanaIngress, GrafanaIngressResult } from "../../components/grafana-ingress";
import { createDashboards } from "../../components/dashboards";
import {
    createApiServiceMonitor,
    ApiServiceMonitorResult,
} from "../../components/api-service-monitor";
import * as path from "path";
import { StackConfig } from "./types";
import {
    WebDeploymentResult,
    APIDeploymentResult,
    PostgreSQLResult,
    GatewayResult,
    NamespaceResult,
    GrafanaResult,
} from "../../components/types";

/**
 * Stack resources returned by createStack factory
 */
export interface StackResources {
    helmCharts?: { certManager: k8s.helm.v4.Chart; nginxGateway: k8s.helm.v4.Chart };
    postgres?: PostgreSQLResult;
    gateway?: GatewayResult;
    namespace?: NamespaceResult;
    dbInitJob?: k8s.batch.v1.Job;
    web?: WebDeploymentResult;
    api?: APIDeploymentResult;
    migration?: k8s.batch.v1.Job;
    webRoute?: k8s.apiextensions.CustomResource;
    apiRoute?: k8s.apiextensions.CustomResource;
    apiServiceMonitor?: ApiServiceMonitorResult;
    httpsRedirect?: k8s.apiextensions.CustomResource;
    wwwRedirect?: k8s.apiextensions.CustomResource;
    monitoring?: {
        namespace: NamespaceResult;
        kubePrometheusStack: k8s.helm.v4.Chart;
        grafana: GrafanaResult;
        grafanaIngress: GrafanaIngressResult;
    };
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

    // Determine if this is a preview-pr environment (used for Gateway listener sectionName routing)
    const isPreviewPR = config.env === "preview" && config.namespace;

    // Install base infrastructure (cert-manager, nginx-gateway) if not skipped
    if (!config.skipBaseInfrastructure) {
        // For local environment: Install Gateway API CRDs and GatewayClass first
        // DigitalOcean Kubernetes (preview/production) pre-installs these via Cilium
        if (config.env === "local") {
            const gatewayApiCrds = new k8s.yaml.ConfigFile(
                "gateway-api-crds",
                {
                    file: "https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml",
                },
                {
                    provider: k8sProvider,
                }
            );

            // Create GatewayClass for nginx-gateway-fabric
            // NOTE: nginx-gateway-fabric Helm chart does NOT create the GatewayClass
            // The controller expects it to exist and will manage Gateway resources that reference it
            const gatewayClass = new k8s.apiextensions.CustomResource(
                "nginx-gatewayclass",
                {
                    apiVersion: "gateway.networking.k8s.io/v1",
                    kind: "GatewayClass",
                    metadata: {
                        name: "nginx",
                    },
                    spec: {
                        controllerName: "gateway.nginx.org/nginx-gateway-controller",
                    },
                },
                {
                    provider: k8sProvider,
                    dependsOn: [gatewayApiCrds],
                }
            );

            // Install Helm charts with nginx-gateway depending on CRDs and GatewayClass
            resources.helmCharts = installBaseHelmCharts({
                env: config.env,
                provider: k8sProvider,
                nginxGatewayDependencies: [gatewayApiCrds, gatewayClass],
            });
        } else {
            // Preview/Production: No CRDs needed, just install Helm charts
            resources.helmCharts = installBaseHelmCharts({
                env: config.env,
                provider: k8sProvider,
            });
        }
    }

    // Create monitoring namespace and components (if enabled)
    if (config.monitoring) {
        const monitoringNamespace = createNamespace({
            name: "monitoring",
            env: config.env,
            resourceQuota: {
                cpu: "4",
                memory: "16Gi",
                pods: "30",
            },
            labels: {
                "app.kubernetes.io/component": "monitoring",
            },
            provider: k8sProvider,
        });

        // Install kube-prometheus-stack (Prometheus Operator + Prometheus + kube-state-metrics + Alertmanager)
        const kubePrometheusStack = installKubePrometheusStack(
            {
                env: config.env,
                chartName: "kube-prometheus-stack",
                repository: "https://prometheus-community.github.io/helm-charts",
                version: "70.10.0",
                namespace: "monitoring",
                provider: k8sProvider,
                values: {
                    prometheus: {
                        prometheusSpec: {
                            retention: config.monitoring.prometheus.retentionTime || "7d",
                            scrapeInterval: config.monitoring.prometheus.scrapeInterval || "15s",
                            storageSpec: {
                                volumeClaimTemplate: {
                                    spec: {
                                        accessModes: ["ReadWriteOnce"],
                                        resources: {
                                            requests: {
                                                storage: config.monitoring.prometheus.storageSize,
                                            },
                                        },
                                    },
                                },
                            },
                            externalLabels: {
                                environment: config.env,
                            },
                            // Resource limits for Prometheus container (required by ResourceQuota)
                            resources: config.monitoring.prometheus.resources || {
                                requests: {
                                    cpu: "500m",
                                    memory: "1Gi",
                                },
                                limits: {
                                    cpu: "1",
                                    memory: "2Gi",
                                },
                            },
                        },
                    },
                    // Prometheus Operator resource limits (required by ResourceQuota)
                    prometheusOperator: {
                        resources: {
                            requests: {
                                cpu: "100m",
                                memory: "128Mi",
                            },
                            limits: {
                                cpu: "200m",
                                memory: "256Mi",
                            },
                        },
                        // Resource limits for config-reloader sidecar (required by ResourceQuota)
                        // These are passed as operator flags: --config-reloader-cpu-request, etc.
                        prometheusConfigReloader: {
                            resources: {
                                requests: {
                                    cpu: "50m",
                                    memory: "50Mi",
                                },
                                limits: {
                                    cpu: "100m",
                                    memory: "100Mi",
                                },
                            },
                        },
                        // Disable TLS/admission webhooks to work around Helm Chart v4 limitation
                        // Pulumi Helm Chart v4 doesn't support Helm hooks, so webhook cert Jobs never run
                        // Bug: Volume mount controlled by tls.enabled, not admissionWebhooks.enabled
                        tls: {
                            enabled: false,
                        },
                        admissionWebhooks: {
                            enabled: false,
                        },
                    },
                    // Node exporter resource limits (required by ResourceQuota)
                    "prometheus-node-exporter": {
                        resources: {
                            requests: {
                                cpu: "50m",
                                memory: "64Mi",
                            },
                            limits: {
                                cpu: "100m",
                                memory: "128Mi",
                            },
                        },
                    },
                    // kube-state-metrics resource limits (required by ResourceQuota)
                    "kube-state-metrics": {
                        enabled: true,
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
                    },
                    // Disable Grafana (we manage it separately)
                    grafana: {
                        enabled: false,
                    },
                    // Disable Alertmanager (using Grafana Unified Alerting instead)
                    alertmanager: {
                        enabled: false,
                    },
                },
            },
            [monitoringNamespace.namespace]
        );

        const dashboards = createDashboards({
            namespace: "monitoring",
            // Use process.cwd() which is the pulumi project root (infrastructure/pulumi)
            dashboardDir: path.join(process.cwd(), "dashboards"),
            provider: k8sProvider,
        });

        const grafana = createGrafana({
            env: config.env,
            namespace: "monitoring",
            // kube-prometheus-stack creates Prometheus with name kube-prometheus-stack-prometheus
            prometheusUrl:
                "http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090",
            storageSize: config.monitoring.grafana.storageSize,
            githubClientId: config.monitoring.grafana.githubOAuth.clientId,
            githubClientSecret: config.monitoring.grafana.githubOAuth.clientSecret,
            githubOrg: config.monitoring.grafana.githubOAuth.org,
            adminUser: config.monitoring.grafana.githubOAuth.adminUser,
            smtpHost: config.monitoring.grafana.smtp?.host,
            smtpPort: config.monitoring.grafana.smtp?.port,
            smtpUser: config.monitoring.grafana.smtp?.user,
            smtpPassword: config.monitoring.grafana.smtp?.password,
            smtpFromAddress: config.monitoring.grafana.smtp?.fromAddress,
            alertEmail: config.monitoring.grafana.smtp?.alertEmail,
            basicAuthUser: config.monitoring.grafana.basicAuth?.user,
            basicAuthPassword: config.monitoring.grafana.basicAuth?.password,
            dashboardsConfigMap: dashboards.configMap,
            provider: k8sProvider,
        });

        const grafanaIngress = createGrafanaIngress({
            namespace: "monitoring",
            serviceName: "grafana",
            servicePort: 80,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            hostname: config.monitoring.grafana.hostname,
            // Use numbered listener for preview-pr, unnumbered for production/preview-base
            // https-subdomains-3 is for *.pr-grafana.aphiria.com
            /* istanbul ignore next - sectionName varies by environment (preview-pr vs other) */
            sectionName: isPreviewPR ? "https-subdomains-3" : "https-subdomains",
            provider: k8sProvider,
        });

        resources.monitoring = {
            namespace: monitoringNamespace,
            kubePrometheusStack,
            grafana,
            grafanaIngress,
        };
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
            // Ensure cert-manager CRDs are ready before creating ClusterIssuer/Certificate
            certManagerDependency: resources.helmCharts?.certManager,
        });

        // Create DNS records if configured
        // Only fetch LoadBalancer IP if we need it for DNS
        if (config.gateway.dns) {
            const gatewayService = k8s.core.v1.Service.get(
                "nginx-gateway-svc",
                pulumi.interpolate`${gatewayNamespace}/nginx-gateway-nginx-gateway-fabric`,
                {
                    provider: k8sProvider,
                    dependsOn: resources.helmCharts?.nginxGateway
                        ? [resources.helmCharts.nginxGateway]
                        : [],
                }
            );

            resources.gateway.ip = gatewayService.status.loadBalancer.ingress[0].ip;

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
            prometheusAuthToken: config.monitoring!.prometheus.authToken,
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
        // Explicitly attach to HTTPS listeners using sectionName to prevent attaching to HTTP listeners
        // (which would prevent HTTP→HTTPS redirects from working)
        resources.webRoute = createHTTPRoute({
            namespace: namespace,
            name: "web",
            hostname: new URL(config.app.webUrl).hostname,
            serviceName: "web",
            serviceNamespace: namespace,
            servicePort: 80,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            sectionName: isPreviewPR ? "https-subdomains-1" : "https-subdomains",
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
            sectionName: isPreviewPR ? "https-subdomains-2" : "https-subdomains",
            provider: k8sProvider,
        });

        // ServiceMonitor for API metrics (if monitoring is configured)
        if (config.monitoring) {
            resources.apiServiceMonitor = createApiServiceMonitor({
                namespace: namespace,
                serviceName: "api",
                targetPort: 80,
                metricsPath: "/metrics",
                scrapeInterval: config.monitoring.prometheus.scrapeInterval || "15s",
                authToken: config.monitoring.prometheus.authToken,
                provider: k8sProvider,
            });
        }

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
