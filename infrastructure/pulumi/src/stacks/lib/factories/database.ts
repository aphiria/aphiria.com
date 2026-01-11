import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { Environment } from "../types";
import { createDatabaseCreationJob } from "../../../components";
import { createPostgreSQL, PostgreSQLResult } from "../../../components/database";
import { PostgreSQLConfig } from "../config/types";

/**
 * Database resources
 */
export interface DatabaseResources {
    postgres?: PostgreSQLResult;
    dbInitJob?: k8s.batch.v1.Job;
}

/**
 * Arguments for creating database resources
 */
export interface DatabaseResourcesArgs {
    env: Environment;
    provider: k8s.Provider;
    namespace: pulumi.Output<string> | string;
    postgresqlConfig: PostgreSQLConfig;
}

/**
 * Creates database resources (PostgreSQL instance OR database creation job)
 *
 * This factory handles two patterns:
 * - Shared PostgreSQL instance (local, preview-base, production): Creates full PostgreSQL deployment
 * - Per-PR database (preview-pr): Creates database on shared instance via Job
 *
 * @param args - Database resources configuration
 * @returns Database resources
 */
export function createDatabaseResources(args: DatabaseResourcesArgs): DatabaseResources {
    const { provider, namespace, postgresqlConfig } = args;

    const resources: DatabaseResources = {};

    if (postgresqlConfig.createDatabase && postgresqlConfig.databaseName) {
        // Preview-PR: Create database on shared instance
        resources.dbInitJob = createDatabaseCreationJob({
            namespace,
            databaseName: postgresqlConfig.databaseName,
            dbHost: postgresqlConfig.dbHost,
            dbAdminUser: postgresqlConfig.user,
            dbAdminPassword: postgresqlConfig.password,
            provider,
        });
    } else {
        // Local/Preview-Base/Production: Create PostgreSQL instance
        resources.postgres = createPostgreSQL({
            username: postgresqlConfig.user,
            password: postgresqlConfig.password,
            replicas: 1,
            resources: postgresqlConfig.resources,
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
                enabled: postgresqlConfig.persistentStorage,
                size: postgresqlConfig.storageSize,
                accessMode: "ReadWriteOnce",
                // Use hostPath for local development
                useHostPath: postgresqlConfig.useHostPath,
                hostPath: postgresqlConfig.hostPath,
            },
            imageTag: postgresqlConfig.version,
            databaseName: "postgres",
            provider,
        });
    }

    return resources;
}
