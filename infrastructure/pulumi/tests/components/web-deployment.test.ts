import { describe, it, expect, beforeAll } from "@jest/globals";
import * as k8s from "@pulumi/kubernetes";
import { createWebDeployment } from "../../src/components/web-deployment";
import { promiseOf } from "../test-utils";

describe("createWebDeployment", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    const standardResources = {
        requests: { cpu: "50m", memory: "64Mi" },
        limits: { cpu: "100m", memory: "128Mi" },
    };

    it("should create deployment with required resources", async () => {
        const result = createWebDeployment({
            env: "local",
            namespace: "web-ns",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-web:latest",
            baseUrl: "https://www.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://api.aphiria.com",
            },
            logLevel: "debug",
            resources: standardResources,
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.configMap).toBeDefined();

        const [deploymentName, serviceName, configMapName, namespace] = await Promise.all([
            promiseOf(result.deployment.name),
            promiseOf(result.service.name),
            promiseOf(result.configMap.name),
            promiseOf(result.deployment.namespace),
        ]);
        expect(deploymentName).toBe("web");
        expect(serviceName).toBe("web");
        expect(configMapName).toBe("js-config");
        expect(namespace).toBe("web-ns");
    });

    it("should create PodDisruptionBudget when configured", async () => {
        const result = createWebDeployment({
            env: "production",
            namespace: "prod-web",
            replicas: 2,
            image: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123",
            baseUrl: "https://www.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://api.aphiria.com",
            },
            logLevel: "warning",
            podDisruptionBudget: {
                minAvailable: 1,
            },
            resources: standardResources,
            provider: k8sProvider,
        });

        expect(result.podDisruptionBudget).toBeDefined();

        const [pdbName, pdbNamespace] = await Promise.all([
            promiseOf(result.podDisruptionBudget!.name),
            promiseOf(result.podDisruptionBudget!.namespace),
        ]);
        expect(pdbName).toBe("web");
        expect(pdbNamespace).toBe("prod-web");
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
            logLevel: "debug",
            resources: standardResources,
            provider: k8sProvider,
        });

        expect(result.podDisruptionBudget).toBeUndefined();
    });

    it("should handle preview environment with PR number", async () => {
        const result = createWebDeployment({
            env: "preview",
            namespace: "preview-pr-123",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-web:latest",
            baseUrl: "https://pr-123.pr.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://pr-123.pr-api.aphiria.com",
            },
            logLevel: "debug",
            prNumber: "123",
            resources: standardResources,
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();

        const namespace = await promiseOf(result.deployment.namespace);
        expect(namespace).toBe("preview-pr-123");
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
            logLevel: "warning",
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
            logLevel: "warning",
            imagePullSecrets: ["ghcr-pull-secret"],
            resources: standardResources,
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should merge custom labels with default labels", async () => {
        const result = createWebDeployment({
            env: "local",
            namespace: "custom-web",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-web:latest",
            baseUrl: "https://www.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://api.aphiria.com",
            },
            logLevel: "debug",
            labels: {
                "custom-label": "custom-value",
                environment: "testing",
            },
            resources: standardResources,
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();

        const deploymentLabels = await promiseOf(result.deployment.labels);
        expect(deploymentLabels).toMatchObject({
            app: "web",
            "app.kubernetes.io/name": "web",
            "app.kubernetes.io/component": "frontend",
            "custom-label": "custom-value",
            environment: "testing",
        });
    });

    it("should handle production environment", async () => {
        const result = createWebDeployment({
            env: "production",
            namespace: "prod",
            replicas: 2,
            image: "ghcr.io/aphiria/aphiria.com-web@sha256:abc123",
            baseUrl: "https://www.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://api.aphiria.com",
            },
            logLevel: "warning",
            resources: standardResources,
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();

        const namespace = await promiseOf(result.deployment.namespace);
        expect(namespace).toBe("prod");
    });

    it("should handle extra vars", async () => {
        const result = createWebDeployment({
            env: "preview",
            namespace: "preview-pr-123",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-web:latest",
            baseUrl: "https://pr-123.pr.aphiria.com",
            jsConfigData: {
                apiBaseUrl: "https://pr-123.pr-api.aphiria.com",
            },
            logLevel: "debug",
            extraVars: {
                CUSTOM_VAR: "custom-value",
            },
            resources: standardResources,
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();

        const namespace = await promiseOf(result.deployment.namespace);
        expect(namespace).toBe("preview-pr-123");
    });
});
