import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createWebDeployment } from "../../src/components/web-deployment";

describe("createWebDeployment", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        pulumi.runtime.setMocks({
            newResource: (args: pulumi.runtime.MockResourceArgs): { id: string; state: Record<string, unknown> } => {
                return {
                    id: args.inputs.name ? `${args.name}-id` : `${args.type}-id`,
                    state: {
                        ...args.inputs,
                    },
                };
            },
            call: (args: pulumi.runtime.MockCallArgs): Record<string, unknown> => {
                return args.inputs;
            },
        });

        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create deployment with required resources", () => {
        const result = createWebDeployment({
            env: "local",
            namespace: "default",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-web:latest",
            baseUrl: "https://www.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://api.aphiria.com",
            },
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.configMap).toBeDefined();
    });

    it("should create PodDisruptionBudget when configured", () => {
        const result = createWebDeployment({
            env: "production",
            namespace: "default",
            replicas: 2,
            image: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123",
            baseUrl: "https://www.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://api.aphiria.com",
            },
            podDisruptionBudget: {
                minAvailable: 1,
            },
            provider: k8sProvider,
        });

        expect(result.podDisruptionBudget).toBeDefined();
    });

    it("should not create PodDisruptionBudget when not configured", () => {
        const result = createWebDeployment({
            env: "local",
            namespace: "default",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-web:latest",
            baseUrl: "https://www.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://api.aphiria.com",
            },
            provider: k8sProvider,
        });

        expect(result.podDisruptionBudget).toBeUndefined();
    });

    it("should handle envConfig when provided", () => {
        const result = createWebDeployment({
            env: "preview",
            namespace: "preview-pr-123",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-web:latest",
            baseUrl: "https://pr-123.pr.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://pr-123.pr-api.aphiria.com",
            },
            envConfig: {
                appEnv: "preview",
                logLevel: "debug",
                prNumber: "123",
            },
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should handle custom resource limits", () => {
        const result = createWebDeployment({
            env: "production",
            namespace: "default",
            replicas: 2,
            image: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123",
            baseUrl: "https://www.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://api.aphiria.com",
            },
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "200m", memory: "512Mi" },
            },
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should handle imagePullSecrets", () => {
        const result = createWebDeployment({
            env: "production",
            namespace: "default",
            replicas: 2,
            image: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123",
            baseUrl: "https://www.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://api.aphiria.com",
            },
            imagePullSecrets: ["ghcr-pull-secret"],
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should handle custom labels", () => {
        const result = createWebDeployment({
            env: "local",
            namespace: "default",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-web:latest",
            baseUrl: "https://www.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://api.aphiria.com",
            },
            labels: {
                "custom-label": "custom-value",
            },
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should handle production environment defaults", () => {
        const result = createWebDeployment({
            env: "production",
            namespace: "default",
            replicas: 2,
            image: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123",
            baseUrl: "https://www.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://api.aphiria.com",
            },
            envConfig: {},
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should handle extra vars in envConfig", () => {
        const result = createWebDeployment({
            env: "preview",
            namespace: "preview-pr-123",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-web:latest",
            baseUrl: "https://pr-123.pr.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://pr-123.pr-api.aphiria.com",
            },
            envConfig: {
                extraVars: {
                    CUSTOM_VAR: "custom-value",
                },
            },
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });
});
