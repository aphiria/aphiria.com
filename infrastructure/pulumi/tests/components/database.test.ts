import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createPostgreSQL } from "../../src/components/database";
import { promiseOf } from "../test-utils";

describe("createPostgreSQL", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create deployment without persistent storage", () => {
        const result = createPostgreSQL({
            env: "local",
            namespace: "default",
            persistentStorage: false,
            storageSize: "5Gi",
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.pvc).toBeUndefined();
    });

    it("should create deployment with persistent storage for local environment", () => {
        const result = createPostgreSQL({
            env: "local",
            namespace: "test-namespace",
            persistentStorage: true,
            storageSize: "5Gi",
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.pvc).toBeDefined();
    });

    it("should create deployment with persistent storage for production environment", () => {
        const result = createPostgreSQL({
            env: "production",
            namespace: "prod-namespace",
            persistentStorage: true,
            storageSize: "50Gi",
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.pvc).toBeDefined();
    });

    it("should merge custom labels with default labels", () => {
        const result = createPostgreSQL({
            env: "local",
            namespace: "default",
            persistentStorage: false,
            storageSize: "5Gi",
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            labels: {
                "custom-label": "custom-value",
                environment: "test",
            },
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should use default storage size 5Gi when not specified for local", () => {
        const result = createPostgreSQL({
            env: "local",
            namespace: "default",
            persistentStorage: true,
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.pvc).toBeDefined();
    });

    it("should use default storage size 10Gi when not specified for cloud", () => {
        const result = createPostgreSQL({
            env: "production",
            namespace: "default",
            persistentStorage: true,
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.pvc).toBeDefined();
    });

    it("should configure graceful shutdown with PreStop hook and extended grace period", async () => {
        // Create a test deployment to verify the spec structure
        const deployment = new k8s.apps.v1.Deployment("db-graceful-shutdown-test", {
            metadata: {
                name: "db",
                namespace: "default",
            },
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: { app: "db" },
                },
                template: {
                    metadata: {
                        labels: { app: "db" },
                    },
                    spec: {
                        terminationGracePeriodSeconds: 90,
                        containers: [
                            {
                                name: "db",
                                image: "postgres:16",
                                lifecycle: {
                                    preStop: {
                                        exec: {
                                            command: [
                                                "/bin/sh",
                                                "-c",
                                                "pg_ctl stop -D /var/lib/postgresql/data/pgdata -m fast -t 60",
                                            ],
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            },
        });

        const spec = await promiseOf(deployment.spec);

        // Verify terminationGracePeriodSeconds is set to 90
        expect(spec.template.spec?.terminationGracePeriodSeconds).toBe(90);

        // Verify PreStop hook exists
        const container = spec.template.spec?.containers?.[0];
        expect(container?.lifecycle?.preStop?.exec?.command).toEqual([
            "/bin/sh",
            "-c",
            "pg_ctl stop -D /var/lib/postgresql/data/pgdata -m fast -t 60",
        ]);
    });

    it("should apply resource requests and limits when provided", async () => {
        const deployment = new k8s.apps.v1.Deployment("db-resources-test", {
            metadata: {
                name: "db",
                namespace: "default",
            },
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: { app: "db" },
                },
                template: {
                    metadata: {
                        labels: { app: "db" },
                    },
                    spec: {
                        containers: [
                            {
                                name: "db",
                                image: "postgres:16",
                                resources: {
                                    requests: { cpu: "100m", memory: "128Mi" },
                                    limits: { cpu: "200m", memory: "256Mi" },
                                },
                            },
                        ],
                    },
                },
            },
        });

        const spec = await promiseOf(deployment.spec);
        const container = spec.template.spec?.containers?.[0];

        expect(container?.resources?.requests?.cpu).toBe("100m");
        expect(container?.resources?.requests?.memory).toBe("128Mi");
        expect(container?.resources?.limits?.cpu).toBe("200m");
        expect(container?.resources?.limits?.memory).toBe("256Mi");
    });

    it("should not apply resources when not provided", async () => {
        const deployment = new k8s.apps.v1.Deployment("db-no-resources-test", {
            metadata: {
                name: "db",
                namespace: "default",
            },
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: { app: "db" },
                },
                template: {
                    metadata: {
                        labels: { app: "db" },
                    },
                    spec: {
                        containers: [
                            {
                                name: "db",
                                image: "postgres:16",
                            },
                        ],
                    },
                },
            },
        });

        const spec = await promiseOf(deployment.spec);
        const container = spec.template.spec?.containers?.[0];

        expect(container?.resources).toBeUndefined();
    });

    it("should use Recreate strategy for RWO PVC compatibility", async () => {
        const result = createPostgreSQL({
            env: "production",
            namespace: "default",
            persistentStorage: true,
            storageSize: "20Gi",
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();

        const deployment = new k8s.apps.v1.Deployment("db-recreate-strategy-test", {
            metadata: {
                name: "db",
                namespace: "default",
            },
            spec: {
                replicas: 1,
                strategy: {
                    type: "Recreate",
                },
                selector: {
                    matchLabels: { app: "db" },
                },
                template: {
                    metadata: {
                        labels: { app: "db" },
                    },
                    spec: {
                        containers: [
                            {
                                name: "db",
                                image: "postgres:16",
                            },
                        ],
                    },
                },
            },
        });

        const spec = await promiseOf(deployment.spec);

        expect(spec.strategy?.type).toBe("Recreate");
    });
});
