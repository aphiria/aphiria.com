import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { WebDeploymentArgs, WebDeploymentResult } from "./types";
import { checksum } from "./utils";

/** Creates nginx deployment for static site with js-config ConfigMap */
export function createWebDeployment(args: WebDeploymentArgs): WebDeploymentResult {
    const labels = {
        app: "web",
        "app.kubernetes.io/name": "aphiria-web",
        "app.kubernetes.io/component": "frontend",
        ...(args.labels || {}),
    };

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

    // Build environment variables from envConfig (if provided)
    const envConfigData: Record<string, pulumi.Input<string>> = args.envConfig
        ? {
              APP_ENV: args.envConfig.appEnv || (args.env === "production" ? "production" : "dev"),
              LOG_LEVEL:
                  args.envConfig.logLevel || (args.env === "production" ? "warning" : "debug"),
              ...(args.envConfig.prNumber && { PR_NUMBER: args.envConfig.prNumber }),
              ...(args.envConfig.extraVars || {}),
          }
        : ({} as Record<string, pulumi.Input<string>>);

    // Create env-config ConfigMap (only if envConfig provided)
    const envConfigMap =
        Object.keys(envConfigData).length > 0
            ? new k8s.core.v1.ConfigMap(
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
              )
            : undefined;

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
                                imagePullPolicy:
                                    args.env === "local"
                                        ? "Never" // Local images only
                                        : args.image.includes("@sha256:")
                                          ? "IfNotPresent" // Use digest - don't pull if present
                                          : "Always", // Use tag - always pull latest
                                volumeMounts: [
                                    {
                                        name: "js-config",
                                        mountPath: "/usr/share/nginx/html/js/config",
                                    },
                                ],
                                ...(envConfigMap
                                    ? {
                                          envFrom: [
                                              {
                                                  configMapRef: { name: "env-config" },
                                              },
                                          ],
                                      }
                                    : {}),
                                ...(args.resources && {
                                    resources: args.resources,
                                }),
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
