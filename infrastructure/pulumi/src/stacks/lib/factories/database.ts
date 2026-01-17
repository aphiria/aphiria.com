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
    const resources: DatabaseResources = {};

    if (args.postgresqlConfig.createDatabase && args.postgresqlConfig.databaseName) {
        // Preview-PR: Create database on shared instance
        resources.dbInitJob = createDatabaseCreationJob({
            namespace: args.namespace,
            databaseName: args.postgresqlConfig.databaseName,
            dbHost: args.postgresqlConfig.host,
            dbAdminUser: args.postgresqlConfig.user,
            dbAdminPassword: args.postgresqlConfig.password,
            provider: args.provider,
        });
    } else {
        // Local/Preview-Base/Production: Create PostgreSQL instance
        resources.postgres = createPostgreSQL({
            username: args.postgresqlConfig.user,
            password: args.postgresqlConfig.password,
            replicas: 1,
            resources: args.postgresqlConfig.resources,
            healthCheck: {
                interval: "10s",
                timeout: "5s",
                retries: 5,
                command: ["pg_isready", "-U", "postgres"],
            },
            connectionPooling: {
                maxConnections: 100,
            },
            namespace: args.namespace,
            storage: {
                enabled: args.postgresqlConfig.persistentStorage,
                size: args.postgresqlConfig.storageSize,
                accessMode: "ReadWriteOnce",
                // Use hostPath for local development
                useHostPath: args.postgresqlConfig.useHostPath,
                hostPath: args.postgresqlConfig.hostPath,
            },
            imageTag: args.postgresqlConfig.version,
            databaseName: "postgres",
            provider: args.provider,
        });
    }

    return resources;
}
