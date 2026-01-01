import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { Environment } from "./types";
import { POSTGRES_PORT } from "./constants";
import { buildLabels } from "./labels";

/**
 * Arguments for database migration job component
 */
export interface DBMigrationJobArgs {
    /** Environment this migration targets */
    env?: Environment;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Docker image containing migrations */
    image: string;
    /** Database host */
    dbHost: pulumi.Input<string>;
    /** Database name */
    dbName: string;
    /** Database user */
    dbUser: pulumi.Input<string>;
    /** Database password (sensitive) */
    dbPassword: pulumi.Input<string>;
    /** Run LexemeSeeder after migrations */
    runSeeder: boolean;
    /** Optional image pull secrets for private registries */
    imagePullSecrets?: pulumi.Input<string>[];
    /** Optional resource limits for containers */
    resources?: {
        migration?: {
            requests?: { cpu?: string; memory?: string };
            limits?: { cpu?: string; memory?: string };
        };
        initContainer?: {
            requests?: { cpu?: string; memory?: string };
            limits?: { cpu?: string; memory?: string };
        };
    };
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/** Creates Phinx migration job (waits for DB, runs migrations, optionally runs LexemeSeeder) */
export function createDBMigrationJob(args: DBMigrationJobArgs): k8s.batch.v1.Job {
    const labels = buildLabels("db-migration", "database", args.labels);

    // Build command based on whether seeder should run
    const command = args.runSeeder
        ? "/app/apps/api/vendor/bin/phinx migrate && /app/apps/api/vendor/bin/phinx seed:run"
        : "/app/apps/api/vendor/bin/phinx migrate";

    return new k8s.batch.v1.Job(
        "db-migration",
        {
            metadata: {
                name: "db-migration",
                namespace: args.namespace,
                labels,
                annotations: {
                    // Force override Server-Side Apply conflicts when recreating Job.
                    // Required because ttlSecondsAfterFinished=0 auto-deletes the Job after completion,
                    // but Kubernetes Server-Side Apply (SSA) metadata persists, causing conflicts
                    // on the next `pulumi up`. This annotation tells Pulumi to force the update.
                    "pulumi.com/patchForce": "true",
                    // Skip await logic to prevent "Job not found" errors during preview/refresh.
                    // The Job auto-deletes after completion (ttlSecondsAfterFinished=0), so Pulumi's
                    // default await logic fails when trying to check Job status on subsequent runs.
                    "pulumi.com/skipAwait": "true",
                },
            },
            spec: {
                // Auto-delete Job after completion to avoid clutter.
                // Note: Combined with ignoreChanges below, this creates a fire-and-forget pattern
                // where the Job runs once, auto-deletes, and won't be recreated on subsequent runs.
                ttlSecondsAfterFinished: 0,
                // Fail fast: limit retries and total runtime to avoid wasting CI time on broken migrations
                backoffLimit: 2,
                activeDeadlineSeconds: 300, // 5 minutes max
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
                                    `until nc -z $DB_HOST ${POSTGRES_PORT}; do echo 'Waiting for db...'; sleep 2; done`,
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
                                // imagePullPolicy rules (Kubernetes-specific requirements):
                                // - Local: Use "Never" (images loaded via minikube/docker load)
                                // - SHA256 digest: Use "IfNotPresent" (immutable, safe to cache)
                                // - Tag: Use "Always" (mutable, must pull to check for updates)
                                imagePullPolicy:
                                    args.env === "local"
                                        ? "Never"
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
                                        value: String(POSTGRES_PORT),
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
        {
            provider: args.provider,
            // Ignore all changes to prevent drift detection errors.
            // This Job auto-deletes after completion (ttlSecondsAfterFinished=0), so Pulumi
            // would normally report it as "missing" and try to recreate it on every run.
            // ignoreChanges tells Pulumi: "Job is ephemeral, don't track changes after creation."
            ignoreChanges: ["*"],
        }
    );
}
