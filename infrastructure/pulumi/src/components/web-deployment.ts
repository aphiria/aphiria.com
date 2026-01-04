import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { CommonDeploymentArgs, PodDisruptionBudgetConfig, WebDeploymentResult } from "./types";
import { checksum } from "./utils";
import { buildLabels } from "./labels";

/**
 * Arguments for web deployment component
 */
export interface WebDeploymentArgs extends CommonDeploymentArgs {
    /** Number of replicas (1 for dev-local/preview, 2 for production) */
    replicas: number;
    /** Docker image reference (can be tag or digest) */
    image: string;
    /** JavaScript configuration data for js-config ConfigMap */
    jsConfigData: Record<string, string>;
    /** Base URL for the web application */
    baseUrl: string;
    /** Log level (e.g., "warning", "debug", "info") */
    logLevel: string;
    /** PR number (optional, preview environments only) */
    prNumber?: string;
    /** Additional custom environment variables */
    extraVars?: Record<string, pulumi.Input<string>>;
    /** Optional image pull secrets for private registries */
    imagePullSecrets?: pulumi.Input<string>[];
    /** Resource requests and limits (required) */
    resources: {
        requests: {
            cpu: string;
            memory: string;
        };
        limits: {
            cpu: string;
            memory: string;
        };
    };
    /** Optional PodDisruptionBudget for high availability (production only) */
    podDisruptionBudget?: PodDisruptionBudgetConfig;
    /** @deprecated Component calculates checksum internally. ConfigMap checksum for pod annotations */
    configChecksum?: string;
    /** @deprecated Use envConfig instead. ConfigMap references to load as environment variables */
    configMapRefs?: pulumi.Input<string>[];
    /** @deprecated Use envConfig instead. Secret references to load as environment variables */
    secretRefs?: pulumi.Input<string>[];
}

/** Creates nginx deployment for static site with js-config ConfigMap */
export function createWebDeployment(args: WebDeploymentArgs): WebDeploymentResult {
    const labels = buildLabels("web", "frontend", args.labels);

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
        APP_ENV: args.env,
        LOG_LEVEL: args.logLevel,
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
                        maxUnavailable: 0,
                        maxSurge: 1,
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
                                volumeMounts: [
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
        podDisruptionBudget: pdb?.metadata,
    };
}
