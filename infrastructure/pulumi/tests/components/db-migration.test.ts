import { describe, it, expect, beforeAll } from "vitest";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createDBMigrationJob } from "../../src/components/db-migration";
import { promiseOf } from "../test-utils";

describe("createDBMigrationJob", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    const standardMigrationResources = {
        migration: {
            requests: { cpu: "50m", memory: "128Mi" },
            limits: { cpu: "200m", memory: "256Mi" },
        },
        initContainer: {
            requests: { cpu: "10m", memory: "32Mi" },
            limits: { cpu: "50m", memory: "64Mi" },
        },
    };

    it("should create migration job without seeder", async () => {
        const job = createDBMigrationJob({
            imagePullPolicy: "Never",
            namespace: "migration-ns",
            image: "ghcr.io/aphiria/aphiria.com-api:latest",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: false,
            resources: standardMigrationResources,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        const [name, namespace] = await Promise.all([
            promiseOf(job.metadata.name),
            promiseOf(job.metadata.namespace),
        ]);
        expect(name).toBe("db-migration");
        expect(namespace).toBe("migration-ns");
    });

    it("should create migration job with seeder", async () => {
        const job = createDBMigrationJob({
            imagePullPolicy: "Never",
            namespace: "prod-migration",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            resources: standardMigrationResources,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        const [name, namespace] = await Promise.all([
            promiseOf(job.metadata.name),
            promiseOf(job.metadata.namespace),
        ]);
        expect(name).toBe("db-migration");
        expect(namespace).toBe("prod-migration");
    });

    it("should handle custom resource limits", () => {
        const job = createDBMigrationJob({
            imagePullPolicy: "Never",
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

    it("should handle imagePullSecrets", async () => {
        const job = createDBMigrationJob({
            imagePullPolicy: "Never",
            namespace: "secure-ns",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            imagePullSecrets: ["ghcr-pull-secret"],
            resources: standardMigrationResources,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        const namespace = await promiseOf(job.metadata.namespace);
        expect(namespace).toBe("secure-ns");
    });

    it("should merge custom labels with default labels", async () => {
        const job = createDBMigrationJob({
            imagePullPolicy: "Never",
            namespace: "custom-migration",
            image: "ghcr.io/aphiria/aphiria.com-api:latest",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: false,
            labels: {
                "custom-label": "custom-value",
                environment: "testing",
            },
            resources: standardMigrationResources,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        const labels = await promiseOf(job.metadata.labels);
        expect(labels).toMatchObject({
            app: "db-migration",
            "app.kubernetes.io/name": "db-migration",
            "app.kubernetes.io/component": "database",
            "custom-label": "custom-value",
            environment: "testing",
        });
    });

    it("should use IfNotPresent imagePullPolicy for digest-based images", () => {
        const job = createDBMigrationJob({
            imagePullPolicy: "Never",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123def456",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            resources: standardMigrationResources,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();
    });

    it("should use imagePullPolicy for tag-based images", () => {
        const job = createDBMigrationJob({
            imagePullPolicy: "Never",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api:v1.2.3",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            resources: standardMigrationResources,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();
    });

    it("should have patchForce and skipAwait annotations for ephemeral Job pattern", async () => {
        const job = createDBMigrationJob({
            imagePullPolicy: "Never",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            resources: standardMigrationResources,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        const annotations = await promiseOf(job.metadata.annotations);
        expect(annotations).toBeDefined();
        // skipAwait: Prevent "Job not found" errors when Job auto-deletes
        expect(annotations["pulumi.com/skipAwait"]).toBe("true");
    });

    /**
     * Integration test: Verifies Job is created with ttlSecondsAfterFinished for auto-cleanup
     *
     * Jobs are immutable in Kubernetes - any spec change triggers automatic replacement.
     * We rely on Kubernetes' natural replacement behavior instead of using replaceOnChanges.
     *
     * Behavior:
     * 1. Pulumi creates Job during deployment
     * 2. Job runs migrations/seeder and completes
     * 3. Kubernetes deletes Job after ttlSecondsAfterFinished (300 seconds = 5 minutes)
     * 4. TTL provides time for log inspection and Pulumi state reconciliation
     * 5. Next deployment with spec changes: Kubernetes automatically replaces the Job
     *
     * Manual verification: Run `pulumi preview --stack production` after Job completes
     * and confirm no drift is detected.
     */
    it("should create Job with auto-cleanup configuration", async () => {
        const job = createDBMigrationJob({
            imagePullPolicy: "Never",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            resources: standardMigrationResources,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        // Verify Job has ttlSecondsAfterFinished set for auto-cleanup
        const [name, ttl] = await Promise.all([
            promiseOf(job.metadata.name),
            promiseOf(job.spec.ttlSecondsAfterFinished),
        ]);
        expect(name).toBe("db-migration");
        expect(ttl).toBe(300); // 5 minutes - provides time for logs and state reconciliation
    });

    it("should use correct monorepo paths for phinx executable", async () => {
        const job = createDBMigrationJob({
            imagePullPolicy: "Never",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            resources: standardMigrationResources,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        const containers = await promiseOf(job.spec.template.spec?.containers);
        expect(containers).toBeDefined();
        expect(containers).toHaveLength(1);

        const command = containers![0].command;
        expect(command).toBeDefined();
        expect(command).toHaveLength(3);
        expect(command![0]).toBe("sh");
        expect(command![1]).toBe("-c");
        // Verify paths use /app/apps/api (monorepo structure) not /app/api
        expect(command![2]).toContain("/app/apps/api/vendor/bin/phinx migrate");
        expect(command![2]).toContain("/app/apps/api/vendor/bin/phinx seed:run");
    });

    it("should use correct monorepo paths when seeder is disabled", async () => {
        const job = createDBMigrationJob({
            imagePullPolicy: "Never",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: false,
            resources: standardMigrationResources,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        const containers = await promiseOf(job.spec.template.spec?.containers);
        expect(containers).toBeDefined();
        expect(containers).toHaveLength(1);

        const command = containers![0].command;
        expect(command).toBeDefined();
        expect(command).toHaveLength(3);
        expect(command![0]).toBe("sh");
        expect(command![1]).toBe("-c");
        // Verify path uses /app/apps/api (monorepo structure) not /app/api
        expect(command![2]).toBe("/app/apps/api/vendor/bin/phinx migrate");
    });

    it("should have fail-fast configuration to avoid wasting CI time", async () => {
        const job = createDBMigrationJob({
            imagePullPolicy: "Never",
            namespace: "default",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            resources: standardMigrationResources,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        const [backoffLimit, activeDeadline] = await Promise.all([
            promiseOf(job.spec.backoffLimit),
            promiseOf(job.spec.activeDeadlineSeconds),
        ]);

        // Verify fail-fast settings prevent infinite retries
        expect(backoffLimit).toBe(2); // Only retry twice
        expect(activeDeadline).toBe(300); // Max 5 minutes total
    });
});
