/**
 * PostgreSQL Database Component
 */

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { POSTGRES_PORT } from "./constants";
import { buildLabels } from "./labels";

/**
 * Database health check configuration
 */
export interface DatabaseHealthCheck {
    interval: string;
    timeout: string;
    retries: number;
    command: string[];
}

/**
 * Storage configuration for PostgreSQL
 */
export interface PostgreSQLStorageConfig {
    /** Enable persistent storage */
    enabled: boolean;
    /** Storage size (e.g., "10Gi") */
    size: string;
    /** Storage class name (optional, uses default if not specified) */
    storageClassName?: string;
    /** Access mode for PVC (affects deployment strategy: ReadWriteOnce uses Recreate, ReadWriteMany uses RollingUpdate) */
    accessMode: "ReadWriteOnce" | "ReadWriteMany";
    /** Use hostPath storage (for local development only) */
    useHostPath?: boolean;
    /** Host path location (only used if useHostPath is true) */
    hostPath?: string;
}

/**
 * Arguments for PostgreSQL component
 * All configuration must be passed explicitly
 */
export interface PostgreSQLArgs {
    /** Database username */
    username: string;
    /** Database password */
    password: pulumi.Input<string>;
    /** Number of replicas */
    replicas: number;
    /** Container resource requirements */
    resources: k8s.types.input.core.v1.ResourceRequirements;
    /** Health check configuration */
    healthCheck: DatabaseHealthCheck;
    /** Connection pooling configuration (optional) */
    connectionPooling?: {
        maxConnections?: number;
    };
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Storage configuration */
    storage: PostgreSQLStorageConfig;
    /** PostgreSQL image tag */
    imageTag: string;
    /** Database name to create */
    databaseName: string;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

export interface PostgreSQLResult {
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    secret: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    pvc?: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    pv?: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Creates PostgreSQL deployment as a pure function
 *
 * All configuration decisions are made by the caller.
 *
 * @param args - Configuration for the PostgreSQL deployment
 * @returns Deployment, Service, Secret, and optional PVC/PV metadata
 */
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
                DB_USER: args.username,
                DB_PASSWORD: args.password,
            },
        },
        {
            provider: args.provider,
            protect: false,
            retainOnDelete: false,
            replaceOnChanges: ["*"],
            deleteBeforeReplace: true,
        }
    );

    // Create persistent storage if enabled
    if (args.storage.enabled) {
        if (args.storage.useHostPath && args.storage.hostPath) {
            // Create hostPath PV for local development
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
                            storage: args.storage.size,
                        },
                        accessModes: [args.storage.accessMode],
                        hostPath: {
                            path: args.storage.hostPath,
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
                        accessModes: [args.storage.accessMode],
                        resources: {
                            requests: {
                                storage: args.storage.size,
                            },
                        },
                    },
                },
                { dependsOn: [pv], provider: args.provider }
            );
        } else {
            // Use dynamic provisioning
            pvc = new k8s.core.v1.PersistentVolumeClaim(
                "db-pv-claim",
                {
                    metadata: {
                        name: "db-pv-claim",
                        namespace: args.namespace,
                        labels,
                    },
                    spec: {
                        storageClassName: args.storage.storageClassName,
                        accessModes: [args.storage.accessMode],
                        resources: {
                            requests: {
                                storage: args.storage.size,
                            },
                        },
                    },
                },
                { provider: args.provider }
            );
        }
    }

    // Health check is always enabled
    const healthCheckCommand = args.healthCheck.command;

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
                replicas: args.replicas,
                // Recreate strategy for RWO PVCs
                strategy: {
                    type:
                        args.storage.accessMode === "ReadWriteOnce" ? "Recreate" : "RollingUpdate",
                },
                selector: {
                    matchLabels: {
                        app: "db",
                    },
                },
                template: {
                    metadata: {
                        labels: {
                            app: "db",
                            "app.kubernetes.io/name": "postgresql",
                            "app.kubernetes.io/component": "database",
                        },
                    },
                    spec: {
                        terminationGracePeriodSeconds: 90,
                        containers: [
                            {
                                name: "db",
                                image: `postgres:${args.imageTag}`,
                                imagePullPolicy: "IfNotPresent",
                                ports: [
                                    {
                                        name: "postgresql",
                                        containerPort: POSTGRES_PORT,
                                        protocol: "TCP",
                                    },
                                ],
                                resources: args.resources,
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
                                volumeMounts: args.storage.enabled
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
                                                name: secret.metadata.name,
                                                key: "DB_USER",
                                            },
                                        },
                                    },
                                    {
                                        name: "POSTGRES_PASSWORD",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: secret.metadata.name,
                                                key: "DB_PASSWORD",
                                            },
                                        },
                                    },
                                    {
                                        name: "POSTGRES_DB",
                                        value: args.databaseName,
                                    },
                                    {
                                        name: "PGDATA",
                                        value: "/var/lib/postgresql/data/pgdata",
                                    },
                                    ...(args.connectionPooling
                                        ? [
                                              {
                                                  name: "POSTGRES_MAX_CONNECTIONS",
                                                  value: String(
                                                      args.connectionPooling.maxConnections || 100
                                                  ),
                                              },
                                          ]
                                        : []),
                                ],
                                readinessProbe: {
                                    exec: {
                                        command: healthCheckCommand,
                                    },
                                    initialDelaySeconds: 5,
                                    periodSeconds: parseInt(args.healthCheck.interval),
                                    timeoutSeconds: parseInt(args.healthCheck.timeout),
                                    successThreshold: 1,
                                    failureThreshold: args.healthCheck.retries,
                                },
                                livenessProbe: {
                                    exec: {
                                        command: healthCheckCommand,
                                    },
                                    initialDelaySeconds: 30,
                                    periodSeconds: parseInt(args.healthCheck.interval),
                                    timeoutSeconds: parseInt(args.healthCheck.timeout),
                                    successThreshold: 1,
                                    failureThreshold: args.healthCheck.retries,
                                },
                            },
                        ],
                        volumes: args.storage.enabled
                            ? [
                                  {
                                      name: "db-data",
                                      persistentVolumeClaim: {
                                          claimName: pvc!.metadata.name,
                                      },
                                  },
                              ]
                            : [],
                    },
                },
            },
        },
        { provider: args.provider, dependsOn: pvc ? [pvc] : [] }
    );

    // Create service for database
    const service = new k8s.core.v1.Service(
        "db",
        {
            metadata: {
                name: "db",
                namespace: args.namespace,
                labels,
            },
            spec: {
                type: "ClusterIP",
                selector: {
                    app: "db",
                },
                ports: [
                    {
                        name: "postgresql",
                        port: POSTGRES_PORT,
                        targetPort: "postgresql",
                        protocol: "TCP",
                    },
                ],
            },
        },
        { provider: args.provider }
    );

    return {
        deployment: deployment.metadata,
        service: service.metadata,
        secret: secret.metadata,
        pvc: pvc?.metadata,
        pv: pv?.metadata,
    };
}
