import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createGrafana } from "../../src/components/grafana";
import { checksum } from "../../src/components/utils";
import { promiseOf } from "../test-utils";

describe("createGrafana", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create all required Grafana resources", async () => {
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
    });

    it("should create production environment with email alerting", async () => {
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

        const deployment = await promiseOf(result.deployment);
        expect(deployment.name).toBe("grafana");
        expect(deployment.namespace).toBe("monitoring");
    });

    it("should create preview environment without email alerting", async () => {
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

        const cm = await promiseOf(result.configMap);
        expect(cm.name).toBe("grafana-config");
    });

    it("should create local environment without email alerting", async () => {
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

        const secret = await promiseOf(result.secret);
        expect(secret.name).toBe("grafana-secrets");
    });

    it("should create PVC with correct storage size", async () => {
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

        const pvc = await promiseOf(result.pvc);
        expect(pvc.name).toBe("grafana-pvc");
        expect(pvc.namespace).toBe("monitoring");
    });

    it("should configure GitHub OAuth with correct organization", async () => {
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
    });

    it("should apply custom labels to resources", async () => {
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

        const svc = await promiseOf(result.service);
        expect(svc.name).toBe("grafana");
    });

    it("should configure service with port 80", async () => {
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

        const svc = await promiseOf(result.service);
        expect(svc.namespace).toBe("monitoring");
    });

    it("should configure production with SMTP but no email if smtpHost missing", async () => {
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
    });

    it("should handle production with full SMTP configuration", async () => {
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

        const secret = await promiseOf(result.secret);
        expect(secret.name).toBe("grafana-secrets");
        expect(secret.namespace).toBe("monitoring");
    });

    it("should handle production with partial SMTP configuration (missing optional fields)", async () => {
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

        const deployment = await promiseOf(result.deployment);
        expect(deployment.name).toBe("grafana");
        expect(expectedChecksum).toBeDefined();
        expect(expectedChecksum.length).toBe(64);
    });

    it("should not add checksum annotation when dashboards ConfigMap not provided", async () => {
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

        const deployment = await promiseOf(result.deployment);
        expect(deployment.name).toBe("grafana");
    });

    it("should configure basic auth when credentials provided", async () => {
        const result = createGrafana({
            env: "preview",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "2Gi",
            githubClientId: "client-id",
            githubClientSecret: "client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            basicAuthUser: "admin",
            basicAuthPassword: "secure-password",
            provider: k8sProvider,
        });

        const secret = await promiseOf(result.secret);
        expect(secret.name).toBe("grafana-secrets");
    });

    it("should use GitHub OAuth when basic auth not provided", async () => {
        const result = createGrafana({
            env: "preview",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "2Gi",
            githubClientId: "client-id",
            githubClientSecret: "client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            provider: k8sProvider,
        });

        const secret = await promiseOf(result.secret);
        expect(secret.name).toBe("grafana-secrets");
    });

    it("should create deployment with basic auth configuration", async () => {
        const result = createGrafana({
            env: "preview",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "2Gi",
            githubClientId: "client-id",
            githubClientSecret: "client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            basicAuthUser: "admin",
            basicAuthPassword: "secure-password",
            provider: k8sProvider,
        });

        const deployment = await promiseOf(result.deployment);
        expect(deployment.name).toBe("grafana");
        expect(deployment.namespace).toBe("monitoring");
    });

    it("should create deployment with GitHub OAuth configuration", async () => {
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

        const result = createGrafana({
            env: "production",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: "client-id",
            githubClientSecret: "client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            alertRulesConfigMap,
            contactPointsConfigMap,
            notificationPoliciesConfigMap,
            provider: k8sProvider,
        });

        expect(result.deployment).toBeDefined();
    });

    it("should mount only alertRulesConfigMap when other ConfigMaps are not provided", async () => {
        const alertRulesConfigMap = new k8s.core.v1.ConfigMap("alert-rules", {
            metadata: { name: "alert-rules", namespace: "monitoring" },
            data: { "alert-rules.yaml": "test" },
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
            alertRulesConfigMap,
            provider: k8sProvider,
        });

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

        const result = createGrafana({
            env: "production",
            namespace: "monitoring",
            prometheusUrl: "http://prometheus:9090",
            storageSize: "5Gi",
            githubClientId: "client-id",
            githubClientSecret: "client-secret",
            githubOrg: "aphiria",
            adminUser: "davidbyoung",
            alertRulesConfigMap,
            contactPointsConfigMap,
            notificationPoliciesConfigMap,
            provider: k8sProvider,
        });

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
});
