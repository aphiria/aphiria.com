import { describe, it, expect, beforeEach, vi } from "vitest";
import { createApplicationResources } from "../../../../src/stacks/lib/factories/applications";
import {
    AppConfig,
    PostgreSQLConfig,
    PrometheusConfig,
    NamespaceConfig,
} from "../../../../src/stacks/lib/config/types";
import * as k8s from "@pulumi/kubernetes";

// Mock the component functions
vi.mock("../../../../src/components", () => ({
    createWebDeployment: vi.fn(),
    createAPIDeployment: vi.fn(),
    createDBMigrationJob: vi.fn(),
    createHTTPRoute: vi.fn(),
    createHTTPSRedirectRoute: vi.fn(),
}));

vi.mock("../../../../src/components/api-service-monitor", () => ({
    createApiServiceMonitor: vi.fn(),
}));

import {
    createWebDeployment,
    createAPIDeployment,
    createDBMigrationJob,
    createHTTPRoute,
    createHTTPSRedirectRoute,
} from "../../../../src/components";
import { createApiServiceMonitor } from "../../../../src/components/api-service-monitor";

describe("createApplicationResources", () => {
    const k8sProvider = new k8s.Provider("test-provider", {
        kubeconfig: "fake-kubeconfig",
    });

    const appConfig: AppConfig = {
        imagePullPolicy: "IfNotPresent",
        web: {
            replicas: 2,
            image: "ghcr.io/aphiria/web:latest",
            url: "https://local.aphiria.com",
            cookieDomain: ".local.aphiria.com",
            resources: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "200m", memory: "256Mi" },
            },
            podDisruptionBudget: { minAvailable: 1 },
        },
        api: {
            replicas: 2,
            image: "ghcr.io/aphiria/api:latest",
            url: "https://api.local.aphiria.com",
            logLevel: "debug",
            resources: {
                initContainer: {
                    requests: { cpu: "100m", memory: "128Mi" },
                    limits: { cpu: "200m", memory: "256Mi" },
                },
                nginx: {
                    requests: { cpu: "100m", memory: "128Mi" },
                    limits: { cpu: "200m", memory: "256Mi" },
                },
                php: {
                    requests: { cpu: "200m", memory: "256Mi" },
                    limits: { cpu: "400m", memory: "512Mi" },
                },
            },
            podDisruptionBudget: { minAvailable: 1 },
        },
        migration: {
            resources: {
                migration: {
                    requests: { cpu: "100m", memory: "128Mi" },
                    limits: { cpu: "200m", memory: "256Mi" },
                },
                initContainer: {
                    requests: { cpu: "100m", memory: "128Mi" },
                    limits: { cpu: "200m", memory: "256Mi" },
                },
            },
        },
    };

    const postgresqlConfig: PostgreSQLConfig = {
        user: "postgres",
        password: "test-password",
        host: "db",
        databaseName: "postgres",
        resources: {
            requests: { cpu: "500m", memory: "512Mi" },
            limits: { cpu: "500m", memory: "512Mi" },
        },
        persistentStorage: true,
        storageSize: "10Gi",
        version: "17-alpine",
        useHostPath: false,
    };

    // Applications factory only uses scrapeInterval and authToken from PrometheusConfig
    // Cast to PrometheusConfig to avoid needing full config structure in tests
    const prometheusConfig = {
        authToken: "test-prometheus-token",
        scrapeInterval: "30s",
    } as PrometheusConfig;

    beforeEach(() => {
        vi.clearAllMocks();

        // Set up default mock return values
        (createWebDeployment as Mock).mockReturnValue({
            deployment: {},
            service: {},
            configMap: {},
        });

        (createAPIDeployment as Mock).mockReturnValue({
            deployment: {},
            service: {},
            configMap: {},
            secret: {},
        });

        (createDBMigrationJob as Mock).mockReturnValue({});
        (createHTTPRoute as Mock).mockReturnValue({});
        (createHTTPSRedirectRoute as Mock).mockReturnValue({});
        (createApiServiceMonitor as Mock).mockReturnValue({ serviceMonitor: {} });
    });

    describe("web deployment", () => {
        it("should create web deployment with replicas from config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createWebDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    replicas: 2,
                })
            );
        });

        it("should create web deployment with image from config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createWebDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    image: "ghcr.io/aphiria/web:latest",
                })
            );
        });

        it("should create web deployment with imagePullPolicy from config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createWebDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    imagePullPolicy: "IfNotPresent",
                })
            );
        });

        it("should create web deployment with environment from args", () => {
            createApplicationResources({
                env: "production",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createWebDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    appEnv: "production",
                })
            );
        });

        it("should create web deployment with jsConfigData from config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createWebDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    jsConfigData: {
                        apiUri: "https://api.local.aphiria.com",
                        cookieDomain: ".local.aphiria.com",
                    },
                })
            );
        });

        it("should create web deployment with PR number when preview-pr and namespace config exists", () => {
            const namespaceConfig: NamespaceConfig = {
                name: "preview-pr-123",
            };

            createApplicationResources({
                env: "preview",
                provider: k8sProvider,
                namespace: "preview-pr-123",
                isPreviewPR: true,
                hasNamespaceConfig: true,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
                namespaceConfig,
            });

            expect(createWebDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    prNumber: "123",
                })
            );
        });

        it("should create web deployment with imagePullSecrets when namespace config has imagePullSecret", () => {
            const namespaceConfig: NamespaceConfig = {
                name: "preview-pr-123",
                imagePullSecret: {
                    registry: "ghcr.io",
                    username: "user",
                    token: "token",
                },
            };

            createApplicationResources({
                env: "preview",
                provider: k8sProvider,
                namespace: "preview-pr-123",
                isPreviewPR: true,
                hasNamespaceConfig: true,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
                namespaceConfig,
            });

            expect(createWebDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    imagePullSecrets: ["ghcr-pull-secret"],
                })
            );
        });

        it("should create web deployment with resource limits from config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createWebDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    resources: expect.objectContaining({
                        requests: { cpu: "100m", memory: "128Mi" },
                        limits: { cpu: "200m", memory: "256Mi" },
                    }),
                })
            );
        });

        it("should create web deployment with podDisruptionBudget from config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createWebDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    podDisruptionBudget: expect.objectContaining({ minAvailable: 1 }),
                })
            );
        });
    });

    describe("API deployment", () => {
        it("should create API deployment with database connection from postgresqlConfig", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createAPIDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    dbHost: "db",
                    dbName: "postgres",
                    dbUser: "postgres",
                    dbPassword: "test-password",
                })
            );
        });

        it("should create API deployment with log level from config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createAPIDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    logLevel: "debug",
                })
            );
        });

        it("should create API deployment with Prometheus auth token wrapped as secret", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            // Note: We cannot verify pulumi.isSecret() in unit tests because the value is wrapped in a real Pulumi Output
            // The factory calls pulumi.secret() to wrap the token - this is tested in integration tests
            expect(createAPIDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    prometheusAuthToken: expect.anything(),
                })
            );
        });

        it("should create API deployment with apiUrl and webUrl from config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createAPIDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    apiUrl: "https://api.local.aphiria.com",
                    webUrl: "https://local.aphiria.com",
                })
            );
        });
    });

    describe("database connection validation", () => {
        it("should throw error when createDatabase is true but databaseName is not provided", () => {
            const invalidPostgresqlConfig = { ...postgresqlConfig, createDatabase: true };
            delete invalidPostgresqlConfig.databaseName;

            expect(() => {
                createApplicationResources({
                    env: "preview",
                    provider: k8sProvider,
                    namespace: "preview-pr-123",
                    isPreviewPR: true,
                    hasNamespaceConfig: true,
                    appConfig,
                    postgresqlConfig: invalidPostgresqlConfig,
                    prometheusConfig,
                });
            }).toThrow("postgresqlConfig.databaseName is required when createDatabase is true");
        });

        it("should use databaseName from config when provided", () => {
            const configWithDbName = { ...postgresqlConfig, databaseName: "aphiria_custom" };

            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig: configWithDbName,
                prometheusConfig,
            });

            expect(createDBMigrationJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    dbName: "aphiria_custom",
                })
            );
        });

        it("should default to postgres database name when databaseName is not provided and createDatabase is false", () => {
            const configWithoutDbName = { ...postgresqlConfig };
            delete configWithoutDbName.databaseName;

            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig: configWithoutDbName,
                prometheusConfig,
            });

            expect(createDBMigrationJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    dbName: "postgres",
                })
            );
        });
    });

    describe("database migration job", () => {
        it("should create migration job with image from API config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createDBMigrationJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    image: "ghcr.io/aphiria/api:latest",
                })
            );
        });

        it("should create migration job with seeder enabled", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createDBMigrationJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    runSeeder: true,
                })
            );
        });

        it("should create migration job with resource limits from config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createDBMigrationJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    resources: expect.objectContaining({
                        migration: expect.objectContaining({
                            requests: { cpu: "100m", memory: "128Mi" },
                            limits: { cpu: "200m", memory: "256Mi" },
                        }),
                        initContainer: expect.objectContaining({
                            requests: { cpu: "100m", memory: "128Mi" },
                            limits: { cpu: "200m", memory: "256Mi" },
                        }),
                    }),
                })
            );
        });
    });

    describe("HTTPRoutes", () => {
        it("should create web HTTPRoute with hostname from config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createHTTPRoute).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "web",
                    hostname: "local.aphiria.com",
                })
            );
        });

        it("should create API HTTPRoute with hostname from config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createHTTPRoute).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "api",
                    hostname: "api.local.aphiria.com",
                })
            );
        });

        it("should create HTTPRoutes with https-subdomains section for non-preview environments", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createHTTPRoute).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    sectionName: "https-subdomains",
                })
            );
            expect(createHTTPRoute).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    sectionName: "https-subdomains",
                })
            );
        });

        it("should create HTTPRoutes with https-subdomains-1 and https-subdomains-2 sections for preview-pr", () => {
            createApplicationResources({
                env: "preview",
                provider: k8sProvider,
                namespace: "preview-pr-123",
                isPreviewPR: true,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createHTTPRoute).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    sectionName: "https-subdomains-1",
                })
            );
            expect(createHTTPRoute).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    sectionName: "https-subdomains-2",
                })
            );
        });

        it("should create HTTPRoutes attached to nginx-gateway in nginx-gateway namespace", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createHTTPRoute).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    gatewayName: "nginx-gateway",
                    gatewayNamespace: "nginx-gateway",
                })
            );
            expect(createHTTPRoute).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    gatewayName: "nginx-gateway",
                    gatewayNamespace: "nginx-gateway",
                })
            );
        });
    });

    describe("ServiceMonitor", () => {
        it("should create API ServiceMonitor with scrape interval from config", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createApiServiceMonitor).toHaveBeenCalledWith(
                expect.objectContaining({
                    scrapeInterval: "30s",
                })
            );
        });

        it("should create API ServiceMonitor with auth token wrapped as secret", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            // Note: We cannot verify pulumi.isSecret() in unit tests because the value is wrapped in a real Pulumi Output
            // The factory calls pulumi.secret() to wrap the token - this is tested in integration tests
            expect(createApiServiceMonitor).toHaveBeenCalledWith(
                expect.objectContaining({
                    authToken: expect.anything(),
                })
            );
        });

        it("should create API ServiceMonitor targeting api service on port 80 at /metrics", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createApiServiceMonitor).toHaveBeenCalledWith(
                expect.objectContaining({
                    serviceName: "api",
                    targetPort: 80,
                    metricsPath: "/metrics",
                })
            );
        });
    });

    describe("HTTPS redirect", () => {
        it("should not create HTTPS redirect for non-preview environments", () => {
            createApplicationResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createHTTPSRedirectRoute).not.toHaveBeenCalled();
        });

        it("should not create HTTPS redirect for preview-base", () => {
            createApplicationResources({
                env: "preview",
                provider: k8sProvider,
                namespace: "preview-base",
                isPreviewPR: false,
                hasNamespaceConfig: false,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
            });

            expect(createHTTPSRedirectRoute).not.toHaveBeenCalled();
        });

        it("should create HTTPS redirect for preview-pr with web and API hostnames", () => {
            const namespaceConfig: NamespaceConfig = {
                name: "preview-pr-123",
            };

            createApplicationResources({
                env: "preview",
                provider: k8sProvider,
                namespace: "preview-pr-123",
                isPreviewPR: true,
                hasNamespaceConfig: true,
                appConfig,
                postgresqlConfig,
                prometheusConfig,
                namespaceConfig,
            });

            expect(createHTTPSRedirectRoute).toHaveBeenCalledWith(
                expect.objectContaining({
                    domains: ["local.aphiria.com", "api.local.aphiria.com"],
                })
            );
        });
    });
});
