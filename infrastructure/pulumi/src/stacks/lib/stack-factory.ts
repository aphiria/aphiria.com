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
import { createGrafanaAlerts } from "../../components/grafana-alerts";
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

        // Create Grafana Unified Alerting provisioning ConfigMaps
        // Environment-specific contact point configuration
        // Production: email contact point for real alerts
        // Preview/Local: use Grafana's default contact point (won't send without SMTP)
        const contactPoints =
            config.env === "production"
                ? [
                      {
                          name: "email-admin",
                          receivers: [
                              {
                                  uid: "email-admin",
                                  type: "email",
                                  settings: {
                                      addresses:
                                          config.monitoring.grafana.smtp?.alertEmail ||
                                          "admin@aphiria.com",
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
            environment: config.env,
            contactPoints,
            defaultReceiver: config.env === "production" ? "email-admin" : "local-notifications",
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
            hostname: config.monitoring.grafana.hostname,
            // Preview: pr-grafana.aphiria.com uses https-root (exact match)
            // Production: grafana.aphiria.com uses https-subdomains (*.aphiria.com wildcard)
            /* istanbul ignore next - sectionName varies by environment (preview vs production) */
            sectionName: config.env === "preview" ? "https-root" : "https-subdomains",
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
            resources: config.database.resources,
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
        // Fetch LoadBalancer IP from nginx-gateway Chart resources
        /* istanbul ignore next - Chart.resources is only populated at runtime, cannot be mocked in unit tests */
        if (config.gateway.dns && resources.helmCharts?.nginxGateway) {
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
            replicas: config.app.web.replicas,
            image: config.app.web.image,
            jsConfigData: {
                apiUri: config.app.api.url,
                cookieDomain: config.app.cookieDomain,
            },
            baseUrl: config.app.web.url,
            logLevel: config.env === "production" ? "warning" : "debug",
            prNumber:
                config.env === "preview" && config.namespace
                    ? config.namespace.name.replace("preview-pr-", "")
                    : undefined,
            imagePullSecrets: config.namespace?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
            resources: config.app.web.resources,
            podDisruptionBudget: config.app.web.podDisruptionBudget,
            provider: k8sProvider,
        });

        // API deployment
        resources.api = createAPIDeployment({
            env: config.env,
            namespace,
            replicas: config.app.api.replicas,
            image: config.app.api.image,
            dbHost,
            dbName,
            dbUser,
            dbPassword,
            apiUrl: config.app.api.url,
            webUrl: config.app.web.url,
            logLevel: config.env === "production" ? "warning" : "debug",
            cookieDomain: config.app.cookieDomain,
            cookieSecure: config.env !== "local",
            prNumber:
                config.env === "preview" && config.namespace
                    ? config.namespace.name.replace("preview-pr-", "")
                    : undefined,
            imagePullSecrets: config.namespace?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
            resources: config.app.api.resources,
            podDisruptionBudget: config.app.api.podDisruptionBudget,
            // Prefer top-level prometheusAuthToken (preview-pr) over monitoring.prometheus.authToken (local/preview-base/production)
            prometheusAuthToken:
                config.prometheusAuthToken || config.monitoring?.prometheus.authToken,
            provider: k8sProvider,
        });

        // Database migration job
        resources.migration = createDBMigrationJob({
            env: config.env,
            namespace,
            image: config.app.api.image,
            dbHost,
            dbName,
            dbUser,
            dbPassword,
            runSeeder: true,
            imagePullSecrets: config.namespace?.imagePullSecret ? ["ghcr-pull-secret"] : undefined,
            resources: config.app.migration.resources,
            provider: k8sProvider,
        });

        // HTTPRoutes (always in same namespace as services to avoid cross-namespace ReferenceGrant)
        // Explicitly attach to HTTPS listeners using sectionName to prevent attaching to HTTP listeners
        // (which would prevent HTTP→HTTPS redirects from working)
        resources.webRoute = createHTTPRoute({
            namespace: namespace,
            name: "web",
            hostname: new URL(config.app.web.url).hostname,
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
            hostname: new URL(config.app.api.url).hostname,
            serviceName: "api",
            serviceNamespace: namespace,
            servicePort: 80,
            gatewayName: "nginx-gateway",
            gatewayNamespace: gatewayNamespace,
            sectionName: isPreviewPR ? "https-subdomains-2" : "https-subdomains",
            provider: k8sProvider,
        });

        // ServiceMonitor for API metrics (if monitoring is configured OR prometheusAuthToken is provided)
        // preview-pr passes prometheusAuthToken directly, other envs pass config.monitoring
        /* istanbul ignore next - prometheusAuthToken fallback for preview-pr, tested via integration */
        const authToken = config.monitoring?.prometheus.authToken || config.prometheusAuthToken;
        if (authToken) {
            resources.apiServiceMonitor = createApiServiceMonitor({
                namespace: namespace,
                serviceName: "api",
                targetPort: 80,
                metricsPath: "/metrics",
                scrapeInterval: config.monitoring?.prometheus.scrapeInterval || "15s",
                authToken: authToken,
                provider: k8sProvider,
            });
        }

        // HTTP→HTTPS redirect for preview-pr (specific hostnames beat wildcard redirects)
        // This ensures http://123.pr.aphiria.com redirects to https://123.pr.aphiria.com
        if (config.env === "preview" && config.namespace) {
            const webHostname = new URL(config.app.web.url).hostname;
            const apiHostname = new URL(config.app.api.url).hostname;

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
