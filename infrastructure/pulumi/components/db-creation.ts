import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { DatabaseCreationJobArgs } from "./types";

/**
 * Creates a Kubernetes Job to create a PostgreSQL database.
 *
 * This component is used for environments where databases need to be created
 * on a shared PostgreSQL instance (e.g., preview environments with per-PR databases).
 *
 * The Job is idempotent - it will not fail if the database already exists.
 */
export function createDatabaseCreationJob(args: DatabaseCreationJobArgs): k8s.batch.v1.Job {
    // Hardcoded defaults (same across all environments)
    const DEFAULT_IMAGE = "postgres:16-alpine";
    const DEFAULT_TTL_SECONDS = 300;
    const DEFAULT_RESOURCES = {
        requests: {
            cpu: "100m",
            memory: "128Mi",
        },
        limits: {
            cpu: "200m",
            memory: "256Mi",
        },
    };
    const DEFAULT_PGDATABASE = "postgres"; // Connect to default database to create new one

    const labels = {
        app: "db-init",
        "app.kubernetes.io/name": "database-creation",
        "app.kubernetes.io/component": "database",
        ...(args.labels || {}),
    };

    const jobName = `db-init-${args.databaseName.replace(/_/g, "-")}`;

    return new k8s.batch.v1.Job(jobName, {
        metadata: {
            name: jobName,
            namespace: args.namespace,
            labels,
        },
        spec: {
            ttlSecondsAfterFinished: DEFAULT_TTL_SECONDS,
            template: {
                metadata: {
                    labels,
                },
                spec: {
                    restartPolicy: "Never",
                    containers: [
                        {
                            name: "db-init",
                            image: DEFAULT_IMAGE,
                            env: [
                                {
                                    name: "PGHOST",
                                    value: args.dbHost,
                                },
                                {
                                    name: "PGUSER",
                                    value: args.dbAdminUser,
                                },
                                {
                                    name: "PGPASSWORD",
                                    value: args.dbAdminPassword,
                                },
                                {
                                    name: "PGDATABASE",
                                    value: DEFAULT_PGDATABASE,
                                },
                            ],
                            command: [
                                "sh",
                                "-c",
                                `psql -c "CREATE DATABASE ${args.databaseName};" || echo "Database already exists (this is normal on re-runs)"`,
                            ],
                            resources: DEFAULT_RESOURCES,
                        },
                    ],
                },
            },
        },
    }, { provider: args.provider });
}
