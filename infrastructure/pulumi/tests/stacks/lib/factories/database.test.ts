import { createDatabaseResources } from "../../../../src/stacks/lib/factories/database";
import { PostgreSQLConfig } from "../../../../src/stacks/lib/config/types";
import * as k8s from "@pulumi/kubernetes";

// Mock the component functions
jest.mock("../../../../src/components", () => ({
    createDatabaseCreationJob: jest.fn(),
}));

jest.mock("../../../../src/components/database", () => ({
    createPostgreSQL: jest.fn(),
}));

import { createDatabaseCreationJob } from "../../../../src/components";
import { createPostgreSQL } from "../../../../src/components/database";

describe("createDatabaseResources", () => {
    const k8sProvider = new k8s.Provider("test-provider", {
        kubeconfig: "fake-kubeconfig",
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("shared PostgreSQL instance pattern", () => {
        const postgresqlConfig: PostgreSQLConfig = {
            user: "postgres",
            password: "test-password",
            dbHost: "db",
            resources: {
                requests: { cpu: "500m", memory: "512Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            persistentStorage: true,
            storageSize: "10Gi",
            version: "17-alpine",
            useHostPath: false,
        };

        it("should create PostgreSQL instance with username and password from config", () => {
            (createPostgreSQL as jest.Mock).mockReturnValue({
                deployment: {},
                service: {},
                pvc: {},
            });

            createDatabaseResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                postgresqlConfig,
            });

            expect(createPostgreSQL).toHaveBeenCalledWith(
                expect.objectContaining({
                    username: "postgres",
                    password: "test-password",
                })
            );
        });

        it("should create PostgreSQL instance with 1 replica", () => {
            (createPostgreSQL as jest.Mock).mockReturnValue({
                deployment: {},
                service: {},
            });

            createDatabaseResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                postgresqlConfig,
            });

            expect(createPostgreSQL).toHaveBeenCalledWith(
                expect.objectContaining({
                    replicas: 1,
                })
            );
        });

        it("should configure PostgreSQL with resource limits from config", () => {
            (createPostgreSQL as jest.Mock).mockReturnValue({
                deployment: {},
                service: {},
            });

            createDatabaseResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                postgresqlConfig,
            });

            expect(createPostgreSQL).toHaveBeenCalledWith(
                expect.objectContaining({
                    resources: {
                        requests: { cpu: "500m", memory: "512Mi" },
                        limits: { cpu: "500m", memory: "512Mi" },
                    },
                })
            );
        });

        it("should configure PostgreSQL with health check (pg_isready)", () => {
            (createPostgreSQL as jest.Mock).mockReturnValue({
                deployment: {},
                service: {},
            });

            createDatabaseResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                postgresqlConfig,
            });

            expect(createPostgreSQL).toHaveBeenCalledWith(
                expect.objectContaining({
                    healthCheck: {
                        interval: "10s",
                        timeout: "5s",
                        retries: 5,
                        command: ["pg_isready", "-U", "postgres"],
                    },
                })
            );
        });

        it("should configure PostgreSQL with connection pooling (max 100 connections)", () => {
            (createPostgreSQL as jest.Mock).mockReturnValue({
                deployment: {},
                service: {},
            });

            createDatabaseResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                postgresqlConfig,
            });

            expect(createPostgreSQL).toHaveBeenCalledWith(
                expect.objectContaining({
                    connectionPooling: {
                        maxConnections: 100,
                    },
                })
            );
        });

        it("should enable persistent storage with size from config when persistentStorage is true", () => {
            (createPostgreSQL as jest.Mock).mockReturnValue({
                deployment: {},
                service: {},
            });

            createDatabaseResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                postgresqlConfig,
            });

            expect(createPostgreSQL).toHaveBeenCalledWith(
                expect.objectContaining({
                    storage: expect.objectContaining({
                        enabled: true,
                        size: "10Gi",
                        accessMode: "ReadWriteOnce",
                    }),
                })
            );
        });

        it("should disable persistent storage when persistentStorage is false", () => {
            (createPostgreSQL as jest.Mock).mockReturnValue({
                deployment: {},
                service: {},
            });

            const configNoPersistence: PostgreSQLConfig = {
                ...postgresqlConfig,
                persistentStorage: false,
            };

            createDatabaseResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                postgresqlConfig: configNoPersistence,
            });

            expect(createPostgreSQL).toHaveBeenCalledWith(
                expect.objectContaining({
                    storage: expect.objectContaining({
                        enabled: false,
                    }),
                })
            );
        });

        it("should use hostPath storage when useHostPath is true", () => {
            (createPostgreSQL as jest.Mock).mockReturnValue({
                deployment: {},
                service: {},
                pv: {},
            });

            const configWithHostPath: PostgreSQLConfig = {
                ...postgresqlConfig,
                useHostPath: true,
                hostPath: "/data/postgres",
            };

            createDatabaseResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                postgresqlConfig: configWithHostPath,
            });

            expect(createPostgreSQL).toHaveBeenCalledWith(
                expect.objectContaining({
                    storage: expect.objectContaining({
                        useHostPath: true,
                        hostPath: "/data/postgres",
                    }),
                })
            );
        });

        it("should use PostgreSQL version from config as imageTag", () => {
            (createPostgreSQL as jest.Mock).mockReturnValue({
                deployment: {},
                service: {},
            });

            createDatabaseResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                postgresqlConfig,
            });

            expect(createPostgreSQL).toHaveBeenCalledWith(
                expect.objectContaining({
                    imageTag: "17-alpine",
                })
            );
        });

        it("should create PostgreSQL with default database name 'postgres'", () => {
            (createPostgreSQL as jest.Mock).mockReturnValue({
                deployment: {},
                service: {},
            });

            createDatabaseResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                postgresqlConfig,
            });

            expect(createPostgreSQL).toHaveBeenCalledWith(
                expect.objectContaining({
                    databaseName: "postgres",
                })
            );
        });

        it("should not create database creation job when createDatabase is not set", () => {
            (createPostgreSQL as jest.Mock).mockReturnValue({
                deployment: {},
                service: {},
            });

            createDatabaseResources({
                env: "local",
                provider: k8sProvider,
                namespace: "default",
                postgresqlConfig,
            });

            expect(createDatabaseCreationJob).not.toHaveBeenCalled();
        });
    });

    describe("per-PR database pattern", () => {
        const postgresqlConfigPreviewPR: PostgreSQLConfig = {
            user: "postgres",
            password: "admin-password",
            createDatabase: true,
            databaseName: "aphiria_pr_123",
            dbHost: "db.preview-base.svc.cluster.local",
            resources: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "200m", memory: "256Mi" },
            },
            persistentStorage: false,
            storageSize: "5Gi",
            version: "17-alpine",
            useHostPath: false,
        };

        it("should create database on shared instance using admin credentials when createDatabase is true", () => {
            (createDatabaseCreationJob as jest.Mock).mockReturnValue({});

            createDatabaseResources({
                env: "preview",
                provider: k8sProvider,
                namespace: "pr-123",
                postgresqlConfig: postgresqlConfigPreviewPR,
            });

            expect(createDatabaseCreationJob).toHaveBeenCalledWith({
                namespace: "pr-123",
                databaseName: "aphiria_pr_123",
                dbHost: "db.preview-base.svc.cluster.local",
                dbAdminUser: "postgres",
                dbAdminPassword: "admin-password",
                provider: k8sProvider,
            });
        });

        it("should not create PostgreSQL instance when createDatabase is true", () => {
            (createDatabaseCreationJob as jest.Mock).mockReturnValue({});

            createDatabaseResources({
                env: "preview",
                provider: k8sProvider,
                namespace: "pr-123",
                postgresqlConfig: postgresqlConfigPreviewPR,
            });

            expect(createPostgreSQL).not.toHaveBeenCalled();
        });
    });
});
