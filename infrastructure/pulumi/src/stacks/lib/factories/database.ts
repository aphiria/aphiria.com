import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { Environment } from "../types";
import { createDatabaseCreationJob } from "../../../components";
import { createPostgreSQL, PostgreSQLResult } from "../../../components/database";

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
}

/**
 * Creates database resources (PostgreSQL instance OR database creation job)
 *
 * This factory handles two patterns:
 * - Shared PostgreSQL instance (local, preview-base, production): Creates full PostgreSQL deployment
 * - Per-PR database (preview-pr): Creates database on shared instance via Job
 *
 * @param args Database resources configuration
 * @returns Database resources
 */
export function createDatabaseResources(args: DatabaseResourcesArgs): DatabaseResources {
    const { env, provider, namespace } = args;

    const postgresqlConfig = new pulumi.Config("postgresql");
    const createDatabase = postgresqlConfig.getBoolean("createDatabase");
    const databaseName = postgresqlConfig.get("databaseName");

    const resources: DatabaseResources = {};

    if (createDatabase && databaseName) {
        // Preview-PR: Create database on shared instance
        resources.dbInitJob = createDatabaseCreationJob({
            namespace,
            databaseName: postgresqlConfig.require("databaseName"),
            dbHost: postgresqlConfig.require("dbHost"),
            dbAdminUser: postgresqlConfig.require("user"),
            dbAdminPassword: postgresqlConfig.requireSecret("password"),
            provider,
        });
    } else {
        // Local/Preview-Base/Production: Create PostgreSQL instance
        resources.postgres = createPostgreSQL({
            username: postgresqlConfig.require("user"),
            password: postgresqlConfig.requireSecret("password"),
            replicas: 1,
            resources: postgresqlConfig.requireObject("resources"),
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
                enabled: postgresqlConfig.requireBoolean("persistentStorage"),
                size: postgresqlConfig.require("storageSize"),
                accessMode: "ReadWriteOnce",
                // Use hostPath for local development
                useHostPath: env === "local",
                hostPath: env === "local" ? "/mnt/data" : undefined,
            },
            imageTag: postgresqlConfig.require("version"),
            databaseName: "postgres",
            provider,
        });
    }

    return resources;
}
