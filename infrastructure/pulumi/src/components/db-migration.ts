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

    return new k8s.batch.v1.Job(
        "db-migration",
        {
            metadata: {
                name: "db-migration",
                namespace: args.namespace,
                labels,
                annotations: {
                    // Force override Server-Side Apply conflicts when recreating Job
                    // Needed because ttlSecondsAfterFinished=0 deletes the Job but SSA metadata persists
                    "pulumi.com/patchForce": "true",
                },
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
                                    "until nc -z $DB_HOST 5432; do echo 'Waiting for db...'; sleep 2; done",
                                ],
                                env: [
                                    {
                                        name: "DB_HOST",
                                        value: args.dbHost,
                                    },
                                ],
                                ...(args.resources?.initContainer && {
                                    resources: args.resources.initContainer,
                                }),
                            },
                        ],
                        containers: [
                            {
                                name: "db-migration",
                                image: args.image,
                                imagePullPolicy:
                                    args.env === "local"
                                        ? "Never" // Local images only
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
                                ...(args.resources?.migration && {
                                    resources: args.resources.migration,
                                }),
                            },
                        ],
                        restartPolicy: "Never",
                        ...(args.imagePullSecrets && {
                            imagePullSecrets: args.imagePullSecrets.map((name) => ({ name })),
                        }),
                    },
                },
            },
        },
        { provider: args.provider }
    );
}
