import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { PostgreSQLArgs, PostgreSQLResult } from "./types";

/** Creates PostgreSQL deployment with environment-specific storage (hostPath for dev-local, cloud for preview/production) */
export function createPostgreSQL(args: PostgreSQLArgs): PostgreSQLResult {
    const labels = {
        app: "db",
        "app.kubernetes.io/name": "postgresql",
        "app.kubernetes.io/component": "database",
        ...(args.labels || {}),
    };

    let pvc: k8s.core.v1.PersistentVolumeClaim | undefined;
    let pv: k8s.core.v1.PersistentVolume | undefined;

    // Create persistent storage if requested
    if (args.persistentStorage) {
        if (args.env === "local") {
            // Minikube: Use hostPath storage
            pv = new k8s.core.v1.PersistentVolume("db-pv", {
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
            });

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
                { dependsOn: [pv] }
            );
        } else {
            // Cloud: Use dynamic provisioning (DigitalOcean Block Storage)
            pvc = new k8s.core.v1.PersistentVolumeClaim("db-pv-claim", {
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
            });
        }
    }

    // Create PostgreSQL deployment
    const deployment = new k8s.apps.v1.Deployment("db", {
        metadata: {
            name: "db",
            namespace: args.namespace,
            labels,
        },
        spec: {
            replicas: args.replicas,
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
                    containers: [
                        {
                            name: "db",
                            image: "postgres:16",
                            imagePullPolicy: "IfNotPresent",
                            ports: [
                                {
                                    containerPort: 5432,
                                },
                            ],
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
                                            name: "env-var-secrets",
                                            key: "DB_USER",
                                        },
                                    },
                                },
                                {
                                    name: "POSTGRES_PASSWORD",
                                    valueFrom: {
                                        secretKeyRef: {
                                            name: "env-var-secrets",
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
                                        "5432",
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
    });

    // Create Service
    const service = new k8s.core.v1.Service("db", {
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
                    port: 5432,
                    targetPort: 5432,
                },
            ],
        },
    });

    return {
        deployment: deployment.metadata.apply((m) => m),
        service: service.metadata.apply((m) => m),
        pvc: pvc ? pvc.metadata.apply((m) => m) : undefined,
    };
}

/** Creates a logical database (placeholder - actual implementation in ephemeral-stack.ts using @pulumi/postgresql) */
export interface CreateDatabaseArgs {
    /** Database name (must be valid PostgreSQL identifier) */
    name: string;
    /** Database owner user (must already exist) */
    owner: string;
}

// Note: Actual database creation will use the @pulumi/postgresql provider
// in the ephemeral stack, not in shared components, since it requires
// a live PostgreSQL connection. This function is a placeholder for documentation.
export function createDatabase(args: CreateDatabaseArgs): pulumi.Output<string> {
    // This will be implemented in ephemeral-stack.ts using @pulumi/postgresql.Database
    // See: https://www.pulumi.com/registry/packages/postgresql/api-docs/database/
    return pulumi.output(args.name);
}
