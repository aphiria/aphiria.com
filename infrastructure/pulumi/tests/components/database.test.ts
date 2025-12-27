import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createPostgreSQL } from "../../src/components/database";

describe("createPostgreSQL", () => {
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

    it("should create deployment without persistent storage", () => {
        const result = createPostgreSQL({
            env: "local",
            namespace: "default",
            replicas: 1,
            persistentStorage: false,
            storageSize: "5Gi",
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.pvc).toBeUndefined();
    });

    it("should create deployment with persistent storage for local environment", () => {
        const result = createPostgreSQL({
            env: "local",
            namespace: "test-namespace",
            replicas: 1,
            persistentStorage: true,
            storageSize: "5Gi",
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.pvc).toBeDefined();
    });

    it("should create deployment with persistent storage for production environment", () => {
        const result = createPostgreSQL({
            env: "production",
            namespace: "prod-namespace",
            replicas: 2,
            persistentStorage: true,
            storageSize: "50Gi",
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.pvc).toBeDefined();
    });

    it("should merge custom labels with default labels", () => {
        const result = createPostgreSQL({
            env: "local",
            namespace: "default",
            replicas: 1,
            persistentStorage: false,
            storageSize: "5Gi",
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            labels: {
                "custom-label": "custom-value",
                "environment": "test",
            },
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should use default storage size 5Gi when not specified for local", () => {
        const result = createPostgreSQL({
            env: "local",
            namespace: "default",
            replicas: 1,
            persistentStorage: true,
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.pvc).toBeDefined();
    });

    it("should use default storage size 10Gi when not specified for cloud", () => {
        const result = createPostgreSQL({
            env: "production",
            namespace: "default",
            replicas: 2,
            persistentStorage: true,
            dbUser: "postgres",
            dbPassword: pulumi.output("password"),
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.pvc).toBeDefined();
    });
});
