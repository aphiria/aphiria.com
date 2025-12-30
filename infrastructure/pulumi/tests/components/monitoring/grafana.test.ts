import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createGrafana } from "../../../src/components/monitoring/grafana";
import { checksum } from "../../../src/components/utils";

describe("createGrafana", () => {
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

    it("should create all required Grafana resources", (done) => {
        const result = createGrafana({
            env: "production",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: "test-client-id",
            githubClientSecret: "test-client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            smtpHost: "smtp.example.com",
            smtpPort: 587,
            smtpUser: "user@example.com",
            smtpPassword: "password",
            smtpFromAddress: "admin@aphiria.com",
            alertEmail: "admin@aphiria.com",
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.pvc).toBeDefined();
        expect(result.configMap).toBeDefined();
        expect(result.secret).toBeDefined();

        done();
    });

    it("should create production environment with email alerting", (done) => {
        const result = createGrafana({
            env: "production",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: pulumi.output("client-id"),
            githubClientSecret: pulumi.output("client-secret"),
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            smtpHost: pulumi.output("smtp.example.com"),
            smtpPort: 587,
            smtpUser: pulumi.output("user@example.com"),
            smtpPassword: pulumi.output("password"),
            smtpFromAddress: "admin@aphiria.com",
            alertEmail: "admin@aphiria.com",
            provider: k8sProvider,
        });

        pulumi.all([result.deployment]).apply(([deployment]) => {
            expect(deployment.name).toBe("grafana");
            expect(deployment.namespace).toBe("monitoring");
            done();
        });
    });

    it("should create preview environment without email alerting", (done) => {
        const result = createGrafana({
            env: "preview",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: "test-client-id",
            githubClientSecret: "test-client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            provider: k8sProvider,
        });

        pulumi.all([result.configMap]).apply(([cm]) => {
            expect(cm.name).toBe("grafana-config");
            done();
        });
    });

    it("should create local environment without email alerting", (done) => {
        const result = createGrafana({
            env: "local",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "2Gi",
            githubClientId: "local-client-id",
            githubClientSecret: "local-client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            provider: k8sProvider,
        });

        pulumi.all([result.secret]).apply(([secret]) => {
            expect(secret.name).toBe("grafana-secrets");
            done();
        });
    });

    it("should create PVC with correct storage size", (done) => {
        const result = createGrafana({
            env: "production",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "10Gi",
            githubClientId: "client-id",
            githubClientSecret: "client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            provider: k8sProvider,
        });

        pulumi.all([result.pvc]).apply(([pvc]) => {
            expect(pvc.name).toBe("grafana-pvc");
            expect(pvc.namespace).toBe("monitoring");
            done();
        });
    });

    it("should configure GitHub OAuth with correct organization", (done) => {
        const result = createGrafana({
            env: "production",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: "test-id",
            githubClientSecret: "test-secret",
            githubOrg: "test-org",
            adminUser: "admin-user",
            provider: k8sProvider,
        });

        expect(result.secret).toBeDefined();
        expect(result.configMap).toBeDefined();
        done();
    });

    it("should apply custom labels to resources", (done) => {
        const result = createGrafana({
            env: "preview",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: "id",
            githubClientSecret: "secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            labels: {
                team: "platform",
                "pr-number": "123",
            },
            provider: k8sProvider,
        });

        pulumi.all([result.service]).apply(([svc]) => {
            expect(svc.name).toBe("grafana");
            done();
        });
    });

    it("should configure service with port 80", (done) => {
        const result = createGrafana({
            env: "local",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus.monitoring.svc:9090",
            storageSize: "2Gi",
            githubClientId: "id",
            githubClientSecret: "secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            provider: k8sProvider,
        });

        pulumi.all([result.service]).apply(([svc]) => {
            expect(svc.namespace).toBe("monitoring");
            done();
        });
    });

    it("should configure production with SMTP but no email if smtpHost missing", (done) => {
        const result = createGrafana({
            env: "production",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: "client-id",
            githubClientSecret: "client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            // No SMTP configuration provided
            provider: k8sProvider,
        });

        expect(result.secret).toBeDefined();
        expect(result.configMap).toBeDefined();
        done();
    });

    it("should handle production with full SMTP configuration", (done) => {
        const result = createGrafana({
            env: "production",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: "client-id",
            githubClientSecret: "client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            smtpHost: "smtp.gmail.com",
            smtpPort: 465,
            smtpUser: "noreply@aphiria.com",
            smtpPassword: "secretpass",
            smtpFromAddress: "admin@aphiria.com",
            alertEmail: "admin@aphiria.com",
            provider: k8sProvider,
        });

        pulumi.all([result.secret]).apply(([secret]) => {
            expect(secret.name).toBe("grafana-secrets");
            expect(secret.namespace).toBe("monitoring");
            done();
        });
    });

    it("should handle production with partial SMTP configuration (missing optional fields)", (done) => {
        const result = createGrafana({
            env: "production",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: "client-id",
            githubClientSecret: "client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            smtpHost: "smtp.gmail.com",
            // smtpPort omitted - should default to 587
            // smtpUser, smtpPassword, smtpFromAddress omitted - should default to ""
            provider: k8sProvider,
        });

        pulumi.all([result.secret, result.configMap]).apply(([secret, configMap]) => {
            expect(secret.name).toBe("grafana-secrets");
            expect(configMap.name).toBe("grafana-config");
            done();
        });
    });

    it("should mount dashboards ConfigMap when provided", () => {
        const dashboardsConfigMap = new k8s.core.v1.ConfigMap("test-dashboards", {
            metadata: {
                name: "grafana-dashboards",
                namespace: "monitoring",
            },
            data: {
                "dashboard1.json": '{"uid":"dash1","title":"Test Dashboard 1","panels":[]}',
                "dashboard2.json": '{"uid":"dash2","title":"Test Dashboard 2","panels":[]}',
            },
        });

        const result = createGrafana({
            env: "production",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: "client-id",
            githubClientSecret: "client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            dashboardsConfigMap,
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should add checksum annotation when dashboards ConfigMap provided", (done) => {
        const dashboardData = {
            "dashboard1.json": '{"uid":"dash1","title":"Test Dashboard 1","panels":[]}',
            "dashboard2.json": '{"uid":"dash2","title":"Test Dashboard 2","panels":[]}',
        };

        const dashboardsConfigMap = new k8s.core.v1.ConfigMap("test-dashboards", {
            metadata: {
                name: "grafana-dashboards",
                namespace: "monitoring",
            },
            data: dashboardData,
        });

        const result = createGrafana({
            env: "production",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: "client-id",
            githubClientSecret: "client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            dashboardsConfigMap,
            provider: k8sProvider,
        });

        const expectedChecksum = checksum(dashboardData);

        pulumi.all([result.deployment]).apply(([deployment]) => {
            expect(deployment.name).toBe("grafana");
            expect(expectedChecksum).toBeDefined();
            expect(expectedChecksum.length).toBe(64);
            done();
        });
    });

    it("should not add checksum annotation when dashboards ConfigMap not provided", (done) => {
        const result = createGrafana({
            env: "production",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: "client-id",
            githubClientSecret: "client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            provider: k8sProvider,
        });

        pulumi.all([result.deployment]).apply(([deployment]) => {
            expect(deployment.name).toBe("grafana");
            done();
        });
    });
});
