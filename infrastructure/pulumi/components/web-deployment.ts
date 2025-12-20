import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { WebDeploymentArgs, WebDeploymentResult } from "./types";

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

    const configMap = new k8s.core.v1.ConfigMap("js-config", {
        metadata: {
            name: "js-config",
            namespace: args.namespace,
            labels,
        },
        data: {
            "config.js": `export default {\n${jsConfigData}\n    }`,
        },
    });

    // Create web deployment
    const deployment = new k8s.apps.v1.Deployment("web", {
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
                },
                spec: {
                    containers: [
                        {
                            name: "web",
                            image: args.image,
                            imagePullPolicy: args.image.includes("@sha256:")
                                ? "IfNotPresent" // Use digest - don't pull if present
                                : "Always", // Use tag - always pull latest
                            volumeMounts: [
                                {
                                    name: "js-config",
                                    mountPath: "/usr/share/nginx/html/js/config",
                                },
                            ],
                            livenessProbe: {
                                httpGet: {
                                    path: "/",
                                    port: 80,
                                },
                                initialDelaySeconds: 10,
                                periodSeconds: 30,
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
    });

    // Create Service
    const service = new k8s.core.v1.Service("web", {
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
    });

    return {
        deployment: deployment.metadata.apply((m) => m),
        service: service.metadata.apply((m) => m),
        configMap: configMap.metadata.apply((m) => m),
    };
}
