import { describe, it, expect, beforeAll } from "@jest/globals";
import * as k8s from "@pulumi/kubernetes";
import { createGrafanaAlerts } from "../../../src/components/monitoring/grafana-alerts";
import { promiseOf } from "../../test-utils";

describe("createGrafanaAlerts", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    // Helper function to create production contact points
    const getProductionContactPoints = () => [
        {
            name: "email-admin",
            receivers: [
                {
                    uid: "email-admin",
                    type: "email",
                    settings: {
                        addresses: "admin@aphiria.com",
                        singleEmail: true,
                    },
                    disableResolveMessage: false,
                },
            ],
        },
        {
            name: "discard",
            receivers: [
                {
                    uid: "discard-receiver",
                    type: "webhook",
                    settings: {
                        url: "http://localhost:9999",
                    },
                    disableResolveMessage: true,
                },
            ],
        },
    ];

    // Helper function to create preview/local contact points
    const getPreviewContactPoints = () => [
        {
            name: "local-notifications",
            receivers: [
                {
                    uid: "local-notifications",
                    type: "email",
                    settings: {
                        addresses: "devnull@localhost",
                    },
                    disableResolveMessage: true,
                },
            ],
        },
    ];

    it("should create ConfigMap for alert rules provisioning", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        expect(result.alertRulesConfigMap).toBeDefined();

        const [name, namespace] = await Promise.all([
            promiseOf(result.alertRulesConfigMap.metadata.name),
            promiseOf(result.alertRulesConfigMap.metadata.namespace),
        ]);

        expect(name).toBe("grafana-alert-rules");
        expect(namespace).toBe("monitoring");
    });

    it("should create ConfigMap for contact points provisioning", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        expect(result.contactPointsConfigMap).toBeDefined();

        const [name, namespace] = await Promise.all([
            promiseOf(result.contactPointsConfigMap.metadata.name),
            promiseOf(result.contactPointsConfigMap.metadata.namespace),
        ]);

        expect(name).toBe("grafana-contact-points");
        expect(namespace).toBe("monitoring");
    });

    it("should create ConfigMap for notification policies provisioning", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        expect(result.notificationPoliciesConfigMap).toBeDefined();

        const [name, namespace] = await Promise.all([
            promiseOf(result.notificationPoliciesConfigMap.metadata.name),
            promiseOf(result.notificationPoliciesConfigMap.metadata.namespace),
        ]);

        expect(name).toBe("grafana-notification-policies");
        expect(namespace).toBe("monitoring");
    });

    it("should include HighCPUUsage alert rule", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.alertRulesConfigMap.data);
        expect(data).toBeDefined();
        expect(data["alert-rules.yaml"]).toBeDefined();

        const rulesYaml = data["alert-rules.yaml"];
        expect(rulesYaml).toContain("High CPU Usage");
        expect(rulesYaml).toContain("uid: high_cpu_usage");
        expect(rulesYaml).toContain("expr: rate(container_cpu_usage_seconds_total[5m])");
        expect(rulesYaml).toContain("expression: B");
        expect(rulesYaml).toContain("params:");
        expect(rulesYaml).toContain("- 0.8");
        expect(rulesYaml).toContain("10m");
    });

    it("should include HighMemoryUsage alert rule", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.alertRulesConfigMap.data);
        const rulesYaml = data["alert-rules.yaml"];

        expect(rulesYaml).toContain("High Memory Usage");
        expect(rulesYaml).toContain("uid: high_memory_usage");
        expect(rulesYaml).toContain(
            "expr: container_memory_working_set_bytes / container_spec_memory_limit_bytes"
        );
        expect(rulesYaml).toContain("expression: B");
        expect(rulesYaml).toContain("- 0.9");
        expect(rulesYaml).toContain("10m");
    });

    it("should include HighAPILatency alert rule", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.alertRulesConfigMap.data);
        const rulesYaml = data["alert-rules.yaml"];

        expect(rulesYaml).toContain("High API Latency");
        expect(rulesYaml).toContain("uid: high_api_latency");
        expect(rulesYaml).toContain(
            'histogram_quantile(0.95, sum(rate(app_http_request_duration_seconds_bucket{job="api"}[5m])) by (le))'
        );
        expect(rulesYaml).toContain("- 1");
        expect(rulesYaml).toContain("5m");
    });

    it("should include HighAPI4xxRate alert rule", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.alertRulesConfigMap.data);
        const rulesYaml = data["alert-rules.yaml"];

        expect(rulesYaml).toContain("High API 4xx Rate");
        expect(rulesYaml).toContain("uid: high_api_4xx_rate");
        expect(rulesYaml).toContain('rate(app_http_requests_total{job="api",status=~"4.."}[5m])');
        expect(rulesYaml).toContain("- 0.1");
        expect(rulesYaml).toContain("5m");
    });

    it("should include HighAPI5xxRate alert rule", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.alertRulesConfigMap.data);
        const rulesYaml = data["alert-rules.yaml"];

        expect(rulesYaml).toContain("High API 5xx Rate");
        expect(rulesYaml).toContain("uid: high_api_5xx_rate");
        expect(rulesYaml).toContain('rate(app_http_requests_total{job="api",status=~"5.."}[5m])');
        expect(rulesYaml).toContain("- 0.05");
        expect(rulesYaml).toContain("5m");
    });

    it("should include PodCrashLooping alert rule", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.alertRulesConfigMap.data);
        const rulesYaml = data["alert-rules.yaml"];

        expect(rulesYaml).toContain("Pod Crash Looping");
        expect(rulesYaml).toContain("uid: pod_crash_looping");
        expect(rulesYaml).toContain(
            'kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"}'
        );
        expect(rulesYaml).toContain("5m");
    });

    it("should include PodFailed alert rule", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.alertRulesConfigMap.data);
        const rulesYaml = data["alert-rules.yaml"];

        expect(rulesYaml).toContain("Pod Failed");
        expect(rulesYaml).toContain("uid: pod_failed");
        expect(rulesYaml).toContain('kube_pod_status_phase{phase="Failed"}');
        expect(rulesYaml).toContain("1m");
    });

    it("should configure email contact point for production environment", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.contactPointsConfigMap.data);
        const contactPointsYaml = data["contact-points.yaml"];

        expect(contactPointsYaml).toContain("email");
        expect(contactPointsYaml).toContain("admin@aphiria.com");
        expect(contactPointsYaml).toContain("email-admin");
    });

    it("should configure default email contact point for preview environment", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "preview",
            contactPoints: getPreviewContactPoints(),
            defaultReceiver: "local-notifications",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.contactPointsConfigMap.data);
        const contactPointsYaml = data["contact-points.yaml"];

        // Preview should use local-notifications (won't send without SMTP)
        expect(contactPointsYaml).not.toContain("admin@aphiria.com");
        expect(contactPointsYaml).toContain("name: local-notifications");
        expect(contactPointsYaml).toContain("devnull@localhost");
    });

    it("should configure default email contact point for local environment", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "local",
            contactPoints: getPreviewContactPoints(),
            defaultReceiver: "local-notifications",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.contactPointsConfigMap.data);
        const contactPointsYaml = data["contact-points.yaml"];

        // Local should use local-notifications (won't send without SMTP)
        expect(contactPointsYaml).not.toContain("admin@aphiria.com");
        expect(contactPointsYaml).toContain("name: local-notifications");
        expect(contactPointsYaml).toContain("devnull@localhost");
    });

    it("should include environment label in alert rules", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.alertRulesConfigMap.data);
        const rulesYaml = data["alert-rules.yaml"];

        expect(rulesYaml).toContain("environment");
        expect(rulesYaml).toContain("production");
    });

    it("should add grafana_alert label to all ConfigMaps", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        const [rulesLabels, contactPointsLabels, policiesLabels] = await Promise.all([
            promiseOf(result.alertRulesConfigMap.metadata.apply((m) => m.labels)),
            promiseOf(result.contactPointsConfigMap.metadata.apply((m) => m.labels)),
            promiseOf(result.notificationPoliciesConfigMap.metadata.apply((m) => m.labels)),
        ]);

        expect(rulesLabels).toMatchObject({ grafana_alert: "1" });
        expect(contactPointsLabels).toMatchObject({ grafana_alert: "1" });
        expect(policiesLabels).toMatchObject({ grafana_alert: "1" });
    });

    it("should create valid Grafana provisioning YAML structure", async () => {
        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints: getProductionContactPoints(),
            defaultReceiver: "email-admin",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.alertRulesConfigMap.data);
        const rulesYaml = data["alert-rules.yaml"];

        // Grafana provisioning requires apiVersion
        expect(rulesYaml).toContain("apiVersion:");
        expect(rulesYaml).toContain("groups:");
    });

    it("should handle contact point receivers without disableResolveMessage", async () => {
        const contactPoints = [
            {
                name: "test-receiver",
                receivers: [
                    {
                        uid: "test-uid",
                        type: "email",
                        settings: {
                            addresses: "test@example.com",
                        },
                        // disableResolveMessage intentionally omitted (undefined)
                    },
                ],
            },
        ];

        const result = createGrafanaAlerts({
            namespace: "monitoring",
            environment: "production",
            contactPoints,
            defaultReceiver: "test-receiver",
            provider: k8sProvider,
        });

        const data = await promiseOf(result.contactPointsConfigMap.data);
        const contactPointsYaml = data["contact-points.yaml"];

        // Should not include disableResolveMessage when undefined
        expect(contactPointsYaml).toContain("test@example.com");
        expect(contactPointsYaml).toContain("type: email");
        // Verify it doesn't add disableResolveMessage when undefined
        const receiverSection = contactPointsYaml.split("receivers:")[1].split("- orgId:")[0];
        expect(receiverSection).not.toContain("disableResolveMessage");
    });
});
