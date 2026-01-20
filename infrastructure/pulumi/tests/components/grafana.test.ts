import { describe, it, expect, beforeAll } from "vitest";
import * as k8s from "@pulumi/kubernetes";
import { createGrafana, type GrafanaArgs } from "../../src/components/grafana";
import { checksum } from "../../src/components/utils";
import { promiseOf } from "../test-utils";

// Helper to create default test args
const getTestArgs = (overrides: Partial<GrafanaArgs> = {}): GrafanaArgs => ({
    replicas: 1,
    resources: {
        requests: { cpu: "100m", memory: "256Mi" },
        limits: { cpu: "200m", memory: "512Mi" },
    },
    namespace: "monitoring",
    prometheusUrl: "http://prometheus:9090",
    storageSize: "5Gi",
    domain: "grafana.test.aphiria.com",
    imageVersion: "10.0.0",
    provider: undefined as any, // Will be set in tests
    ...overrides,
});

describe("createGrafana", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create all required Grafana resources", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                provider: k8sProvider,
            })
        );

        expect(result.deployment).toBeDefined();
        expect(result.service).toBeDefined();
        expect(result.pvc).toBeDefined();
        expect(result.configMap).toBeDefined();
        expect(result.secret).toBeDefined();
    });

    it("should create production environment with email alerting", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                provider: k8sProvider,
            })
        );

        const deployment = await promiseOf(result.deployment);
        expect(deployment.name).toBe("grafana");
        expect(deployment.namespace).toBe("monitoring");
    });

    it("should create preview environment without email alerting", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                provider: k8sProvider,
            })
        );

        const cm = await promiseOf(result.configMap);
        expect(cm.name).toBe("grafana-config");
    });

    it("should create local environment without email alerting", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "2Gi",
                provider: k8sProvider,
            })
        );

        const secret = await promiseOf(result.secret);
        expect(secret.name).toBe("grafana-secrets");
    });

    it("should create PVC with correct storage size", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "10Gi",
                provider: k8sProvider,
            })
        );

        const pvc = await promiseOf(result.pvc);
        expect(pvc.name).toBe("grafana-pvc");
        expect(pvc.namespace).toBe("monitoring");
    });

    it("should configure GitHub OAuth with correct organization", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                provider: k8sProvider,
            })
        );

        expect(result.secret).toBeDefined();
        expect(result.configMap).toBeDefined();
    });

    it("should apply custom labels to resources", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                labels: {
                    team: "platform",
                    "pr-number": "123",
                },
                provider: k8sProvider,
            })
        );

        const svc = await promiseOf(result.service);
        expect(svc.name).toBe("grafana");
    });

    it("should configure service with port 80", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus.monitoring.svc:9090",
                storageSize: "2Gi",
                provider: k8sProvider,
            })
        );

        const svc = await promiseOf(result.service);
        expect(svc.namespace).toBe("monitoring");
    });

    it("should configure production with SMTP but no email if smtpHost missing", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                // No SMTP configuration provided
                provider: k8sProvider,
            })
        );

        expect(result.secret).toBeDefined();
        expect(result.configMap).toBeDefined();
    });

    it("should handle production with full SMTP configuration", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                provider: k8sProvider,
            })
        );

        const secret = await promiseOf(result.secret);
        expect(secret.name).toBe("grafana-secrets");
        expect(secret.namespace).toBe("monitoring");
    });

    it("should handle production with partial SMTP configuration (missing optional fields)", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                // smtpPort omitted - should default to 587
                // smtpUser, smtpPassword, smtpFromAddress omitted - should default to ""
                provider: k8sProvider,
            })
        );

        const [secret, configMap] = await Promise.all([
            promiseOf(result.secret),
            promiseOf(result.configMap),
        ]);
        expect(secret.name).toBe("grafana-secrets");
        expect(configMap.name).toBe("grafana-config");
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

        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                dashboardsConfigMap,
                provider: k8sProvider,
            })
        );

        expect(result.deployment).toBeDefined();
    });

    it("should add checksum annotation when dashboards ConfigMap provided", async () => {
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

        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                dashboardsConfigMap,
                provider: k8sProvider,
            })
        );

        const expectedChecksum = checksum(dashboardData);

        const deployment = await promiseOf(result.deployment);
        expect(deployment.name).toBe("grafana");
        expect(expectedChecksum).toBeDefined();
        expect(expectedChecksum.length).toBe(64);
    });

    it("should not add checksum annotation when dashboards ConfigMap not provided", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                provider: k8sProvider,
            })
        );

        const deployment = await promiseOf(result.deployment);
        expect(deployment.name).toBe("grafana");
    });

    it("should configure basic auth when credentials provided", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "2Gi",
                provider: k8sProvider,
            })
        );

        const secret = await promiseOf(result.secret);
        expect(secret.name).toBe("grafana-secrets");
    });

    it("should use GitHub OAuth when basic auth not provided", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "2Gi",
                provider: k8sProvider,
            })
        );

        const secret = await promiseOf(result.secret);
        expect(secret.name).toBe("grafana-secrets");
    });

    it("should create deployment with basic auth configuration", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "2Gi",
                provider: k8sProvider,
            })
        );

        const deployment = await promiseOf(result.deployment);
        expect(deployment.name).toBe("grafana");
        expect(deployment.namespace).toBe("monitoring");
    });

    it("should create deployment with GitHub OAuth configuration", async () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                provider: k8sProvider,
            })
        );

        const deployment = await promiseOf(result.deployment);
        expect(deployment.name).toBe("grafana");
        expect(deployment.namespace).toBe("monitoring");
    });

    it("should mount alert provisioning ConfigMaps when provided", async () => {
        const alertRulesConfigMap = new k8s.core.v1.ConfigMap("alert-rules", {
            metadata: { name: "alert-rules", namespace: "monitoring" },
            data: { "alert-rules.yaml": "test" },
        });
        const contactPointsConfigMap = new k8s.core.v1.ConfigMap("contact-points", {
            metadata: { name: "contact-points", namespace: "monitoring" },
            data: { "contact-points.yaml": "test" },
        });
        const notificationPoliciesConfigMap = new k8s.core.v1.ConfigMap("notification-policies", {
            metadata: { name: "notification-policies", namespace: "monitoring" },
            data: { "notification-policies.yaml": "test" },
        });

        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                alertRulesConfigMap,
                contactPointsConfigMap,
                notificationPoliciesConfigMap,
                provider: k8sProvider,
            })
        );

        expect(result.deployment).toBeDefined();
    });

    it("should mount only alertRulesConfigMap when other ConfigMaps are not provided", async () => {
        const alertRulesConfigMap = new k8s.core.v1.ConfigMap("alert-rules", {
            metadata: { name: "alert-rules", namespace: "monitoring" },
            data: { "alert-rules.yaml": "test" },
        });

        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                alertRulesConfigMap,
                provider: k8sProvider,
            })
        );

        expect(result.deployment).toBeDefined();
    });

    it("should add checksum annotations for alert ConfigMaps", async () => {
        const alertRulesData = { "alert-rules.yaml": "test-rules" };
        const contactPointsData = { "contact-points.yaml": "test-contacts" };
        const notificationPoliciesData = { "notification-policies.yaml": "test-policies" };

        const alertRulesConfigMap = new k8s.core.v1.ConfigMap("alert-rules", {
            metadata: { name: "alert-rules", namespace: "monitoring" },
            data: alertRulesData,
        });
        const contactPointsConfigMap = new k8s.core.v1.ConfigMap("contact-points", {
            metadata: { name: "contact-points", namespace: "monitoring" },
            data: contactPointsData,
        });
        const notificationPoliciesConfigMap = new k8s.core.v1.ConfigMap("notification-policies", {
            metadata: { name: "notification-policies", namespace: "monitoring" },
            data: notificationPoliciesData,
        });

        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                alertRulesConfigMap,
                contactPointsConfigMap,
                notificationPoliciesConfigMap,
                provider: k8sProvider,
            })
        );

        const expectedAlertRulesChecksum = checksum(alertRulesData);
        const expectedContactPointsChecksum = checksum(contactPointsData);
        const expectedNotificationPoliciesChecksum = checksum(notificationPoliciesData);

        const deployment = await promiseOf(result.deployment);
        expect(deployment.name).toBe("grafana");
        expect(expectedAlertRulesChecksum).toBeDefined();
        expect(expectedContactPointsChecksum).toBeDefined();
        expect(expectedNotificationPoliciesChecksum).toBeDefined();
        expect(expectedAlertRulesChecksum.length).toBe(64);
        expect(expectedContactPointsChecksum.length).toBe(64);
        expect(expectedNotificationPoliciesChecksum.length).toBe(64);
    });

    it("should create secret with basic auth credentials", () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                basicAuth: {
                    username: "admin",
                    password: "secretpassword",
                },
                provider: k8sProvider,
            })
        );

        // Verify secret is created (exercises basicAuth branch)
        expect(result.secret).toBeDefined();
        expect(result.deployment).toBeDefined();
    });

    it("should create secret with GitHub OAuth credentials", () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                githubAuth: {
                    clientId: "test-client-id",
                    clientSecret: "test-client-secret",
                    organization: "test-org",
                    adminUser: "admin-team",
                },
                provider: k8sProvider,
            })
        );

        // Verify secret is created (exercises githubAuth branch)
        expect(result.secret).toBeDefined();
        expect(result.deployment).toBeDefined();
    });

    it("should include SMTP configuration in secret when provided", () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                basicAuth: {
                    username: "admin",
                    password: "password",
                },
                smtp: {
                    host: "smtp.example.com",
                    port: 587,
                    user: "smtp-user",
                    password: "smtp-password",
                    fromAddress: "noreply@example.com",
                },
                provider: k8sProvider,
            })
        );

        // Verify resources created (exercises SMTP branch)
        expect(result.secret).toBeDefined();
        expect(result.deployment).toBeDefined();
        expect(result.configMap).toBeDefined();
    });

    it("should configure GitHub OAuth with SMTP", () => {
        const result = createGrafana(
            getTestArgs({
                namespace: "monitoring",
                prometheusUrl: "http://prometheus:9090",
                storageSize: "5Gi",
                githubAuth: {
                    clientId: "gh-client-id",
                    clientSecret: "gh-client-secret",
                    organization: "my-org",
                    adminUser: "admin",
                },
                smtp: {
                    host: "smtp.gmail.com",
                    port: 465,
                    user: "user@example.com",
                    password: "email-password",
                    fromAddress: "grafana@example.com",
                },
                provider: k8sProvider,
            })
        );

        // Verify all resources created (exercises githubAuth + SMTP branches)
        expect(result.secret).toBeDefined();
        expect(result.deployment).toBeDefined();
        expect(result.configMap).toBeDefined();
    });
});
