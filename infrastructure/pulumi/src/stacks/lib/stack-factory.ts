import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { Environment } from "./types";
import {
    installBaseHelmCharts,
    installKubePrometheusStack,
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
import { createGrafana, GrafanaResult } from "../../components/grafana";
import { createPostgreSQL, PostgreSQLResult } from "../../components/database";
import { createPrometheus, PrometheusResult } from "../../components/prometheus";
import { createGrafanaIngress, GrafanaIngressResult } from "../../components/grafana-ingress";
import { createGrafanaAlerts } from "../../components/grafana-alerts";
import { createDashboards } from "../../components/dashboards";
import {
    createApiServiceMonitor,
    ApiServiceMonitorResult,
} from "../../components/api-service-monitor";
import * as path from "path";
import {
    WebDeploymentResult,
    APIDeploymentResult,
    GatewayResult,
    NamespaceResult,
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
 * @param env Environment name (local, preview, production)
 * @param k8sProvider Kubernetes provider for resource creation
 * @returns Object containing all created resources
 */
export function createStack(env: Environment, k8sProvider: k8s.Provider): StackResources {
    const resources: StackResources = {};

    // Read all configuration from Pulumi config
    const config = new pulumi.Config();
    const appConfig = new pulumi.Config("app");
    const postgresqlConfig = new pulumi.Config("postgresql");
    const gatewayConfig = new pulumi.Config("gateway");
    const prometheusConfig = new pulumi.Config("prometheus");
    const grafanaConfig = new pulumi.Config("grafana");
    const namespaceConfig = new pulumi.Config("namespace");
    const ghcrConfig = new pulumi.Config("ghcr");
    const certManagerConfig = new pulumi.Config("certmanager");

    const gatewayNamespace = "nginx-gateway";

    // Check if we need to skip base infrastructure (for preview-pr stacks)
    const skipBaseInfrastructure = config.getBoolean("skipBaseInfrastructure");

    // Create custom namespace with ResourceQuota and NetworkPolicy (preview-pr only)
    // Check if namespace config exists (only for preview-pr)
    const hasNamespaceConfig = namespaceConfig.get("name");
    if (hasNamespaceConfig) {
        const imagePullSecret = ghcrConfig.get("username") ? {
            registry: "ghcr.io",
            username: ghcrConfig.require("username"),
            token: ghcrConfig.requireSecret("token"),
        } : undefined;

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
        // For local environment: Install Gateway API CRDs and GatewayClass first
        // DigitalOcean Kubernetes (preview/production) pre-installs these via Cilium
        if (env === "local") {
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
                env: env,
                provider: k8sProvider,
                nginxGatewayDependencies: [gatewayApiCrds, gatewayClass],
            });
        } else {
            // Preview/Production: No CRDs needed, just install Helm charts
            resources.helmCharts = installBaseHelmCharts({
                env: env,
                provider: k8sProvider,
            });
        }
    }

    // Create monitoring namespace and components (if enabled)
    // Check if monitoring is configured
    const hasMonitoring = grafanaConfig.get("hostname");
    if (hasMonitoring) {
        const monitoringNamespace = createNamespace({
            name: "monitoring",
            environmentLabel: env,
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
                env: env,
                chartName: "kube-prometheus-stack",
                repository: "https://prometheus-community.github.io/helm-charts",
                version: "70.10.0",
                namespace: "monitoring",
                provider: k8sProvider,
                values: {
                    prometheus: {
                        prometheusSpec: {
                            retention: prometheusConfig.require("retentionTime"),
                            scrapeInterval: prometheusConfig.require("scrapeInterval"),
                            storageSpec: {
                                volumeClaimTemplate: {
                                    spec: {
                                        accessModes: ["ReadWriteOnce"],
                                        resources: {
                                            requests: {
                                                storage: prometheusConfig.require("storageSize"),
                                            },
                                        },
                                    },
                                },
                            },
                            externalLabels: {
                                environment: env,
                            },
                            // Resource limits for Prometheus container (required by ResourceQuota)
                            resources: prometheusConfig.requireObject("resources"),
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

        // Create Grafana Unified Alerting provisioning ConfigMaps
        // Environment-specific contact point configuration
        // Production: email contact point for real alerts
        // Preview/Local: use Grafana's default contact point (won't send without SMTP)
        const contactPoints =
            env === "production"
                ? [
                      {
                          name: "email-admin",
                          receivers: [
                              {
                                  uid: "email-admin",
                                  type: "email",
                                  settings: {
                                      addresses: grafanaConfig.require("alertEmail"),
                                      singleEmail: true,
                                      subject:
                                          '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.environment }} {{ (index .Alerts 0).Annotations.summary }}',
                                  },
                                  disableResolveMessage: false,
                              },
                          ],
                      },
                  ]
                : [
                      {
                          name: "local-notifications",
                          receivers: [
                              {
                                  uid: "local-notifications",
                                  type: "email",
                                  settings: {
                                      addresses: "devnull@localhost",
                                  },
                                  disableResolveMessage: true,
                              },
                          ],
                      },
                  ];

        const alerts = createGrafanaAlerts({
            namespace: "monitoring",
            environment: env,
            contactPoints,
            defaultReceiver: env === "production" ? "email-admin" : "local-notifications",
            provider: k8sProvider,
        });

        const grafana = createGrafana({
            replicas: grafanaConfig.requireNumber("replicas"),
            resources: grafanaConfig.requireObject("resources"),
            namespace: "monitoring",
            // kube-prometheus-stack creates Prometheus with name kube-prometheus-stack-prometheus
            prometheusUrl:
                "http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090",
            storageSize: grafanaConfig.require("storageSize"),
            domain: grafanaConfig.require("hostname"),
            imageVersion: grafanaConfig.require("version"),
            githubAuth: grafanaConfig.get("githubClientId") ? {
                clientId: grafanaConfig.requireSecret("githubClientId"),
                clientSecret: grafanaConfig.requireSecret("githubClientSecret"),
                organization: grafanaConfig.require("githubOrg"),
                adminUser: grafanaConfig.require("adminUser"),
            } : undefined,
            smtp: grafanaConfig.getSecret("smtpHost") ? {
                host: grafanaConfig.requireSecret("smtpHost"),
                port: grafanaConfig.requireNumber("smtpPort"),
                user: grafanaConfig.requireSecret("smtpUser"),
                password: grafanaConfig.requireSecret("smtpPassword"),
                fromAddress: grafanaConfig.require("smtpFromAddress"),
            } : undefined,
            basicAuth: grafanaConfig.getSecret("basicAuthUser") ? {
                username: grafanaConfig.requireSecret("basicAuthUser"),
                password: grafanaConfig.requireSecret("basicAuthPassword"),
            } : undefined,
            dashboardsConfigMap: dashboards.configMap,
            alertRulesConfigMap: alerts.alertRulesConfigMap,
            contactPointsConfigMap: alerts.contactPointsConfigMap,
            notificationPoliciesConfigMap: alerts.notificationPoliciesConfigMap,
            provider: k8sProvider,
        });

        const grafanaIngress = createGrafanaIngress({
            namespace: "monitoring",
            serviceName: "grafana",
            servicePort: 80,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            hostname: grafanaConfig.require("hostname"),
            // Preview: pr-grafana.aphiria.com uses https-root (exact match)
            // Production: grafana.aphiria.com uses https-subdomains (*.aphiria.com wildcard)
            /* istanbul ignore next - sectionName varies by environment (preview vs production) */
            sectionName: env === "preview" ? "https-root" : "https-subdomains",
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
    const createDatabase = postgresqlConfig.getBoolean("createDatabase");
    const databaseName = postgresqlConfig.get("databaseName");

    if (createDatabase && databaseName) {
        // Preview-PR: Create database on shared instance
        resources.dbInitJob = createDatabaseCreationJob({
            namespace,
            databaseName: postgresqlConfig.require("databaseName"),
            dbHost: postgresqlConfig.require("dbHost"),
            dbAdminUser: postgresqlConfig.require("user"),
            dbAdminPassword: postgresqlConfig.requireSecret("password"),
            provider: k8sProvider,
        });
    } else {
        // Local/Preview-Base: Create PostgreSQL instance
        resources.postgres = createPostgreSQL({
            username: postgresqlConfig.require("user"),
            password: postgresqlConfig.requireSecret("password"),
            replicas: 1,
            resources: postgresqlConfig.requireObject("resources"),
            healthCheck: {
                interval: "10s",
                timeout: "5s",
                retries: 5,
                command: ["pg_isready", "-U", "postgres"],
            },
            connectionPooling: {
                maxConnections: 100,
            },
            namespace,
            storage: {
                enabled: postgresqlConfig.requireBoolean("persistentStorage"),
                size: postgresqlConfig.require("storageSize"),
                accessMode: "ReadWriteOnce",
                // Use hostPath for local development
                useHostPath: env === "local",
                hostPath: env === "local" ? "/mnt/data" : undefined,
            },
            imageTag: postgresqlConfig.require("version"),
            databaseName: "postgres",
            provider: k8sProvider,
        });
    }

    // Create Gateway with TLS if not skipped
    if (!skipBaseInfrastructure) {
        const dnsToken = certManagerConfig.getSecret("digitaloceanDnsToken");

        resources.gateway = createGateway({
            requireRootAndWildcard: env === "production",
            namespace: gatewayNamespace,
            name: "nginx-gateway",
            tlsMode: gatewayConfig.require("tlsMode") as "self-signed" | "letsencrypt-prod",
            domains: gatewayConfig.requireObject<string[]>("domains"),
            dnsToken: dnsToken,
            provider: k8sProvider,
            // Ensure cert-manager CRDs are ready before creating ClusterIssuer/Certificate
            certManagerDependency: resources.helmCharts?.certManager,
        });

        // Create DNS records if configured
        // Fetch LoadBalancer IP from nginx-gateway Chart resources
        /* istanbul ignore next - Chart.resources is only populated at runtime, cannot be mocked in unit tests */
        const dnsConfig = gatewayConfig.getObject("dns");
        if (dnsConfig && resources.helmCharts?.nginxGateway) {
            // Workaround for Pulumi bug #16395: Service.get() doesn't respect dependsOn
            // Use Chart v4's .resources output to get the Service directly from child resources
            const gatewayServiceOutput = resources.helmCharts.nginxGateway.resources.apply(
                (chartResources) => {
                    const service = chartResources.find(
                        (r) =>
                            r.__pulumiType === "kubernetes:core/v1:Service" &&
                            r.__name ===
                                "nginx-gateway:nginx-gateway/nginx-gateway-nginx-gateway-fabric"
                    );
                    if (!service) {
                        throw new Error("Could not find nginx-gateway Service in Chart resources");
                    }
                    return service as k8s.core.v1.Service;
                }
            );

            resources.gateway.ip = gatewayServiceOutput.status.loadBalancer.ingress[0].ip;

            // Type the DNS config properly
            interface DNSConfig {
                domain: string;
                records: Array<{
                    name: string;
                    resourceName: string;
                }>;
                ttl?: number;
            }

            const typedDnsConfig = dnsConfig as DNSConfig;
            if (!resources.gateway.ip) {
                throw new Error("Gateway IP is required for DNS configuration but was not set");
            }
            const dnsResult = createDNSRecords({
                domain: typedDnsConfig.domain,
                loadBalancerIp: resources.gateway.ip,
                records: typedDnsConfig.records,
                ttl: typedDnsConfig.ttl,
            });
            resources.gateway.dnsRecords = dnsResult.records;
        }
    }

    // Deploy applications (skip for preview-base)
    // Check if app config exists
    const hasAppConfig = appConfig.get("web:url");
    if (hasAppConfig) {
        // Determine database connection details
        const dbHost = createDatabase
            ? postgresqlConfig.require("dbHost")
            : env === "local"
              ? "db"
              : "db.default.svc.cluster.local";

        const dbName = postgresqlConfig.get("databaseName") || "postgres";
        // When creating a database on shared instance, use the same credentials
        const dbUser = postgresqlConfig.require("user");
        const dbPassword = postgresqlConfig.requireSecret("password");

        // Get PR number from namespace name if it's a preview-pr
        const prNumber = hasNamespaceConfig
            ? namespaceConfig.require("name").replace("preview-pr-", "")
            : undefined;

        // Web deployment
        resources.web = createWebDeployment({
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
            imagePullSecrets: hasNamespaceConfig && ghcrConfig.get("username") ? ["ghcr-pull-secret"] : undefined,
            resources: appConfig.requireObject("web:resources") as any,
            podDisruptionBudget: appConfig.getObject("web:podDisruptionBudget") as any,
            provider: k8sProvider,
        });

        // API deployment
        resources.api = createAPIDeployment({
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
            cookieDomain: ".aphiria.com", // API doesn't actually use this, but the component requires it
            cookieSecure: true, // API doesn't actually use this, but the component requires it
            prNumber: env === "preview" && hasNamespaceConfig ? prNumber : undefined,
            imagePullSecrets: hasNamespaceConfig && ghcrConfig.get("username") ? ["ghcr-pull-secret"] : undefined,
            resources: appConfig.requireObject("api:resources") as any,
            podDisruptionBudget: appConfig.getObject("api:podDisruptionBudget") as any,
            // Use prometheus auth token from config
            prometheusAuthToken: prometheusConfig.getSecret("authToken"),
            provider: k8sProvider,
        });

        // Database migration job
        resources.migration = createDBMigrationJob({
            namespace,
            image: appConfig.require("api:image"),
            imagePullPolicy: appConfig.require("imagePullPolicy"),
            dbHost,
            dbName,
            dbUser,
            dbPassword,
            runSeeder: true,
            imagePullSecrets: hasNamespaceConfig && ghcrConfig.get("username") ? ["ghcr-pull-secret"] : undefined,
            resources: appConfig.requireObject("migration:resources") as any,
            provider: k8sProvider,
        });

        // HTTPRoutes (always in same namespace as services to avoid cross-namespace ReferenceGrant)
        // Explicitly attach to HTTPS listeners using sectionName to prevent attaching to HTTP listeners
        // (which would prevent HTTP→HTTPS redirects from working)
        resources.webRoute = createHTTPRoute({
            namespace: namespace,
            name: "web",
            hostname: new URL(appConfig.require("web:url")).hostname,
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
            hostname: new URL(appConfig.require("api:url")).hostname,
            serviceName: "api",
            serviceNamespace: namespace,
            servicePort: 80,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            sectionName: isPreviewPR ? "https-subdomains-2" : "https-subdomains",
            provider: k8sProvider,
        });

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
                provider: k8sProvider,
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
                provider: k8sProvider,
            });
        }
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
