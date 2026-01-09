import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { PodDisruptionBudgetConfig, APIDeploymentResult } from "./types";
import { checksum } from "./utils";
import { POSTGRES_PORT } from "./constants";
import { buildLabels } from "./labels";

/**
 * Arguments for API deployment component
 */
export interface APIDeploymentArgs {
    /** Kubernetes namespace to deploy into */
    namespace: pulumi.Input<string>;
    /** Resource labels for Kubernetes resources */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
    /** Number of replicas (1 for dev-local/preview, 2 for production) */
    replicas: number;
    /** Docker image reference (can be tag or digest) */
    image: string;
    /** Image pull policy ("Always", "IfNotPresent", or "Never") */
    imagePullPolicy: pulumi.Input<string>;
    /** Application environment name (e.g., "local", "preview", "production") */
    appEnv: string;
    /** Database host */
    dbHost: pulumi.Input<string>;
    /** Database name */
    dbName: string;
    /** Database user */
    dbUser: pulumi.Input<string>;
    /** Database password (sensitive) */
    dbPassword: pulumi.Input<string>;
    /** Base URL for the API */
    apiUrl: string;
    /** Base URL for the web app (for CORS) */
    webUrl: string;
    /** Log level (e.g., "warning", "debug", "info") */
    logLevel: string;
    /** PR number (optional, preview environments only) */
    prNumber?: string;
    /** Prometheus Bearer token for /metrics endpoint authentication (optional if monitoring disabled) */
    prometheusAuthToken?: pulumi.Input<string>;
    /** Optional image pull secrets for private registries */
    imagePullSecrets?: pulumi.Input<string>[];
    /** Resource requests and limits for containers (required) */
    resources: {
        nginx: {
            requests: { cpu: string; memory: string };
            limits: { cpu: string; memory: string };
        };
        php: {
            requests: { cpu: string; memory: string };
            limits: { cpu: string; memory: string };
        };
        initContainer: {
            requests: { cpu: string; memory: string };
            limits: { cpu: string; memory: string };
        };
    };
    /** Optional PodDisruptionBudget for high availability (production only) */
    podDisruptionBudget?: PodDisruptionBudgetConfig;
    /** @deprecated Use envConfig instead. ConfigMap references to load as environment variables */
    configMapRefs?: pulumi.Input<string>[];
    /** @deprecated Use envConfig instead. Secret references to load as environment variables */
    secretRefs?: pulumi.Input<string>[];
    /** @deprecated Component calculates checksum internally. ConfigMap checksum for pod annotations */
    configChecksum?: string;
}

