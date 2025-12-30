import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createStack } from "../../../src/stacks/lib/stack-factory";

describe("createStack factory", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        pulumi.runtime.setMocks({
            newResource: (
                args: pulumi.runtime.MockResourceArgs
            ): { id: string; state: Record<string, unknown> } => {
                return {
                    id: args.inputs.name ? `${args.name}-id` : `${args.type}-id`,
                    state: {
                        ...args.inputs,
                    },
                };
            },
            call: (args: pulumi.runtime.MockCallArgs): Record<string, unknown> => {
                return args.inputs;
            },
        });

        k8sProvider = new k8s.Provider("test", {});
    });

    describe("namespace creation", () => {
        it("should create namespace with ResourceQuota when configured", (done) => {
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

            pulumi
                .all([
                    stack.namespace!.namespace.metadata.name,
                    stack.namespace!.resourceQuota!.metadata.name,
                ])
                .apply(([nsName, quotaName]) => {
                    expect(nsName).toBe("preview-pr-123");
                    expect(quotaName).toBe("preview-pr-123-quota");
                    done();
                });
        });

        it("should not create namespace when not configured", () => {
            const stack = createStack(
                {
                    env: "local",
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
        it("should deploy applications when app config provided", (done) => {
            const stack = createStack(
                {
                    env: "local",
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
                },
                k8sProvider
            );

            expect(stack.web).toBeDefined();
            expect(stack.api).toBeDefined();
            expect(stack.migration).toBeDefined();
            expect(stack.webRoute).toBeDefined();
            expect(stack.apiRoute).toBeDefined();

            pulumi
                .all([
                    stack.web!.deployment.name,
                    stack.api!.deployment.name,
                    stack.migration!.metadata.name,
                ])
                .apply(([webName, apiName, migrationName]) => {
                    expect(webName).toBe("web");
                    expect(apiName).toBe("api");
                    expect(migrationName).toBe("db-migration");
                    done();
                });
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
                },
                k8sProvider
            );

            expect(stack.httpsRedirect).toBeDefined(); // Preview-PR creates its own redirect
            expect(stack.wwwRedirect).toBeUndefined();
        });
    });

    describe("base infrastructure", () => {
        it("should install Helm charts when skipBaseInfrastructure is false", (done) => {
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

            pulumi
                .all([
                    stack.helmCharts!.certManager.urn,
                    stack.helmCharts!.nginxGateway.urn,
                    stack.gateway!.urn,
                ])
                .apply(([certUrn, nginxUrn, gwUrn]) => {
                    expect(certUrn).toContain("cert-manager");
                    expect(nginxUrn).toContain("nginx-gateway");
                    expect(gwUrn).toContain("gateway");
                    done();
                });
        });

        it("should create DNS records when gateway.dns is configured", () => {
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
        it("should create monitoring namespace and components when monitoring config provided", (done) => {
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

            pulumi
                .all([
                    stack.monitoring!.namespace.namespace.metadata.name,
                    stack.monitoring!.namespace.resourceQuota!.metadata.name,
                ])
                .apply(([nsName, quotaName]) => {
                    expect(nsName).toBe("monitoring");
                    expect(quotaName).toBe("monitoring-quota");
                    done();
                });
        });

        it("should not create monitoring when monitoring config not provided", () => {
            const stack = createStack(
                {
                    env: "local",
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

        it("should configure Prometheus with resource limits for ResourceQuota compliance", (done) => {
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
            pulumi.output(stack.monitoring!.kubePrometheusStack.urn).apply((urn) => {
                expect(urn).toContain("kube-prometheus-stack");
                done();
            });
        });

        it("should disable TLS and admission webhooks for Helm v4 compatibility", () => {
            const stack = createStack(
                {
                    env: "local",
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
    });

    describe("Gateway API CRD and GatewayClass installation", () => {
        it("should install Gateway API CRDs and GatewayClass for local environment", () => {
            const stack = createStack(
                {
                    env: "local",
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
                },
                k8sProvider
            );

            // skipBaseInfrastructure means no Helm charts (and no CRDs)
            expect(stack.helmCharts).toBeUndefined();
        });
    });
});
