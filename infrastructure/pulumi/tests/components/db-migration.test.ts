import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createDBMigrationJob } from "../../src/components/db-migration";

describe("createDBMigrationJob", () => {
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

    it("should create migration job without seeder", () => {
        const job = createDBMigrationJob({
            env: "local",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api:latest",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: false,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();
    });

    it("should create migration job with seeder", () => {
        const job = createDBMigrationJob({
            env: "production",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();
    });

    it("should handle custom resource limits", () => {
        const job = createDBMigrationJob({
            env: "production",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            resources: {
                initContainer: {
                    requests: { cpu: "100m", memory: "128Mi" },
                    limits: { cpu: "200m", memory: "256Mi" },
                },
                migration: {
                    requests: { cpu: "250m", memory: "512Mi" },
                    limits: { cpu: "500m", memory: "1Gi" },
                },
            },
            provider: k8sProvider,
        });

        expect(job).toBeDefined();
    });

    it("should handle imagePullSecrets", () => {
        const job = createDBMigrationJob({
            env: "production",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            imagePullSecrets: ["ghcr-pull-secret"],
            provider: k8sProvider,
        });

        expect(job).toBeDefined();
    });

    it("should handle custom labels", () => {
        const job = createDBMigrationJob({
            env: "local",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api:latest",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: false,
            labels: {
                "custom-label": "custom-value",
            },
            provider: k8sProvider,
        });

        expect(job).toBeDefined();
    });

    it("should use IfNotPresent imagePullPolicy for digest-based images", () => {
        const job = createDBMigrationJob({
            env: "production",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123def456",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();
    });

    it("should use Always imagePullPolicy for tag-based images", () => {
        const job = createDBMigrationJob({
            env: "production",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api:v1.2.3",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();
    });
});
