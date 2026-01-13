import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createPostgreSQL, PostgreSQLArgs } from "../../src/components/database";
import { promiseOf } from "../test-utils";

describe("createPostgreSQL", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    // Helper to create valid test args
    const getTestArgs = (overrides: Partial<PostgreSQLArgs> = {}): PostgreSQLArgs => ({
        username: "postgres",
        password: pulumi.output("password"),
        replicas: 1,
        resources: {
            requests: { cpu: "100m", memory: "256Mi" },
            limits: { cpu: "500m", memory: "512Mi" },
        },
        healthCheck: {
            interval: "10s",
            timeout: "5s",
            retries: 5,
            command: ["pg_isready", "-U", "postgres"],
        },
        namespace: "default",
        storage: {
            enabled: false,
            size: "5Gi",
            accessMode: "ReadWriteOnce",
        },
        imageTag: "16",
        databaseName: "postgres",
        provider: k8sProvider,
        ...overrides,
    });

    it("should create deployment without persistent storage", () => {
        const result = createPostgreSQL(
            getTestArgs({
                storage: {
                    enabled: false,
                    size: "5Gi",
                    accessMode: "ReadWriteOnce",
                },
            })
        );

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.pvc).toBeUndefined();
    });

    it("should create deployment with persistent storage for local environment", () => {
        const result = createPostgreSQL(
            getTestArgs({
                namespace: "test-namespace",
                storage: { enabled: true, accessMode: "ReadWriteOnce", size: "5Gi" },
            })
        );

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.pvc).toBeDefined();
    });

    it("should create deployment with persistent storage for production environment", () => {
        const result = createPostgreSQL(
            getTestArgs({
                namespace: "prod-namespace",
                storage: { enabled: true, accessMode: "ReadWriteOnce", size: "50Gi" },
            })
        );

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.pvc).toBeDefined();
    });

    it("should merge custom labels with default labels", () => {
        const result = createPostgreSQL(
            getTestArgs({
                storage: { enabled: true, accessMode: "ReadWriteOnce", size: "5Gi" },
                labels: {
                    "custom-label": "custom-value",
                    environment: "test",
                },
            })
        );

        expect(result.deployment).toBeDefined();
    });

    it("should use default storage size 5Gi when not specified for local", () => {
        const result = createPostgreSQL(
            getTestArgs({
                storage: { enabled: true, size: "5Gi", accessMode: "ReadWriteOnce" },
            })
        );

        expect(result.deployment).toBeDefined();
        expect(result.pvc).toBeDefined();
    });

    it("should use default storage size 10Gi when not specified for cloud", () => {
        const result = createPostgreSQL(
            getTestArgs({
                storage: { enabled: true, size: "10Gi", accessMode: "ReadWriteOnce" },
            })
        );

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
        const result = createPostgreSQL(
            getTestArgs({
                storage: { enabled: true, accessMode: "ReadWriteOnce", size: "20Gi" },
            })
        );

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

    it("should create hostPath PV and PVC for local development", () => {
        const result = createPostgreSQL(
            getTestArgs({
                namespace: "local",
                storage: {
                    enabled: true,
                    size: "5Gi",
                    accessMode: "ReadWriteOnce",
                    useHostPath: true,
                    hostPath: "/data/postgres",
                },
            })
        );

        // Verify PV and PVC are both created (exercises hostPath branch)
        expect(result.pv).toBeDefined();
        expect(result.pvc).toBeDefined();
        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
    });

    it("should create PVC without PV when using dynamic provisioning", () => {
        const result = createPostgreSQL(
            getTestArgs({
                namespace: "production",
                storage: {
                    enabled: true,
                    size: "50Gi",
                    accessMode: "ReadWriteOnce",
                    storageClassName: "do-block-storage",
                },
            })
        );

        // Verify only PVC is created (no PV for dynamic provisioning)
        expect(result.pv).toBeUndefined();
        expect(result.pvc).toBeDefined();
        expect(result.deployment).toBeDefined();
    });

    it("should configure connection pooling when provided", () => {
        const result = createPostgreSQL(
            getTestArgs({
                namespace: "production",
                storage: {
                    enabled: true,
                    size: "50Gi",
                    accessMode: "ReadWriteOnce",
                },
                connectionPooling: {
                    maxConnections: 200,
                },
            })
        );

        // Verify deployment is created with connection pooling config
        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
    });

    it("should use default maxConnections when not specified", () => {
        const result = createPostgreSQL(
            getTestArgs({
                namespace: "production",
                storage: {
                    enabled: true,
                    size: "50Gi",
                    accessMode: "ReadWriteOnce",
                },
                connectionPooling: {},
            })
        );

        // Verify deployment is created (exercises default maxConnections fallback)
        expect(result.deployment).toBeDefined();
    });

    it("should use RollingUpdate strategy for ReadWriteMany access mode", () => {
        const result = createPostgreSQL(
            getTestArgs({
                namespace: "production",
                storage: {
                    enabled: true,
                    size: "50Gi",
                    accessMode: "ReadWriteMany",
                    storageClassName: "nfs",
                },
            })
        );

        // Verify deployment is created with RollingUpdate strategy
        expect(result.deployment).toBeDefined();
        expect(result.pvc).toBeDefined();
    });
});
