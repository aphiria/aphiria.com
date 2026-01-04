import { describe, it, expect } from "@jest/globals";
import type {
    KubernetesClusterConfig,
    DatabaseConfig,
    GatewayConfig,
    ResourceLimits,
    APIResourceLimits,
    AppConfig,
    NamespaceConfig,
    StackConfig,
} from "../../../src/stacks/lib/types";

describe("Types", () => {
    describe("KubernetesClusterConfig", () => {
        it("should accept valid cluster configuration", () => {
            const config: KubernetesClusterConfig = {
                name: "test-cluster",
                region: "nyc3",
                version: "1.34.1-do.2",
                nodeSize: "s-2vcpu-4gb",
                nodeCount: 2,
                autoScale: true,
                minNodes: 1,
                maxNodes: 5,
                vpcUuid: "vpc-12345",
            };

            expect(config.name).toBe("test-cluster");
            expect(config.autoScale).toBe(true);
        });
    });

    describe("DatabaseConfig", () => {
        it("should accept standard database configuration", () => {
            const config: DatabaseConfig = {
                persistentStorage: true,
                storageSize: "20Gi",
                dbUser: "postgres",
                dbPassword: "secret",
                    resources: { requests: { cpu: "100m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } },
            };

            expect(config.persistentStorage).toBe(true);
            expect(config.storageSize).toBe("20Gi");
        });

        it("should accept preview-pr database configuration", () => {
            const config: DatabaseConfig = {
                persistentStorage: false,
                storageSize: "1Gi",
                dbUser: "postgres",
                dbPassword: "secret",
                    resources: { requests: { cpu: "100m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } },
                createDatabase: true,
                databaseName: "aphiria_pr_123",
                dbHost: "db.default.svc.cluster.local",
                dbAdminUser: "postgres",
                dbAdminPassword: "admin_secret",
            };

            expect(config.createDatabase).toBe(true);
            expect(config.databaseName).toBe("aphiria_pr_123");
        });
    });

    describe("GatewayConfig", () => {
        it("should accept self-signed certificate configuration", () => {
            const config: GatewayConfig = {
                tlsMode: "self-signed",
                domains: ["*.aphiria.com"],
            };

            expect(config.tlsMode).toBe("self-signed");
            expect(config.domains).toHaveLength(1);
        });

        it("should accept Let's Encrypt configuration with DNS token", () => {
            const config: GatewayConfig = {
                tlsMode: "letsencrypt-prod",
                domains: ["*.pr.aphiria.com", "*.pr-api.aphiria.com"],
                dnsToken: "dop_v1_token",
            };

            expect(config.tlsMode).toBe("letsencrypt-prod");
            expect(config.dnsToken).toBeDefined();
        });
    });

    describe("ResourceLimits", () => {
        it("should accept valid resource limits", () => {
            const limits: ResourceLimits = {
                requests: {
                    cpu: "250m",
                    memory: "512Mi",
                },
                limits: {
                    cpu: "500m",
                    memory: "1Gi",
                },
            };

            expect(limits.requests.cpu).toBe("250m");
            expect(limits.limits.memory).toBe("1Gi");
        });
    });

    describe("APIResourceLimits", () => {
        it("should accept multi-container resource limits", () => {
            const limits: APIResourceLimits = {
                nginx: {
                    requests: { cpu: "100m", memory: "128Mi" },
                    limits: { cpu: "200m", memory: "256Mi" },
                },
                php: {
                    requests: { cpu: "250m", memory: "512Mi" },
                    limits: { cpu: "500m", memory: "1Gi" },
                },
                initContainer: {
                    requests: { cpu: "100m", memory: "128Mi" },
                    limits: { cpu: "200m", memory: "256Mi" },
                },
            };

            expect(limits.nginx).toBeDefined();
            expect(limits.php).toBeDefined();
            expect(limits.initContainer).toBeDefined();
        });
    });

    describe("AppConfig", () => {
        it("should accept complete application configuration", () => {
            const config: AppConfig = {
                webReplicas: 2,
                apiReplicas: 2,
                webUrl: "https://www.aphiria.com",
                apiUrl: "https://api.aphiria.com",
                webImage: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123",
                apiImage: "ghcr.io/aphiria/aphiria.com-api@sha256:def456",
                cookieDomain: ".aphiria.com",
                webResources: {
                    requests: { cpu: "100m", memory: "256Mi" },
                    limits: { cpu: "200m", memory: "512Mi" },
                },
                apiResources: {
                    nginx: {
                        requests: { cpu: "100m", memory: "128Mi" },
                        limits: { cpu: "200m", memory: "256Mi" },
                    },
                    php: {
                        requests: { cpu: "250m", memory: "512Mi" },
                        limits: { cpu: "500m", memory: "1Gi" },
                    },
                    initContainer: {
                        requests: { cpu: "50m", memory: "64Mi" },
                        limits: { cpu: "100m", memory: "128Mi" },
                    },
                },
                migrationResources: {
                    migration: {
                        requests: { cpu: "50m", memory: "128Mi" },
                        limits: { cpu: "200m", memory: "256Mi" },
                    },
                    initContainer: {
                        requests: { cpu: "10m", memory: "32Mi" },
                        limits: { cpu: "50m", memory: "64Mi" },
                    },
                },
                webPodDisruptionBudget: { minAvailable: 1 },
                apiPodDisruptionBudget: { minAvailable: 1 },
            };

            expect(config.webReplicas).toBe(2);
            expect(config.webImage).toContain("@sha256:");
            expect(config.webPodDisruptionBudget?.minAvailable).toBe(1);
        });
    });

    describe("NamespaceConfig", () => {
        it("should accept namespace configuration with quota and network policy", () => {
            const config: NamespaceConfig = {
                name: "preview-pr-123",
                resourceQuota: {
                    cpu: "2",
                    memory: "4Gi",
                    pods: "10",
                },
                networkPolicy: {
                    allowDNS: true,
                    allowHTTPS: true,
                    allowPostgreSQL: {
                        host: "db.default.svc.cluster.local",
                        port: 5432,
                    },
                },
                imagePullSecret: {
                    registry: "ghcr.io",
                    username: "user",
                    token: "ghp_token",
                },
            };

            expect(config.name).toBe("preview-pr-123");
            expect(config.resourceQuota?.cpu).toBe("2");
            expect(config.networkPolicy?.allowDNS).toBe(true);
            expect(config.imagePullSecret?.registry).toBe("ghcr.io");
        });
    });

    describe("StackConfig", () => {
        it("should accept local environment configuration", () => {
            const config: StackConfig = {
                env: "local",
                database: {
                    persistentStorage: false,
                    storageSize: "1Gi",
                    dbUser: "postgres",
                    dbPassword: "postgres",
                    resources: { requests: { cpu: "100m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } },
                },
                gateway: {
                    tlsMode: "self-signed",
                    domains: ["*.aphiria.com"],
                },
                app: {
                    webReplicas: 1,
                    apiReplicas: 1,
                    webUrl: "https://www.aphiria.com",
                    apiUrl: "https://api.aphiria.com",
                    webImage: "aphiria.com-web:latest",
                    apiImage: "aphiria.com-api:latest",
                    cookieDomain: ".aphiria.com",
                    webResources: { requests: { cpu: "50m", memory: "64Mi" }, limits: { cpu: "100m", memory: "128Mi" } },
                    apiResources: { nginx: { requests: { cpu: "50m", memory: "64Mi" }, limits: { cpu: "100m", memory: "128Mi" } }, php: { requests: { cpu: "100m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } }, initContainer: { requests: { cpu: "50m", memory: "64Mi" }, limits: { cpu: "100m", memory: "128Mi" } } },
                    migrationResources: { migration: { requests: { cpu: "50m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } }, initContainer: { requests: { cpu: "10m", memory: "32Mi" }, limits: { cpu: "50m", memory: "64Mi" } } },
                },
            };

            expect(config.env).toBe("local");
            expect(config.app).toBeDefined();
        });

        it("should accept preview-base configuration", () => {
            const config: StackConfig = {
                env: "preview",
                cluster: {
                    name: "preview-cluster",
                    region: "nyc3",
                    nodeSize: "s-2vcpu-4gb",
                    nodeCount: 2,
                    autoScale: true,
                    minNodes: 1,
                    maxNodes: 5,
                },
                database: {
                    persistentStorage: true,
                    storageSize: "10Gi",
                    dbUser: "postgres",
                    dbPassword: "secret",
                    resources: { requests: { cpu: "100m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } },
                },
                gateway: {
                    tlsMode: "letsencrypt-prod",
                    domains: ["*.pr.aphiria.com", "*.pr-api.aphiria.com"],
                    dnsToken: "dop_v1_token",
                },
            };

            expect(config.env).toBe("preview");
            expect(config.cluster).toBeDefined();
            expect(config.app).toBeUndefined();
        });

        it("should accept preview-pr configuration", () => {
            const config: StackConfig = {
                env: "preview",
                skipBaseInfrastructure: true,
                namespace: {
                    name: "preview-pr-123",
                    resourceQuota: {
                        cpu: "2",
                        memory: "4Gi",
                        pods: "10",
                    },
                },
                database: {
                    createDatabase: true,
                    databaseName: "aphiria_pr_123",
                    dbHost: "db.default.svc.cluster.local",
                    dbAdminUser: "postgres",
                    dbAdminPassword: "admin_secret",
                    persistentStorage: false,
                    storageSize: "1Gi",
                    dbUser: "postgres",
                    dbPassword: "secret",
                    resources: { requests: { cpu: "100m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } },
                },
                gateway: {
                    tlsMode: "letsencrypt-prod",
                    domains: ["*.pr.aphiria.com"],
                },
                app: {
                    webReplicas: 1,
                    apiReplicas: 1,
                    webUrl: "https://123.pr.aphiria.com",
                    apiUrl: "https://123.pr-api.aphiria.com",
                    webImage: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123",
                    apiImage: "ghcr.io/aphiria/aphiria.com-api@sha256:def456",
                    cookieDomain: ".pr.aphiria.com",
                    webResources: { requests: { cpu: "50m", memory: "64Mi" }, limits: { cpu: "100m", memory: "128Mi" } },
                    apiResources: { nginx: { requests: { cpu: "50m", memory: "64Mi" }, limits: { cpu: "100m", memory: "128Mi" } }, php: { requests: { cpu: "100m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } }, initContainer: { requests: { cpu: "50m", memory: "64Mi" }, limits: { cpu: "100m", memory: "128Mi" } } },
                    migrationResources: { migration: { requests: { cpu: "50m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } }, initContainer: { requests: { cpu: "10m", memory: "32Mi" }, limits: { cpu: "50m", memory: "64Mi" } } },
                },
            };

            expect(config.skipBaseInfrastructure).toBe(true);
            expect(config.namespace).toBeDefined();
            expect(config.database.createDatabase).toBe(true);
        });

        it("should accept production configuration", () => {
            const config: StackConfig = {
                env: "production",
                cluster: {
                    name: "production-cluster",
                    region: "nyc3",
                    nodeSize: "s-4vcpu-8gb",
                    nodeCount: 3,
                    autoScale: true,
                    minNodes: 2,
                    maxNodes: 10,
                },
                database: {
                    persistentStorage: true,
                    storageSize: "50Gi",
                    dbUser: "postgres",
                    dbPassword: "secret",
                    resources: { requests: { cpu: "100m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } },
                },
                gateway: {
                    tlsMode: "letsencrypt-prod",
                    domains: ["*.aphiria.com"],
                    dnsToken: "dop_v1_token",
                },
                app: {
                    webReplicas: 2,
                    apiReplicas: 2,
                    webUrl: "https://www.aphiria.com",
                    apiUrl: "https://api.aphiria.com",
                    webImage: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123",
                    apiImage: "ghcr.io/aphiria/aphiria.com-api@sha256:def456",
                    cookieDomain: ".aphiria.com",
                    webResources: { requests: { cpu: "50m", memory: "64Mi" }, limits: { cpu: "100m", memory: "128Mi" } },
                    apiResources: { nginx: { requests: { cpu: "50m", memory: "64Mi" }, limits: { cpu: "100m", memory: "128Mi" } }, php: { requests: { cpu: "100m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } }, initContainer: { requests: { cpu: "50m", memory: "64Mi" }, limits: { cpu: "100m", memory: "128Mi" } } },
                    migrationResources: { migration: { requests: { cpu: "50m", memory: "128Mi" }, limits: { cpu: "200m", memory: "256Mi" } }, initContainer: { requests: { cpu: "10m", memory: "32Mi" }, limits: { cpu: "50m", memory: "64Mi" } } },
                    webPodDisruptionBudget: { minAvailable: 1 },
                    apiPodDisruptionBudget: { minAvailable: 1 },
                },
            };

            expect(config.env).toBe("production");
            expect(config.app?.webReplicas).toBe(2);
            expect(config.app?.webPodDisruptionBudget).toBeDefined();
        });
    });
});
