import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createDatabaseCreationJob } from "../../src/components/db-creation";
import { promiseOf } from "../test-utils";

describe("createDatabaseCreationJob", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create database creation job with valid database name", async () => {
        const job = createDatabaseCreationJob({
            namespace: "preview-pr-123",
            databaseName: "aphiria_pr_123",
            dbHost: "db.default.svc.cluster.local",
            dbAdminUser: pulumi.output("postgres"),
            dbAdminPassword: pulumi.output("admin-password"),
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        const [jobName, namespace] = await Promise.all([
            promiseOf(job.metadata.name),
            promiseOf(job.metadata.namespace),
        ]);
        expect(jobName).toBe("db-init-aphiria-pr-123");
        expect(namespace).toBe("preview-pr-123");
    });

    it("should reject invalid database name with special characters", () => {
        expect(() => {
            createDatabaseCreationJob({
                namespace: "preview-pr-123",
                databaseName: "aphiria-pr-123",
                dbHost: "db.default.svc.cluster.local",
                dbAdminUser: pulumi.output("postgres"),
                dbAdminPassword: pulumi.output("admin-password"),
                provider: k8sProvider,
            });
        }).toThrow("Invalid database name");
    });

    it("should reject database name longer than 63 characters", () => {
        const longName = "a".repeat(64);
        expect(() => {
            createDatabaseCreationJob({
                namespace: "preview-pr-123",
                databaseName: longName,
                dbHost: "db.default.svc.cluster.local",
                dbAdminUser: pulumi.output("postgres"),
                dbAdminPassword: pulumi.output("admin-password"),
                provider: k8sProvider,
            });
        }).toThrow("Database name too long");
    });

    it("should accept database name with underscores and alphanumeric characters", async () => {
        const job = createDatabaseCreationJob({
            namespace: "preview-pr-456",
            databaseName: "aphiria_pr_123_test",
            dbHost: "db.default.svc.cluster.local",
            dbAdminUser: pulumi.output("postgres"),
            dbAdminPassword: pulumi.output("admin-password"),
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        const namespace = await promiseOf(job.metadata.namespace);
        expect(namespace).toBe("preview-pr-456");
    });

    it("should merge custom labels with default labels", async () => {
        const job = createDatabaseCreationJob({
            namespace: "preview-pr-789",
            databaseName: "aphiria_pr_123",
            dbHost: "db.default.svc.cluster.local",
            dbAdminUser: pulumi.output("postgres"),
            dbAdminPassword: pulumi.output("admin-password"),
            labels: {
                "custom-label": "custom-value",
            },
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        const jobLabels = await promiseOf(job.metadata.labels);
        expect(jobLabels).toMatchObject({
            app: "db-init",
            "app.kubernetes.io/name": "db-init",
            "app.kubernetes.io/component": "database",
            "custom-label": "custom-value",
        });
    });
});
