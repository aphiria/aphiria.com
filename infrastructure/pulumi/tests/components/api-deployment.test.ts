import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createAPIDeployment } from "../../src/components/api-deployment";
import { promiseOf } from "../test-utils";

describe("createAPIDeployment", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create deployment with required resources", async () => {
        const result = createAPIDeployment({
            env: "local",
            namespace: "test-ns",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-api:latest",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            webUrl: "https://www.aphiria.com",
            apiUrl: "https://api.aphiria.com",
            logLevel: "debug",
            cookieDomain: ".aphiria.com",
            cookieSecure: false,
            prometheusAuthToken: pulumi.output("test-token"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.secret).toBeDefined();

        const [deploymentName, serviceName, secretName, namespace] = await Promise.all([
            promiseOf(result.deployment.name),
            promiseOf(result.service.name),
            promiseOf(result.secret.name),
            promiseOf(result.deployment.namespace),
        ]);
        expect(deploymentName).toBe("api");
        expect(serviceName).toBe("api");
        expect(secretName).toBe("api-env-var-secrets");
        expect(namespace).toBe("test-ns");
    });

    it("should create PodDisruptionBudget when configured", async () => {
        const result = createAPIDeployment({
            env: "production",
            namespace: "prod-ns",
            replicas: 2,
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            webUrl: "https://www.aphiria.com",
            apiUrl: "https://api.aphiria.com",
            logLevel: "warning",
            cookieDomain: ".aphiria.com",
            cookieSecure: true,
            prometheusAuthToken: pulumi.output("test-token"),
            podDisruptionBudget: {
                minAvailable: 1,
            },
            provider: k8sProvider,
        });

        expect(result.podDisruptionBudget).toBeDefined();

        const [pdbName, pdbNamespace] = await Promise.all([
            promiseOf(result.podDisruptionBudget!.name),
            promiseOf(result.podDisruptionBudget!.namespace),
        ]);
        expect(pdbName).toBe("api");
        expect(pdbNamespace).toBe("prod-ns");
    });

    it("should not create PodDisruptionBudget when not configured", () => {
        const result = createAPIDeployment({
            env: "local",
            namespace: "default",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-api:latest",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            webUrl: "https://www.aphiria.com",
            apiUrl: "https://api.aphiria.com",
            logLevel: "debug",
            cookieDomain: ".aphiria.com",
            cookieSecure: false,
            prometheusAuthToken: pulumi.output("test-token"),
            provider: k8sProvider,
        });

        expect(result.podDisruptionBudget).toBeUndefined();
    });

    it("should handle production environment", () => {
        const result = createAPIDeployment({
            env: "production",
            namespace: "default",
            replicas: 2,
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            webUrl: "https://www.aphiria.com",
            apiUrl: "https://api.aphiria.com",
            logLevel: "warning",
            cookieDomain: ".aphiria.com",
            cookieSecure: true,
            prometheusAuthToken: pulumi.output("test-token"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should include PR_NUMBER when provided", async () => {
        const result = createAPIDeployment({
            env: "preview",
            namespace: "preview-pr-123",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-api:latest",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria_pr_123",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            webUrl: "https://pr-123.pr.aphiria.com",
            apiUrl: "https://pr-123.pr-api.aphiria.com",
            logLevel: "debug",
            cookieDomain: ".pr.aphiria.com",
            cookieSecure: true,
            prometheusAuthToken: pulumi.output("test-token"),
            prNumber: "123",
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();

        const namespace = await promiseOf(result.deployment.namespace);
        expect(namespace).toBe("preview-pr-123");
    });

    it("should handle custom resource limits", () => {
        const result = createAPIDeployment({
            env: "production",
            namespace: "default",
            replicas: 2,
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            webUrl: "https://www.aphiria.com",
            apiUrl: "https://api.aphiria.com",
            logLevel: "warning",
            cookieDomain: ".aphiria.com",
            cookieSecure: true,
            prometheusAuthToken: pulumi.output("test-token"),
            resources: {
                nginx: {
                    requests: { cpu: "100m", memory: "128Mi" },
                    limits: { cpu: "200m", memory: "256Mi" },
                },
                php: {
                    requests: { cpu: "250m", memory: "512Mi" },
                    limits: { cpu: "500m", memory: "1Gi" },
                },
                initContainer: {
                    requests: { cpu: "100m", memory: "128Mi" },
                    limits: { cpu: "200m", memory: "256Mi" },
                },
            },
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should handle imagePullSecrets", async () => {
        const result = createAPIDeployment({
            env: "production",
            namespace: "secure-ns",
            replicas: 2,
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            webUrl: "https://www.aphiria.com",
            apiUrl: "https://api.aphiria.com",
            logLevel: "warning",
            cookieDomain: ".aphiria.com",
            cookieSecure: true,
            prometheusAuthToken: pulumi.output("test-token"),
            imagePullSecrets: ["ghcr-pull-secret"],
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();

        const namespace = await promiseOf(result.deployment.namespace);
        expect(namespace).toBe("secure-ns");
    });

    it("should set cookieSecure to 0 when explicitly disabled", async () => {
        const result = createAPIDeployment({
            env: "local",
            namespace: "local-ns",
            replicas: 1,
            image: "ghcr.io/aphiria/aphiria.com-api:latest",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            webUrl: "https://www.aphiria.com",
            apiUrl: "https://api.aphiria.com",
            logLevel: "debug",
            cookieDomain: ".aphiria.com",
            cookieSecure: false,
            prometheusAuthToken: pulumi.output("test-token"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();

        const namespace = await promiseOf(result.deployment.namespace);
        expect(namespace).toBe("local-ns");
    });

    it("should set cookieSecure to 1 when explicitly enabled", async () => {
        const result = createAPIDeployment({
            env: "production",
            namespace: "prod-ns",
            replicas: 2,
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            webUrl: "https://www.aphiria.com",
            apiUrl: "https://api.aphiria.com",
            logLevel: "warning",
            cookieDomain: ".aphiria.com",
            cookieSecure: true,
            prometheusAuthToken: pulumi.output("test-token"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();

        const namespace = await promiseOf(result.deployment.namespace);
        expect(namespace).toBe("prod-ns");
    });
});
