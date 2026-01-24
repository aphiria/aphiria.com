import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { PodDisruptionBudgetConfig } from "./types/kubernetes";
import { WebDeploymentResult } from "./types/application";
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
    /** API URI for backend (injected as API_URI environment variable) */
    apiUri: string;
    /** Cookie domain (injected as COOKIE_DOMAIN environment variable) */
    cookieDomain: string;
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
}

/**
 * Creates Node.js deployment for SSR Next.js application
 *
 * @param args - Configuration for the web deployment
 * @returns Deployment, Service, and optional PodDisruptionBudget metadata
 */
export function createWebDeployment(args: WebDeploymentArgs): WebDeploymentResult {
    const labels = buildLabels("web", "frontend", args.labels);

    // Build environment variables for Node.js SSR
    const envConfigData: Record<string, pulumi.Input<string>> = {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "0.0.0.0",
        API_URI: args.apiUri,
        COOKIE_DOMAIN: args.cookieDomain,
        APP_ENV: args.appEnv,
        ...(args.prNumber && { PR_NUMBER: args.prNumber }),
        ...(args.extraVars || {}),
    }

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
    const configChecksum = checksum(envConfigData);

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
                                envFrom: [
                                    {
                                        configMapRef: { name: envConfigMap.metadata.name },
                                    },
                                ],
                                resources: args.resources,
                                livenessProbe: {
                                    httpGet: {
                                        path: "/",
                                        port: 3000,
                                    },
                                    initialDelaySeconds: 30,
                                    periodSeconds: 30,
                                },
                                readinessProbe: {
                                    httpGet: {
                                        path: "/",
                                        port: 3000,
                                    },
                                    initialDelaySeconds: 10,
                                    periodSeconds: 10,
                                },
                                ports: [
                                    {
                                        containerPort: 3000,
                                    },
                                ],
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
                        port: 3000,
                        targetPort: 3000,
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
        configMap: envConfigMap.metadata,
        podDisruptionBudget: pdb?.metadata,
    };
}
