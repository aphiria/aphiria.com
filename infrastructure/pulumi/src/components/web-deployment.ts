import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { PodDisruptionBudgetConfig, WebDeploymentResult } from "./types";
import { checksum } from "./utils";
import { buildLabels } from "./labels";

/**
 * Arguments for web deployment component
 */
export interface WebDeploymentArgs {
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
    /** JavaScript configuration data for js-config ConfigMap */
    jsConfigData: Record<string, string>;
    /** Base URL for the web application */
    baseUrl: string;
    /** PR number (optional, preview environments only) */
    prNumber?: string;
    /** Additional custom environment variables */
    extraVars?: Record<string, pulumi.Input<string>>;
    /** Optional image pull secrets for private registries */
    imagePullSecrets?: pulumi.Input<string>[];
    /** Resource requests and limits (required) */
    resources: k8s.types.input.core.v1.ResourceRequirements;
    /** Optional PodDisruptionBudget for high availability (production only) */
    podDisruptionBudget?: PodDisruptionBudgetConfig;
    /** @deprecated Component calculates checksum internally. ConfigMap checksum for pod annotations */
    configChecksum?: string;
    /** @deprecated Use envConfig instead. ConfigMap references to load as environment variables */
    configMapRefs?: pulumi.Input<string>[];
    /** @deprecated Use envConfig instead. Secret references to load as environment variables */
    secretRefs?: pulumi.Input<string>[];
}

/**
 * Creates nginx deployment for static site with js-config ConfigMap
 *
 * @param args - Configuration for the web deployment
 * @returns Deployment, Service, ConfigMap, and optional PodDisruptionBudget metadata
 */
export function createWebDeployment(args: WebDeploymentArgs): WebDeploymentResult {
    const labels = buildLabels("web", "frontend", args.labels);

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
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Redirect /docs to /docs/1.x/introduction (302 temporary)
    location = /docs {
        return 302 /docs/1.x/introduction;
    }

    # Redirect .html URLs to extension-less equivalents (301 permanent)
    location ~ ^(.+)\\.html$ {
        return 301 $1;
    }

    # Try to serve file directly, fallback to directory index, then 404
    location / {
        try_files $uri $uri.html $uri/ =404;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`,
            },
        },
        { provider: args.provider }
    );

    // Create js-config ConfigMap
    const jsConfigData = Object.entries(args.jsConfigData)
        .map(([key, value]) => `      ${key}: '${value}'`)
        .join(",\n");

    const configMap = new k8s.core.v1.ConfigMap(
        "js-config",
        {
            metadata: {
                name: "js-config",
                namespace: args.namespace,
                labels,
            },
            data: {
                "config.js": `export default {\n${jsConfigData}\n    }`,
            },
        },
        { provider: args.provider }
    );

    // Build environment variables from parameters
    const envConfigData: Record<string, pulumi.Input<string>> = {
        APP_ENV: args.appEnv,
        ...(args.prNumber && { PR_NUMBER: args.prNumber }),
        ...(args.extraVars || {}),
    };

    // Create env-config ConfigMap
    const envConfigMap = new k8s.core.v1.ConfigMap(
        "env-config",
        {
            metadata: {
                name: "env-config",
                namespace: args.namespace,
                labels,
            },
            data: envConfigData,
        },
        { provider: args.provider }
    );

    // Calculate checksum for pod annotations (forces restart when config changes)
    const configChecksum = checksum({
        ...args.jsConfigData,
        ...envConfigData,
        nginxConfig: nginxConfig.data["default.conf"],
    });

    // Create web deployment
    const deployment = new k8s.apps.v1.Deployment(
        "web",
        {
            metadata: {
                name: "web",
                namespace: args.namespace,
                labels,
            },
            spec: {
                replicas: args.replicas,
                selector: {
                    matchLabels: {
                        app: "web",
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
                            app: "web",
                        },
                        annotations: {
                            "checksum/config": configChecksum,
                        },
                    },
                    spec: {
                        ...(args.imagePullSecrets && {
                            imagePullSecrets: args.imagePullSecrets.map((name) => ({ name })),
                        }),
                        containers: [
                            {
                                name: "web",
                                image: args.image,
                                imagePullPolicy: args.imagePullPolicy,
                                volumeMounts: [
                                    {
                                        name: "nginx-config",
                                        mountPath: "/etc/nginx/conf.d",
                                    },
                                    {
                                        name: "js-config",
                                        mountPath: "/usr/share/nginx/html/js/config",
                                    },
                                ],
                                envFrom: [
                                    {
                                        configMapRef: { name: envConfigMap.metadata.name },
                                    },
                                ],
                                resources: args.resources,
                                livenessProbe: {
                                    httpGet: {
                                        path: "/",
                                        port: 80,
                                    },
                                    initialDelaySeconds: 10,
                                    periodSeconds: 30,
                                },
                                readinessProbe: {
                                    httpGet: {
                                        path: "/",
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
                            },
                        ],
                        volumes: [
                            {
                                name: "nginx-config",
                                configMap: {
                                    name: "nginx-config",
                                },
                            },
                            {
                                name: "js-config",
                                configMap: {
                                    name: "js-config",
                                },
                            },
                        ],
                    },
                },
            },
        },
        { provider: args.provider }
    );

    // Create Service
    const service = new k8s.core.v1.Service(
        "web",
        {
            metadata: {
                name: "web",
                namespace: args.namespace,
                labels,
            },
            spec: {
                selector: {
                    app: "web",
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
            "web-pdb",
            {
                metadata: {
                    name: "web",
                    namespace: args.namespace,
                    labels,
                },
                spec: {
                    minAvailable: args.podDisruptionBudget.minAvailable,
                    maxUnavailable: args.podDisruptionBudget.maxUnavailable,
                    selector: {
                        matchLabels: { app: "web" },
                    },
                },
            },
            { provider: args.provider }
        );
    }

    return {
        deployment: deployment.metadata,
        service: service.metadata,
        configMap: configMap.metadata,
        nginxConfigMap: nginxConfig.metadata,
        podDisruptionBudget: pdb?.metadata,
    };
}