/** Creates nginx + PHP-FPM deployment using initContainer to copy code to shared volume */
export function createAPIDeployment(args: APIDeploymentArgs): APIDeploymentResult {
    const labels = buildLabels("api", "backend", args.labels);

    // Hardcoded constants (same across all environments)
    const APP_BUILDER_API = "\\Aphiria\\Framework\\Api\\SynchronousApiApplicationBuilder";
    const APP_BUILDER_CONSOLE = "\\Aphiria\\Framework\\Console\\ConsoleApplicationBuilder";

    // Build ConfigMap data from parameters
    const configData: Record<string, pulumi.Input<string>> = {
        DB_HOST: args.dbHost,
        DB_PORT: String(POSTGRES_PORT),
        DB_NAME: args.dbName,
        DB_USER: args.dbUser,
        APP_ENV: args.appEnv,
        WEB_URL: args.webUrl,
        API_URL: args.apiUrl,
        APP_WEB_URL: args.webUrl,
        APP_API_URL: args.apiUrl,
        APP_BUILDER_API,
        APP_BUILDER_CONSOLE,
        LOG_LEVEL: args.logLevel,
        ...(args.prNumber && { PR_NUMBER: args.prNumber }),
    };

    // Build Secret data
    const secretData: Record<string, pulumi.Input<string>> = {
        DB_PASSWORD: args.dbPassword,
        PROMETHEUS_AUTH_TOKEN: args.prometheusAuthToken!, // Always set via config.prometheusAuthToken or config.monitoring.prometheus.authToken
    };

    // Calculate checksums for pod annotations (forces restart when config or secrets change)
    const configChecksum = checksum(configData);
    const secretChecksum = checksum(secretData);

    // Create nginx configuration ConfigMap
    const nginxConfig = new k8s.core.v1.ConfigMap(
        "nginx-config",
        {
            metadata: {
                name: "nginx-config",
                namespace: args.namespace,
                labels,
            },
            data: {
                "default.conf": `server {
    index index.php index.html;
    error_log  /var/log/nginx/error.log;
    access_log /var/log/nginx/access.log;
    root /usr/share/nginx/html/public;
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    location / {
        try_files $uri $uri/ /index.php$is_args$args;
    }

    location ~ \\.php$ {
        fastcgi_split_path_info ^(.+\\.php)(/.+)$;
        # Pass this through to the PHP image running in this pod on port 9000
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        fastcgi_hide_header X-Powered-By;
    }
}`,
            },
        },
        { provider: args.provider }
    );

    // Create Secret for database credentials
    const secret = new k8s.core.v1.Secret(
        "api-env-var-secrets",
        {
            metadata: {
                name: "api-env-var-secrets",
                namespace: args.namespace,
                labels,
            },
            type: "Opaque",
            stringData: secretData,
        },
        { provider: args.provider }
    );

    // Create ConfigMap for environment variables (built from parameters)
    const configMap = new k8s.core.v1.ConfigMap(
        "env-vars",
        {
            metadata: {
                name: "env-vars",
                namespace: args.namespace,
                labels,
            },
            data: configData,
        },
        { provider: args.provider }
    );

    // Create API deployment
    const deployment = new k8s.apps.v1.Deployment(
        "api",
        {
            metadata: {
                name: "api",
                namespace: args.namespace,
                labels,
            },
            spec: {
                replicas: args.replicas,
                selector: {
                    matchLabels: {
                        app: "api",
                    },
                },
                strategy: {
                    type: "RollingUpdate",
                    rollingUpdate: {
                        maxUnavailable: 1,
                        maxSurge: 0,
                    },
                },
                template: {
                    metadata: {
                        labels: {
                            app: "api",
                        },
                        annotations: {
                            "checksum/config": configChecksum,
                            "checksum/secret": secretChecksum,
                        },
                    },
                    spec: {
                        ...(args.imagePullSecrets && {
                            imagePullSecrets: args.imagePullSecrets.map((name) => ({ name })),
                        }),
                        // initContainer: Copy PHP code from API image to shared volume
                        initContainers: [
                            {
                                name: "copy-api-code",
                                image: args.image,
                                // imagePullPolicy rules (Kubernetes-specific requirements):
                                // - Local: Use "Never" (images loaded via minikube/docker load)
                                // - SHA256 digest: Use "IfNotPresent" (immutable, safe to cache)
                                // - Tag: Use "Always" (mutable, must pull to check for updates)
                                imagePullPolicy: args.imagePullPolicy,
                                // Preserve permissions so nginx can access tmp directory
                                command: [
                                    "sh",
                                    "-c",
                                    "cp -Rp /app/apps/api/. /usr/share/nginx/html",
                                ],
                                volumeMounts: [
                                    {
                                        name: "api-code",
                                        mountPath: "/usr/share/nginx/html",
                                    },
                                ],
                                resources: args.resources.initContainer,
                            },
                        ],
                        containers: [
                            // nginx: HTTP server and PHP proxy
                            {
                                name: "nginx",
                                image: "nginx:alpine",
                                livenessProbe: {
                                    httpGet: {
                                        path: "/health",
                                        port: 80,
                                    },
                                    initialDelaySeconds: 10,
                                    periodSeconds: 30,
                                },
                                readinessProbe: {
                                    httpGet: {
                                        path: "/health",
                                        port: 80,
                                    },
                                    initialDelaySeconds: 5,
                                    periodSeconds: 5,
                                },
                                ports: [
                                    {
                                        containerPort: 80,
                                    },
                                ],
                                volumeMounts: [
                                    {
                                        name: "api-code",
                                        mountPath: "/usr/share/nginx/html",
                                    },
                                    {
                                        name: "nginx-config",
                                        mountPath: "/etc/nginx/conf.d/default.conf",
                                        subPath: "default.conf",
                                    },
                                ],
                                resources: args.resources.nginx,
                            },
                            // php: PHP-FPM process manager
                            {
                                name: "php",
                                image: args.image,
                                // imagePullPolicy rules (same as initContainer - see above)
                                imagePullPolicy: args.imagePullPolicy,
                                ports: [
                                    {
                                        containerPort: 9000,
                                    },
                                ],
                                envFrom: [
                                    {
                                        secretRef: {
                                            name: "api-env-var-secrets",
                                        },
                                    },
                                    {
                                        configMapRef: {
                                            name: "env-vars",
                                        },
                                    },
                                ],
                                volumeMounts: [
                                    {
                                        name: "api-code",
                                        mountPath: "/usr/share/nginx/html",
                                    },
                                ],
                                resources: args.resources.php,
                            },
                        ],
                        volumes: [
                            {
                                name: "api-code",
                                emptyDir: {},
                            },
                            {
                                name: "nginx-config",
                                configMap: {
                                    name: "nginx-config",
                                    items: [
                                        {
                                            key: "default.conf",
                                            path: "default.conf",
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            },
        },
        { provider: args.provider, dependsOn: [configMap, secret, nginxConfig] }
    );

    // Create Service
    const service = new k8s.core.v1.Service(
        "api",
        {
            metadata: {
                name: "api",
                namespace: args.namespace,
                labels,
            },
            spec: {
                selector: {
                    app: "api",
                },
                ports: [
                    {
                        port: 80,
                        targetPort: 80,
                    },
                ],
                type: "ClusterIP",
            },
        },
        { provider: args.provider }
    );

    // Create PodDisruptionBudget if configured (production HA)
    let pdb: k8s.policy.v1.PodDisruptionBudget | undefined;
    if (args.podDisruptionBudget) {
        pdb = new k8s.policy.v1.PodDisruptionBudget(
            "api-pdb",
            {
                metadata: {
                    name: "api",
                    namespace: args.namespace,
                    labels,
                },
                spec: {
                    minAvailable: args.podDisruptionBudget.minAvailable,
                    maxUnavailable: args.podDisruptionBudget.maxUnavailable,
                    selector: {
                        matchLabels: { app: "api" },
                    },
                },
            },
            { provider: args.provider }
        );
    }

    return {
        deployment: deployment.metadata,
        service: service.metadata,
        secret: secret.metadata,
        podDisruptionBudget: pdb?.metadata,
    };
}
