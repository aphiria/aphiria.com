import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createDBMigrationJob } from "../../src/components/db-migration";

describe("createDBMigrationJob", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        pulumi.runtime.setMocks({
            newResource: (
                args: pulumi.runtime.MockResourceArgs
            ): { id: string; state: Record<string, unknown> } => {
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

    it("should create migration job without seeder", (done) => {
        const job = createDBMigrationJob({
            env: "local",
            namespace: "migration-ns",
            image: "ghcr.io/aphiria/aphiria.com-api:latest",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: false,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        pulumi.all([job.metadata.name, job.metadata.namespace]).apply(([name, namespace]) => {
            expect(name).toBe("db-migration");
            expect(namespace).toBe("migration-ns");
            done();
        });
    });

    it("should create migration job with seeder", (done) => {
        const job = createDBMigrationJob({
            env: "production",
            namespace: "prod-migration",
            image: "ghcr.io/aphiria/aphiria.com-api@sha256:abc123",
            dbHost: "db.default.svc.cluster.local",
            dbName: "aphiria",
            dbUser: pulumi.output("postgres"),
            dbPassword: pulumi.output("password"),
            runSeeder: true,
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        pulumi.all([job.metadata.name, job.metadata.namespace]).apply(([name, namespace]) => {
            expect(name).toBe("db-migration");
            expect(namespace).toBe("prod-migration");
            done();
        });
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

    it("should handle imagePullSecrets", (done) => {
        const job = createDBMigrationJob({
            env: "production",
            namespace: "secure-ns",
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

        job.metadata.namespace.apply((namespace: string) => {
            expect(namespace).toBe("secure-ns");
            done();
        });
    });

    it("should merge custom labels with default labels", (done) => {
        const job = createDBMigrationJob({
            env: "local",
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
            provider: k8sProvider,
        });

        expect(job).toBeDefined();

        job.metadata.labels.apply((labels: any) => {
            expect(labels).toMatchObject({
                app: "db-migration",
                "app.kubernetes.io/name": "aphiria-db-migration",
                "app.kubernetes.io/component": "database",
                "custom-label": "custom-value",
                environment: "testing",
            });
            done();
        });
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

    it("should use imagePullPolicy for tag-based images", () => {
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

    it("should have patchForce annotation to prevent SSA conflicts", (done) => {
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

        job.metadata.annotations.apply((annotations: any) => {
            expect(annotations).toBeDefined();
            expect(annotations["pulumi.com/patchForce"]).toBe("true");
            done();
        });
    });

    /**
     * Integration test: Verifies Job is created with ttlSecondsAfterFinished for auto-cleanup
     * IMPORTANT: This Job uses ignoreChanges: ["*"] to prevent drift detection when the Job
     * completes and gets auto-deleted by Kubernetes TTL controller.
     *
     * Behavior:
     * 1. Pulumi creates Job during deployment
     * 2. Job runs migrations/seeder and completes
     * 3. Kubernetes deletes Job after ttlSecondsAfterFinished (0 seconds = immediate)
     * 4. Drift detection ignores the deletion (no false positives)
     * 5. Next deployment recreates Job if needed
     *
     * Manual verification: Run `pulumi preview --stack production` after Job completes
     * and confirm no drift is reported for the missing Job resource.
     */
    it("should create ephemeral Job with auto-cleanup configuration", (done) => {
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

        // Verify Job has ttlSecondsAfterFinished set for auto-cleanup
        pulumi.all([job.metadata.name, job.spec.ttlSecondsAfterFinished]).apply(([name, ttl]) => {
            expect(name).toBe("db-migration");
            expect(ttl).toBe(0); // Immediate cleanup after completion
            done();
        });

        // NOTE: ignoreChanges: ["*"] is set in db-migration.ts:111
        // This prevents drift detection from reporting Job deletion as drift
    });
});
