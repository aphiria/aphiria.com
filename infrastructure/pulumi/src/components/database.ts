import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { Environment, PostgreSQLResult } from "./types";
import { POSTGRES_PORT } from "./constants";
import { buildLabels } from "./labels";

/**
 * Arguments for PostgreSQL component
 */
export interface PostgreSQLArgs {
    /** Environment this database targets */
    env: Environment;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Enable persistent storage (false for dev-local, true for preview/production) */
    persistentStorage: boolean;
    /** Storage size (e.g., "10Gi") - only used if persistentStorage=true */
    storageSize?: string;
    /** Database user */
    dbUser: string;
    /** Database password (sensitive) */
    dbPassword: pulumi.Input<string>;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/** Creates PostgreSQL deployment with environment-specific storage (hostPath for dev-local, cloud for preview/production) */
export function createPostgreSQL(args: PostgreSQLArgs): PostgreSQLResult {
    const labels = buildLabels("db", "database", args.labels);

    let pvc: k8s.core.v1.PersistentVolumeClaim | undefined;
    let pv: k8s.core.v1.PersistentVolume | undefined;

    // Create secret for database credentials
    const secret = new k8s.core.v1.Secret(
        "db-env-var-secrets",
        {
            metadata: {
                name: "db-env-var-secrets",
                namespace: args.namespace,
                labels,
            },
            type: "Opaque",
            stringData: {
                DB_USER: args.dbUser,
                DB_PASSWORD: args.dbPassword,
            },
        },
        { provider: args.provider }
    );

    // Create persistent storage if requested
    if (args.persistentStorage) {
        if (args.env === "local") {
            // Minikube: Use hostPath storage
            pv = new k8s.core.v1.PersistentVolume(
                "db-pv",
                {
                    metadata: {
                        name: "db-pv",
                        labels,
                    },
                    spec: {
                        storageClassName: "manual",
                        capacity: {
                            storage: args.storageSize || "5Gi",
                        },
                        accessModes: ["ReadWriteMany"],
                        hostPath: {
                            path: "/mnt/data",
                        },
                    },
                },
                { provider: args.provider }
            );

            pvc = new k8s.core.v1.PersistentVolumeClaim(
                "db-pv-claim",
                {
                    metadata: {
                        name: "db-pv-claim",
                        namespace: args.namespace,
                        labels,
                    },
                    spec: {
                        storageClassName: "manual",
                        accessModes: ["ReadWriteMany"],
                        resources: {
                            requests: {
                                storage: args.storageSize || "5Gi",
                            },
                        },
                    },
                },
                { dependsOn: [pv], provider: args.provider }
            );
        } else {
            // Cloud: Use dynamic provisioning (DigitalOcean Block Storage)
            pvc = new k8s.core.v1.PersistentVolumeClaim(
                "db-pv-claim",
                {
                    metadata: {
                        name: "db-pv-claim",
                        namespace: args.namespace,
                        labels,
                    },
                    spec: {
                        accessModes: ["ReadWriteOnce"],
                        resources: {
                            requests: {
                                storage: args.storageSize || "10Gi",
                            },
                        },
                    },
                },
                { provider: args.provider }
            );
        }
    }

    // Create PostgreSQL deployment
    const deployment = new k8s.apps.v1.Deployment(
        "db",
        {
            metadata: {
                name: "db",
                namespace: args.namespace,
                labels,
            },
            spec: {
                replicas: 1, // Single replica - multi-replica requires StatefulSet + replication
                selector: {
                    matchLabels: {
                        app: "db",
                    },
                },
                template: {
                    metadata: {
                        labels: {
                            app: "db",
                        },
                    },
                    spec: {
                        terminationGracePeriodSeconds: 90, // Allow 60s for PostgreSQL shutdown + 30s buffer
                        containers: [
                            {
                                name: "db",
                                image: "postgres:16",
                                imagePullPolicy: "IfNotPresent",
                                ports: [
                                    {
                                        containerPort: POSTGRES_PORT,
                                    },
                                ],
                                // Graceful shutdown to prevent data corruption.
                                // preStop hook ensures PostgreSQL shuts down cleanly before pod termination.
                                // Without this, Kubernetes sends SIGTERM then SIGKILL after grace period,
                                // potentially causing data corruption or incomplete writes.
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
                                volumeMounts: args.persistentStorage
                                    ? [
                                          {
                                              mountPath: "/var/lib/postgresql/data",
                                              name: "db-data",
                                          },
                                      ]
                                    : [],
                                env: [
                                    {
                                        name: "POSTGRES_USER",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: "db-env-var-secrets",
                                                key: "DB_USER",
                                            },
                                        },
                                    },
                                    {
                                        name: "POSTGRES_PASSWORD",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: "db-env-var-secrets",
                                                key: "DB_PASSWORD",
                                            },
                                        },
                                    },
                                    {
                                        name: "PGDATA",
                                        value: "/var/lib/postgresql/data/pgdata",
                                    },
                                ],
                                readinessProbe: {
                                    exec: {
                                        command: [
                                            "pg_isready",
                                            "-U",
                                            "$(POSTGRES_USER)",
                                            "-h",
                                            "127.0.0.1",
                                            "-p",
                                            String(POSTGRES_PORT),
                                        ],
                                    },
                                    initialDelaySeconds: 5,
                                    periodSeconds: 10,
                                    timeoutSeconds: 5,
                                    successThreshold: 1,
                                    failureThreshold: 5,
                                },
                            },
                        ],
                        volumes: args.persistentStorage
                            ? [
                                  {
                                      name: "db-data",
                                      persistentVolumeClaim: {
                                          claimName: "db-pv-claim",
                                      },
                                  },
                              ]
                            : [],
                    },
                },
            },
        },
        {
            provider: args.provider,
            dependsOn: [secret, ...(pvc ? [pvc] : [])],
        }
    );

    // Create Service
    const service = new k8s.core.v1.Service(
        "db",
        {
            metadata: {
                name: "db",
                namespace: args.namespace,
                labels,
            },
            spec: {
                selector: {
                    app: "db",
                },
                ports: [
                    {
                        port: POSTGRES_PORT,
                        targetPort: POSTGRES_PORT,
                    },
                ],
            },
        },
        { provider: args.provider }
    );

    return {
        deployment: deployment.metadata,
        service: service.metadata,
        pvc: pvc ? pvc.metadata : undefined,
    };
}
