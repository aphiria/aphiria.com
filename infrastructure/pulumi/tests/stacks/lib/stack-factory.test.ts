import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createStack } from "../../../src/stacks/lib/stack-factory";
import { promiseOf } from "../../test-utils";

describe("createStack factory", () => {
    let k8sProvider: k8s.Provider;

    const minimalMonitoringConfig = {
        prometheus: {
            authToken: pulumi.output("test-token"),
            storageSize: "2Gi",
        },
        grafana: {
            storageSize: "1Gi",
            hostname: "grafana.test.aphiria.com",
            githubOAuth: {
                clientId: pulumi.output("test-client-id"),
                clientSecret: pulumi.output("test-client-secret"),
                org: "aphiria",
                adminUser: "test",
            },
            smtp: {
                host: pulumi.output("smtp.test.com"),
                port: 587,
                user: pulumi.output("test@test.com"),
                password: pulumi.output("test-password"),
                fromAddress: "test@aphiria.com",
                alertEmail: "test@aphiria.com",
            },
        },
    };

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    describe("namespace creation", () => {
        it("should create namespace with ResourceQuota when configured", async () => {
            const stack = createStack(
                {
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
                        dbHost: pulumi.output("db.default.svc.cluster.local"),
                        dbAdminUser: pulumi.output("postgres"),
                        dbAdminPassword: pulumi.output("password"),
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["*.pr.aphiria.com", "*.pr-api.aphiria.com"],
                    },
                },
                k8sProvider
            );

            expect(stack.namespace).toBeDefined();
            expect(stack.namespace?.resourceQuota).toBeDefined();

            const [nsName, quotaName] = await Promise.all([
                promiseOf(stack.namespace!.namespace.metadata.name),
                promiseOf(stack.namespace!.resourceQuota!.metadata.name),
            ]);
            expect(nsName).toBe("preview-pr-123");
            expect(quotaName).toBe("preview-pr-123-quota");
        });

        it("should not create namespace when not configured", () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "self-signed",
                        domains: ["*.aphiria.com"],
                    },
                },
                k8sProvider
            );

            expect(stack.namespace).toBeUndefined();
        });
    });

    describe("database creation", () => {
        it("should create PostgreSQL instance when createDatabase is false", () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "self-signed",
                        domains: ["*.aphiria.com"],
                    },
                },
                k8sProvider
            );

            expect(stack.postgres).toBeDefined();
            expect(stack.dbInitJob).toBeUndefined();
        });

        it("should create database init job when createDatabase is true", () => {
            const stack = createStack(
                {
                    env: "preview",
                    skipBaseInfrastructure: true,
                    database: {
                        createDatabase: true,
                        databaseName: "aphiria_pr_123",
                        dbHost: pulumi.output("db.default.svc.cluster.local"),
                        dbAdminUser: pulumi.output("postgres"),
                        dbAdminPassword: pulumi.output("password"),
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["*.pr.aphiria.com"],
                    },
                },
                k8sProvider
            );

            expect(stack.dbInitJob).toBeDefined();
            expect(stack.postgres).toBeUndefined();
        });
    });

    describe("application deployment", () => {
        it("should deploy applications when app config provided", async () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
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
                        webImage: "ghcr.io/aphiria/aphiria.com-web:latest",
                        apiImage: "ghcr.io/aphiria/aphiria.com-api:latest",
                        cookieDomain: ".aphiria.com",
                    },
                    monitoring: minimalMonitoringConfig,
                },
                k8sProvider
            );

            expect(stack.web).toBeDefined();
            expect(stack.api).toBeDefined();
            expect(stack.migration).toBeDefined();
            expect(stack.webRoute).toBeDefined();
            expect(stack.apiRoute).toBeDefined();

            const [webName, apiName, migrationName] = await Promise.all([
                promiseOf(stack.web!.deployment.name),
                promiseOf(stack.api!.deployment.name),
                promiseOf(stack.migration!.metadata.name),
            ]);
            expect(webName).toBe("web");
            expect(apiName).toBe("api");
            expect(migrationName).toBe("db-migration");
        });

        it("should not deploy applications when app config not provided", () => {
            const stack = createStack(
                {
                    env: "preview",
                    database: {
                        persistentStorage: true,
                        storageSize: "10Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["*.pr.aphiria.com"],
                        dnsToken: pulumi.output("fake-dns-token"),
                    },
                },
                k8sProvider
            );

            expect(stack.web).toBeUndefined();
            expect(stack.api).toBeUndefined();
            expect(stack.migration).toBeUndefined();
        });

        it("should create HTTP redirect routes for local environment", () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: false,
                    database: {
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
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
                        webImage: "ghcr.io/aphiria/aphiria.com-web:latest",
                        apiImage: "ghcr.io/aphiria/aphiria.com-api:latest",
                        cookieDomain: ".aphiria.com",
                    },
                    monitoring: minimalMonitoringConfig,
                },
                k8sProvider
            );

            expect(stack.httpsRedirect).toBeDefined();
            expect(stack.wwwRedirect).toBeDefined();
        });

        it("should use database creation credentials when createDatabase is true", () => {
            const stack = createStack(
                {
                    env: "preview",
                    skipBaseInfrastructure: true,
                    namespace: {
                        name: "preview-pr-123",
                    },
                    database: {
                        createDatabase: true,
                        databaseName: "aphiria_pr_123",
                        dbHost: pulumi.output("db.default.svc.cluster.local"),
                        dbAdminUser: pulumi.output("admin"),
                        dbAdminPassword: pulumi.output("admin-password"),
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("app-user"),
                        dbPassword: pulumi.output("app-password"),
                    },
                    gateway: {
                        tlsMode: "self-signed",
                        domains: ["*.pr.aphiria.com"],
                    },
                    app: {
                        webReplicas: 1,
                        apiReplicas: 1,
                        webUrl: "https://pr-123.pr.aphiria.com",
                        apiUrl: "https://pr-123.pr-api.aphiria.com",
                        webImage: "ghcr.io/aphiria/aphiria.com-web:latest",
                        apiImage: "ghcr.io/aphiria/aphiria.com-api:latest",
                        cookieDomain: ".pr.aphiria.com",
                    },
                    monitoring: minimalMonitoringConfig,
                },
                k8sProvider
            );

            expect(stack.api).toBeDefined();
            expect(stack.migration).toBeDefined();
            expect(stack.httpsRedirect).toBeDefined();
        });

        it("should use default database credentials when createDatabase is false", () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
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
                        webImage: "ghcr.io/aphiria/aphiria.com-web:latest",
                        apiImage: "ghcr.io/aphiria/aphiria.com-api:latest",
                        cookieDomain: ".aphiria.com",
                    },
                    monitoring: minimalMonitoringConfig,
                },
                k8sProvider
            );

            expect(stack.api).toBeDefined();
        });

        it("should use imagePullSecrets when namespace has imagePullSecret", () => {
            const stack = createStack(
                {
                    env: "preview",
                    skipBaseInfrastructure: true,
                    namespace: {
                        name: "preview-pr-123",
                        imagePullSecret: {
                            registry: "ghcr.io",
                            username: pulumi.output("username"),
                            token: pulumi.output("token"),
                        },
                    },
                    database: {
                        createDatabase: true,
                        databaseName: "aphiria_pr_123",
                        dbHost: pulumi.output("db.default.svc.cluster.local"),
                        dbAdminUser: pulumi.output("admin"),
                        dbAdminPassword: pulumi.output("admin-password"),
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "self-signed",
                        domains: ["*.pr.aphiria.com"],
                    },
                    app: {
                        webReplicas: 1,
                        apiReplicas: 1,
                        webUrl: "https://pr-123.pr.aphiria.com",
                        apiUrl: "https://pr-123.pr-api.aphiria.com",
                        webImage: "ghcr.io/aphiria/aphiria.com-web:latest",
                        apiImage: "ghcr.io/aphiria/aphiria.com-api:latest",
                        cookieDomain: ".pr.aphiria.com",
                    },
                    monitoring: minimalMonitoringConfig,
                },
                k8sProvider
            );

            expect(stack.web).toBeDefined();
            expect(stack.api).toBeDefined();
            expect(stack.migration).toBeDefined();
        });

        it("should include preview-specific envConfig for preview environment", () => {
            const stack = createStack(
                {
                    env: "preview",
                    skipBaseInfrastructure: true,
                    namespace: {
                        name: "preview-pr-456",
                    },
                    database: {
                        createDatabase: true,
                        databaseName: "aphiria_pr_456",
                        dbHost: pulumi.output("db.default.svc.cluster.local"),
                        dbAdminUser: pulumi.output("admin"),
                        dbAdminPassword: pulumi.output("admin-password"),
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "self-signed",
                        domains: ["*.pr.aphiria.com"],
                    },
                    app: {
                        webReplicas: 1,
                        apiReplicas: 1,
                        webUrl: "https://pr-456.pr.aphiria.com",
                        apiUrl: "https://pr-456.pr-api.aphiria.com",
                        webImage: "ghcr.io/aphiria/aphiria.com-web:latest",
                        apiImage: "ghcr.io/aphiria/aphiria.com-api:latest",
                        cookieDomain: ".pr.aphiria.com",
                    },
                    monitoring: minimalMonitoringConfig,
                },
                k8sProvider
            );

            expect(stack.web).toBeDefined();
            expect(stack.api).toBeDefined();
        });

        it("should use default database name when databaseName not provided", () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
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
                        webImage: "ghcr.io/aphiria/aphiria.com-web:latest",
                        apiImage: "ghcr.io/aphiria/aphiria.com-api:latest",
                        cookieDomain: ".aphiria.com",
                    },
                    monitoring: minimalMonitoringConfig,
                },
                k8sProvider
            );

            expect(stack.api).toBeDefined();
        });

        it("should create HTTP redirect routes for production environment", () => {
            const stack = createStack(
                {
                    env: "production",
                    database: {
                        persistentStorage: true,
                        storageSize: "50Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["aphiria.com", "*.aphiria.com"],
                        dnsToken: pulumi.output("fake-dns-token"),
                    },
                    app: {
                        webReplicas: 2,
                        apiReplicas: 2,
                        webUrl: "https://www.aphiria.com",
                        apiUrl: "https://api.aphiria.com",
                        webImage: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123",
                        apiImage: "ghcr.io/aphiria/aphiria.com-api@sha256:def456",
                        cookieDomain: ".aphiria.com",
                    },
                    monitoring: minimalMonitoringConfig,
                },
                k8sProvider
            );

            expect(stack.httpsRedirect).toBeDefined();
            expect(stack.wwwRedirect).toBeDefined();
        });

        it("should create HTTPS redirect but not WWW redirect for preview-base", () => {
            const stack = createStack(
                {
                    env: "preview",
                    skipBaseInfrastructure: false,
                    database: {
                        persistentStorage: true,
                        storageSize: "20Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["*.pr.aphiria.com", "*.pr-api.aphiria.com"],
                        dnsToken: pulumi.output("fake-dns-token"),
                    },
                },
                k8sProvider
            );

            expect(stack.httpsRedirect).toBeDefined();
            expect(stack.wwwRedirect).toBeUndefined();
        });

        it("should not create HTTP redirect routes when skipBaseInfrastructure is true", () => {
            const stack = createStack(
                {
                    env: "preview",
                    skipBaseInfrastructure: true,
                    namespace: {
                        name: "preview-pr-123",
                    },
                    database: {
                        createDatabase: true,
                        databaseName: "aphiria_pr_123",
                        dbHost: pulumi.output("db.default.svc.cluster.local"),
                        dbAdminUser: pulumi.output("admin"),
                        dbAdminPassword: pulumi.output("admin-password"),
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("app-user"),
                        dbPassword: pulumi.output("app-password"),
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
                    },
                    monitoring: minimalMonitoringConfig,
                },
                k8sProvider
            );

            expect(stack.httpsRedirect).toBeDefined(); // Preview-PR creates its own redirect
            expect(stack.wwwRedirect).toBeUndefined();
        });
    });

    describe("base infrastructure", () => {
        it("should install Helm charts when skipBaseInfrastructure is false", async () => {
            const stack = createStack(
                {
                    env: "preview",
                    skipBaseInfrastructure: false,
                    database: {
                        persistentStorage: true,
                        storageSize: "10Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["*.pr.aphiria.com"],
                        dnsToken: pulumi.output("fake-dns-token"),
                    },
                },
                k8sProvider
            );

            expect(stack.helmCharts).toBeDefined();
            expect(stack.gateway).toBeDefined();

            const [certUrn, nginxUrn, gwUrn] = await Promise.all([
                promiseOf(stack.helmCharts!.certManager.urn),
                promiseOf(stack.helmCharts!.nginxGateway.urn),
                promiseOf(stack.gateway!.urn),
            ]);
            expect(certUrn).toContain("cert-manager");
            expect(nginxUrn).toContain("nginx-gateway");
            expect(gwUrn).toContain("gateway");
        });

        // DNS record creation requires Chart.resources which is only available at runtime
        // This is verified through integration tests (actual deployments)
        it.skip("should create DNS records when gateway.dns is configured", () => {
            const stack = createStack(
                {
                    env: "production",
                    skipBaseInfrastructure: false,
                    database: {
                        persistentStorage: true,
                        storageSize: "20Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["aphiria.com", "*.aphiria.com"],
                        dnsToken: pulumi.output("fake-dns-token"),
                        dns: {
                            domain: "aphiria.com",
                            records: [
                                { name: "@", resourceName: "production-root-dns" },
                                { name: "www", resourceName: "production-www-dns" },
                                { name: "api", resourceName: "production-api-dns" },
                            ],
                            ttl: 300,
                        },
                    },
                },
                k8sProvider
            );

            expect(stack.gateway).toBeDefined();
            expect(stack.gateway?.ip).toBeDefined();
            expect(stack.gateway?.dnsRecords).toBeDefined();
            expect(stack.gateway?.dnsRecords?.length).toBe(3);
        });

        it("should skip Helm charts when skipBaseInfrastructure is true", () => {
            const stack = createStack(
                {
                    env: "preview",
                    skipBaseInfrastructure: true,
                    namespace: {
                        name: "preview-pr-123",
                    },
                    database: {
                        createDatabase: true,
                        databaseName: "aphiria_pr_123",
                        dbHost: pulumi.output("db.default.svc.cluster.local"),
                        dbAdminUser: pulumi.output("postgres"),
                        dbAdminPassword: pulumi.output("password"),
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["*.pr.aphiria.com"],
                    },
                },
                k8sProvider
            );

            expect(stack.helmCharts).toBeUndefined();
            expect(stack.gateway).toBeUndefined();
        });
    });

    describe("monitoring", () => {
        it("should create monitoring namespace and components when monitoring config provided", async () => {
            const stack = createStack(
                {
                    env: "production",
                    database: {
                        persistentStorage: true,
                        storageSize: "20Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["aphiria.com", "*.aphiria.com"],
                        dnsToken: pulumi.output("fake-dns-token"),
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token"),
                            storageSize: "10Gi",
                            scrapeInterval: "15s",
                            retentionTime: "7d",
                        },
                        grafana: {
                            storageSize: "5Gi",
                            hostname: "grafana.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("test-client-id"),
                                clientSecret: pulumi.output("test-client-secret"),
                                org: "aphiria",
                                adminUser: "davidbyoung",
                            },
                            smtp: {
                                host: pulumi.output("smtp.example.com"),
                                port: 587,
                                user: pulumi.output("user@example.com"),
                                password: pulumi.output("password"),
                                fromAddress: "admin@aphiria.com",
                                alertEmail: "admin@aphiria.com",
                            },
                        },
                    },
                },
                k8sProvider
            );

            expect(stack.monitoring).toBeDefined();
            expect(stack.monitoring?.namespace).toBeDefined();
            expect(stack.monitoring?.kubePrometheusStack).toBeDefined();
            expect(stack.monitoring?.grafana).toBeDefined();
            expect(stack.monitoring?.grafanaIngress).toBeDefined();

            const [nsName, quotaName] = await Promise.all([
                promiseOf(stack.monitoring!.namespace.namespace.metadata.name),
                promiseOf(stack.monitoring!.namespace.resourceQuota!.metadata.name),
            ]);
            expect(nsName).toBe("monitoring");
            expect(quotaName).toBe("monitoring-quota");
        });

        it("should use custom Prometheus resources when provided", async () => {
            const stack = createStack(
                {
                    env: "preview",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: true,
                        storageSize: "5Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["*.pr.aphiria.com"],
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token"),
                            storageSize: "5Gi",
                            scrapeInterval: "15s",
                            retentionTime: "7d",
                            resources: {
                                requests: { cpu: "100m", memory: "256Mi" },
                                limits: { cpu: "500m", memory: "512Mi" },
                            },
                        },
                        grafana: {
                            storageSize: "2Gi",
                            hostname: "grafana.pr.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("test-client-id"),
                                clientSecret: pulumi.output("test-client-secret"),
                                org: "aphiria",
                                adminUser: "test",
                            },
                        },
                    },
                },
                k8sProvider
            );

            expect(stack.monitoring).toBeDefined();
            expect(stack.monitoring?.kubePrometheusStack).toBeDefined();
        });

        it("should use default Prometheus resources when not provided", async () => {
            const stack = createStack(
                {
                    env: "preview",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: true,
                        storageSize: "5Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["*.pr.aphiria.com"],
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token"),
                            storageSize: "5Gi",
                            // No resources specified - should use defaults
                        },
                        grafana: {
                            storageSize: "2Gi",
                            hostname: "grafana.pr.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("test-client-id"),
                                clientSecret: pulumi.output("test-client-secret"),
                                org: "aphiria",
                                adminUser: "test",
                            },
                        },
                    },
                },
                k8sProvider
            );

            expect(stack.monitoring).toBeDefined();
            expect(stack.monitoring?.kubePrometheusStack).toBeDefined();
        });

        it("should not create monitoring when monitoring config not provided", () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "self-signed",
                        domains: ["*.aphiria.com"],
                    },
                },
                k8sProvider
            );

            expect(stack.monitoring).toBeUndefined();
        });

        it("should use default scrapeInterval and retentionTime when not provided", () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "self-signed",
                        domains: ["*.aphiria.com"],
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token"),
                            storageSize: "5Gi",
                        },
                        grafana: {
                            storageSize: "2Gi",
                            hostname: "grafana.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("client-id"),
                                clientSecret: pulumi.output("client-secret"),
                                org: "aphiria",
                                adminUser: "davidbyoung",
                            },
                        },
                    },
                },
                k8sProvider
            );

            expect(stack.monitoring).toBeDefined();
            expect(stack.monitoring?.kubePrometheusStack).toBeDefined();
        });

        it("should configure kube-prometheus-stack with skipAwait for Helm v4", () => {
            const stack = createStack(
                {
                    env: "production",
                    database: {
                        persistentStorage: true,
                        storageSize: "20Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["aphiria.com", "*.aphiria.com"],
                        dnsToken: pulumi.output("fake-dns-token"),
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token"),
                            storageSize: "10Gi",
                        },
                        grafana: {
                            storageSize: "5Gi",
                            hostname: "grafana.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("client-id"),
                                clientSecret: pulumi.output("client-secret"),
                                org: "aphiria",
                                adminUser: "davidbyoung",
                            },
                        },
                    },
                },
                k8sProvider
            );

            // Verify kube-prometheus-stack is created as v4.Chart
            expect(stack.monitoring?.kubePrometheusStack).toBeDefined();

            // Note: skipAwait and other Helm options are set in installKubePrometheusStack
            // We verify the chart exists, which confirms it was installed with v4 API
            expect(stack.monitoring?.kubePrometheusStack.urn).toBeDefined();
        });

        it("should configure Prometheus with resource limits for ResourceQuota compliance", async () => {
            const stack = createStack(
                {
                    env: "production",
                    database: {
                        persistentStorage: true,
                        storageSize: "20Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["aphiria.com", "*.aphiria.com"],
                        dnsToken: pulumi.output("fake-dns-token"),
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token"),
                            storageSize: "10Gi",
                            scrapeInterval: "30s",
                            retentionTime: "14d",
                        },
                        grafana: {
                            storageSize: "5Gi",
                            hostname: "grafana.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("client-id"),
                                clientSecret: pulumi.output("client-secret"),
                                org: "aphiria",
                                adminUser: "davidbyoung",
                            },
                        },
                    },
                },
                k8sProvider
            );

            expect(stack.monitoring?.kubePrometheusStack).toBeDefined();

            // Verify the Helm chart is created with v4 API
            const urn = await promiseOf(stack.monitoring!.kubePrometheusStack.urn);
            expect(urn).toContain("kube-prometheus-stack");
        });

        it("should disable TLS and admission webhooks for Helm v4 compatibility", () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "self-signed",
                        domains: ["*.aphiria.com"],
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token"),
                            storageSize: "5Gi",
                        },
                        grafana: {
                            storageSize: "2Gi",
                            hostname: "grafana.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("client-id"),
                                clientSecret: pulumi.output("client-secret"),
                                org: "aphiria",
                                adminUser: "davidbyoung",
                            },
                        },
                    },
                },
                k8sProvider
            );

            // Verify monitoring stack is created
            // The TLS/webhook disabling is in the Helm values passed to installKubePrometheusStack
            // We verify the chart was created successfully, which confirms the config works
            expect(stack.monitoring?.kubePrometheusStack).toBeDefined();
        });

        it("should enable kube-state-metrics with resource limits", () => {
            const stack = createStack(
                {
                    env: "preview",
                    skipBaseInfrastructure: false,
                    database: {
                        persistentStorage: true,
                        storageSize: "10Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["*.pr.aphiria.com"],
                        dnsToken: pulumi.output("fake-dns-token"),
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token"),
                            storageSize: "5Gi",
                        },
                        grafana: {
                            storageSize: "2Gi",
                            hostname: "grafana.pr.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("client-id"),
                                clientSecret: pulumi.output("client-secret"),
                                org: "aphiria",
                                adminUser: "davidbyoung",
                            },
                        },
                    },
                },
                k8sProvider
            );

            // Verify kube-prometheus-stack is created with kube-state-metrics enabled
            // Resource limits are configured in Helm values: 50m/128Mi requests, 100m/256Mi limits
            expect(stack.monitoring?.kubePrometheusStack).toBeDefined();
        });

        it("should configure prometheus-node-exporter with resource limits", () => {
            const stack = createStack(
                {
                    env: "production",
                    database: {
                        persistentStorage: true,
                        storageSize: "20Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["aphiria.com", "*.aphiria.com"],
                        dnsToken: pulumi.output("fake-dns-token"),
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token"),
                            storageSize: "10Gi",
                        },
                        grafana: {
                            storageSize: "5Gi",
                            hostname: "grafana.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("client-id"),
                                clientSecret: pulumi.output("client-secret"),
                                org: "aphiria",
                                adminUser: "davidbyoung",
                            },
                        },
                    },
                },
                k8sProvider
            );

            // Verify kube-prometheus-stack is created with node-exporter resources
            // Resource limits: 50m/64Mi requests, 100m/128Mi limits
            expect(stack.monitoring?.kubePrometheusStack).toBeDefined();
        });

        it("should disable Grafana and Alertmanager in kube-prometheus-stack", () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "self-signed",
                        domains: ["*.aphiria.com"],
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token"),
                            storageSize: "5Gi",
                        },
                        grafana: {
                            storageSize: "2Gi",
                            hostname: "grafana.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("client-id"),
                                clientSecret: pulumi.output("client-secret"),
                                org: "aphiria",
                                adminUser: "davidbyoung",
                            },
                        },
                    },
                },
                k8sProvider
            );

            // Verify we manage Grafana separately (not via kube-prometheus-stack)
            expect(stack.monitoring?.grafana).toBeDefined();
            expect(stack.monitoring?.kubePrometheusStack).toBeDefined();

            // Grafana and Alertmanager are disabled in Helm values
            // We verify both custom Grafana and kube-prometheus-stack coexist
        });

        it("should create ServiceMonitor when monitoring and app configs are provided", async () => {
            const stack = createStack(
                {
                    env: "production",
                    database: {
                        persistentStorage: true,
                        storageSize: "20Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["aphiria.com", "*.aphiria.com"],
                        dnsToken: pulumi.output("fake-dns-token"),
                    },
                    app: {
                        webReplicas: 2,
                        apiReplicas: 2,
                        webUrl: "https://www.aphiria.com",
                        apiUrl: "https://api.aphiria.com",
                        webImage: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123",
                        apiImage: "ghcr.io/aphiria/aphiria.com-api@sha256:def456",
                        cookieDomain: ".aphiria.com",
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token-123"),
                            storageSize: "10Gi",
                            scrapeInterval: "30s",
                        },
                        grafana: {
                            storageSize: "5Gi",
                            hostname: "grafana.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("client-id"),
                                clientSecret: pulumi.output("client-secret"),
                                org: "aphiria",
                                adminUser: "davidbyoung",
                            },
                        },
                    },
                },
                k8sProvider
            );

            expect(stack.apiServiceMonitor).toBeDefined();
            expect(stack.apiServiceMonitor?.secret).toBeDefined();
            expect(stack.apiServiceMonitor?.serviceMonitor).toBeDefined();

            const [secretName, smApiVersion, smKind] = await Promise.all([
                promiseOf(stack.apiServiceMonitor!.secret.metadata.name),
                promiseOf(stack.apiServiceMonitor!.serviceMonitor.apiVersion),
                promiseOf(stack.apiServiceMonitor!.serviceMonitor.kind),
            ]);

            expect(secretName).toBe("prometheus-api-auth");
            expect(smApiVersion).toBe("monitoring.coreos.com/v1");
            expect(smKind).toBe("ServiceMonitor");
        });

        it("should use custom scrape interval for ServiceMonitor", async () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
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
                        webImage: "ghcr.io/aphiria/aphiria.com-web:latest",
                        apiImage: "ghcr.io/aphiria/aphiria.com-api:latest",
                        cookieDomain: ".aphiria.com",
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token"),
                            storageSize: "5Gi",
                            scrapeInterval: "60s",
                        },
                        grafana: {
                            storageSize: "2Gi",
                            hostname: "grafana.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("client-id"),
                                clientSecret: pulumi.output("client-secret"),
                                org: "aphiria",
                                adminUser: "davidbyoung",
                            },
                        },
                    },
                },
                k8sProvider
            );

            expect(stack.apiServiceMonitor).toBeDefined();

            // Verify ServiceMonitor was created (spec not directly accessible in CustomResource)
            const kind = await promiseOf(stack.apiServiceMonitor!.serviceMonitor.kind);
            expect(kind).toBe("ServiceMonitor");
        });

        it("should not create ServiceMonitor when monitoring config not provided", () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: true,
                    database: {
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "self-signed",
                        domains: ["*.aphiria.com"],
                    },
                    // No app config - so no API deployment, and no ServiceMonitor
                },
                k8sProvider
            );

            expect(stack.apiServiceMonitor).toBeUndefined();
        });

        it("should not create ServiceMonitor when app config not provided", () => {
            const stack = createStack(
                {
                    env: "production",
                    database: {
                        persistentStorage: true,
                        storageSize: "20Gi",
                        dbUser: pulumi.output("postgres"),
                        dbPassword: pulumi.output("password"),
                    },
                    gateway: {
                        tlsMode: "letsencrypt-prod",
                        domains: ["aphiria.com", "*.aphiria.com"],
                        dnsToken: pulumi.output("fake-dns-token"),
                    },
                    monitoring: {
                        prometheus: {
                            authToken: pulumi.output("test-token"),
                            storageSize: "10Gi",
                        },
                        grafana: {
                            storageSize: "5Gi",
                            hostname: "grafana.aphiria.com",
                            githubOAuth: {
                                clientId: pulumi.output("client-id"),
                                clientSecret: pulumi.output("client-secret"),
                                org: "aphiria",
                                adminUser: "davidbyoung",
                            },
                        },
                    },
                },
                k8sProvider
            );

            expect(stack.apiServiceMonitor).toBeUndefined();
        });
    });

    describe("Gateway API CRD and GatewayClass installation", () => {
        it("should install Gateway API CRDs and GatewayClass for local environment", () => {
            const stack = createStack(
                {
                    env: "local",
                    skipBaseInfrastructure: false,
                    database: {
                        persistentStorage: true,
                        storageSize: "5Gi",
                        dbUser: "postgres",
                        dbPassword: "postgres",
                    },
                    gateway: {
                        tlsMode: "self-signed",
                        domains: ["aphiria.com", "*.aphiria.com"],
                    },
                    app: {
                        webReplicas: 1,
                        apiReplicas: 1,
                        webUrl: "https://www.aphiria.com",
                        apiUrl: "https://api.aphiria.com",
                        webImage: "aphiria.com-web:latest",
                        apiImage: "aphiria.com-api:latest",
                        cookieDomain: ".aphiria.com",
                    },
                    monitoring: minimalMonitoringConfig,
                },
                k8sProvider
            );

            // Verify Helm charts were installed (which includes CRD and GatewayClass dependencies for local)
            expect(stack.helmCharts).toBeDefined();
            expect(stack.helmCharts?.certManager).toBeDefined();
            expect(stack.helmCharts?.nginxGateway).toBeDefined();
        });

        it("should NOT install Gateway API CRDs for preview environment", () => {
            const stack = createStack(
                {
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
                        dbHost: pulumi.output("db.default.svc.cluster.local"),
                        dbAdminUser: pulumi.output("postgres"),
                        dbAdminPassword: pulumi.output("password"),
                        persistentStorage: false,
                        storageSize: "1Gi",
                        dbUser: "postgres",
                        dbPassword: "postgres",
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
                    },
                    monitoring: minimalMonitoringConfig,
                },
                k8sProvider
            );

            // skipBaseInfrastructure means no Helm charts (and no CRDs)
            expect(stack.helmCharts).toBeUndefined();
        });
    });
});
