import { describe, it, expect } from "vitest";
import type {
    ClusterConfig,
    PostgreSQLConfig,
    GatewayConfig,
    ResourceRequirements,
    AppConfig,
    NamespaceConfig,
} from "../../../src/stacks/lib/config/types";

describe("Types", () => {
    describe("ClusterConfig", () => {
        it("should accept valid cluster configuration", () => {
            const config: ClusterConfig = {
                name: "test-cluster",
                region: "nyc3",
                version: "1.34.1-do.2",
                autoUpgrade: false,
                surgeUpgrade: false,
                ha: false,
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

    describe("PostgreSQLConfig", () => {
        it("should accept standard database configuration", () => {
            const config: PostgreSQLConfig = {
                version: "16",
                persistentStorage: true,
                storageSize: "20Gi",
                user: "postgres",
                password: "secret",
                useHostPath: false,
                host: "db.default.svc.cluster.local",
                resources: {
                    requests: { cpu: "100m", memory: "128Mi" },
                    limits: { cpu: "200m", memory: "256Mi" },
                },
            };

            expect(config.persistentStorage).toBe(true);
            expect(config.storageSize).toBe("20Gi");
        });

        it("should accept preview-pr database configuration", () => {
            const config: PostgreSQLConfig = {
                version: "16",
                persistentStorage: false,
                storageSize: "1Gi",
                user: "postgres",
                password: "secret",
                useHostPath: false,
                host: "db.default.svc.cluster.local",
                resources: {
                    requests: { cpu: "100m", memory: "128Mi" },
                    limits: { cpu: "200m", memory: "256Mi" },
                },
                createDatabase: true,
                databaseName: "aphiria_pr_123",
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
                requireRootAndWildcard: false,
            };

            expect(config.tlsMode).toBe("self-signed");
            expect(config.domains).toHaveLength(1);
        });

        it("should accept Let's Encrypt configuration with DNS token", () => {
            const config: GatewayConfig = {
                tlsMode: "letsencrypt-prod",
                domains: ["*.pr.aphiria.com", "*.pr-api.aphiria.com"],
                requireRootAndWildcard: false,
                digitaloceanDnsToken: "dop_v1_token",
            };

            expect(config.tlsMode).toBe("letsencrypt-prod");
            expect(config.digitaloceanDnsToken).toBeDefined();
        });
    });

    describe("ResourceRequirements", () => {
        it("should accept valid resource limits", () => {
            const limits: ResourceRequirements = {
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

    describe("AppConfig", () => {
        it("should accept complete application configuration", () => {
            const config: AppConfig = {
                imagePullPolicy: "IfNotPresent",
                web: {
                    replicas: 2,
                    url: "https://www.aphiria.com",
                    image: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123",
                    cookieDomain: ".aphiria.com",
                    env: {
                        API_URI: "https://api.aphiria.com",
                        COOKIE_DOMAIN: ".aphiria.com",
                        NODE_ENV: "production",
                    },
                    resources: {
                        requests: { cpu: "100m", memory: "256Mi" },
                        limits: { cpu: "200m", memory: "512Mi" },
                    },
                    podDisruptionBudget: { minAvailable: 1 },
                },
                api: {
                    replicas: 2,
                    url: "https://api.aphiria.com",
                    image: "ghcr.io/aphiria/aphiria.com-api@sha256:def456",
                    logLevel: "warning",
                    resources: {
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
                    podDisruptionBudget: { minAvailable: 1 },
                },
                migration: {
                    resources: {
                        migration: {
                            requests: { cpu: "50m", memory: "128Mi" },
                            limits: { cpu: "200m", memory: "256Mi" },
                        },
                        initContainer: {
                            requests: { cpu: "10m", memory: "32Mi" },
                            limits: { cpu: "50m", memory: "64Mi" },
                        },
                    },
                },
            };

            expect(config.web.replicas).toBe(2);
            expect(config.web.image).toContain("@sha256:");
            expect(config.web.podDisruptionBudget?.minAvailable).toBe(1);
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
});
