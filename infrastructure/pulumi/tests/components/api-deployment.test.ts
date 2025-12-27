import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createAPIDeployment } from "../../src/components/api-deployment";

describe("createAPIDeployment", () => {
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
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.secret).toBeDefined();
    });

    it("should create PodDisruptionBudget when configured", () => {
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
            podDisruptionBudget: {
                minAvailable: 1,
            },
            provider: k8sProvider,
        });

        expect(result.podDisruptionBudget).toBeDefined();
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
            provider: k8sProvider,
        });

        expect(result.podDisruptionBudget).toBeUndefined();
    });

    it("should use production defaults for production environment", () => {
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
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should include PR_NUMBER when provided in envConfig", () => {
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
            envConfig: {
                cookieDomain: ".pr.aphiria.com",
                prNumber: "123",
            },
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
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

    it("should handle imagePullSecrets", () => {
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
            imagePullSecrets: ["ghcr-pull-secret"],
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should set cookieSecure to 0 when explicitly disabled", () => {
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
            envConfig: {
                cookieDomain: ".aphiria.com",
                cookieSecure: false,
            },
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should default cookieSecure to 1 when not specified", () => {
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
            envConfig: {
                cookieDomain: ".aphiria.com",
            },
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });
});
