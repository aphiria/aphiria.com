import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { DBMigrationJobArgs } from "./types";

/** Creates Phinx migration job (waits for DB, runs migrations, optionally runs LexemeSeeder) */
export function createDBMigrationJob(args: DBMigrationJobArgs): k8s.batch.v1.Job {
    const labels = {
        app: "db-migration",
        "app.kubernetes.io/name": "aphiria-db-migration",
        "app.kubernetes.io/component": "database",
        ...(args.labels || {}),
    };

    // Build command based on whether seeder should run
    const command = args.runSeeder
        ? "/app/api/vendor/bin/phinx migrate && /app/api/vendor/bin/phinx seed:run"
        : "/app/api/vendor/bin/phinx migrate";

    const job = new k8s.batch.v1.Job("db-migration", {
        metadata: {
            name: "db-migration",
            namespace: args.namespace,
            labels,
        },
        spec: {
            // Clean up job after completion (don't leave completed pods around)
            ttlSecondsAfterFinished: 0,
            template: {
                metadata: {
                    labels,
                },
                spec: {
                    // Wait for database to be ready before running migrations
                    initContainers: [
                        {
                            name: "wait-for-db",
                            image: "busybox",
                            command: [
                                "sh",
                                "-c",
                                `until nc -z ${args.dbHost} 5432; do echo "Waiting for db..."; sleep 2; done`,
                            ],
                        },
                    ],
                    containers: [
                        {
                            name: "db-migration",
                            image: args.image,
                            imagePullPolicy: args.env === "dev-local"
                                ? "Never"  // Local images only
                                : args.image.includes("@sha256:")
                                ? "IfNotPresent"
                                : "Always",
                            command: ["sh", "-c", command],
                            env: [
                                {
                                    name: "DB_HOST",
                                    value: args.dbHost,
                                },
                                {
                                    name: "DB_NAME",
                                    value: args.dbName,
                                },
                                {
                                    name: "DB_PORT",
                                    value: "5432",
                                },
                                {
                                    name: "DB_USER",
                                    value: args.dbUser,
                                },
                                {
                                    name: "DB_PASSWORD",
                                    value: args.dbPassword,
                                },
                            ],
                        },
                    ],
                    restartPolicy: "Never",
                },
            },
        },
    });

    return job;
}

/** Helper to wait for migration job completion (use as dependency for API deployment) */
export function waitForMigrationJob(job: k8s.batch.v1.Job): pulumi.Output<string> {
    return job.status.apply((status) => {
        if (status?.succeeded && status.succeeded > 0) {
            return "Migration completed successfully";
        }
        return "Migration pending or failed";
    });
}
