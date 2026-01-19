import { describe, it, expect, beforeAll } from "vitest";
import * as k8s from "@pulumi/kubernetes";
import { createDashboards } from "../../src/components/dashboards";
import { promiseOf } from "../test-utils";

describe("createDashboards", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    const sampleDashboard = JSON.stringify({
        uid: "test-dashboard",
        title: "Test Dashboard",
        panels: [],
    });

    it("should create ConfigMap with name grafana-dashboards", async () => {
        const dashboards = { "test.json": sampleDashboard };
        const result = createDashboards({
            namespace: "monitoring",
            dashboards,
            provider: k8sProvider,
        });

        expect(result.configMap).toBeDefined();

        const metadata = await promiseOf(result.configMap.metadata);
        expect(metadata.name).toBe("grafana-dashboards");
        expect(metadata.namespace).toBe("monitoring");
    });

    it("should create ConfigMap in monitoring namespace", async () => {
        const dashboards = { "test.json": sampleDashboard };
        const result = createDashboards({
            namespace: "monitoring",
            dashboards,
            provider: k8sProvider,
        });

        const metadata = await promiseOf(result.configMap.metadata);
        expect(metadata.namespace).toBe("monitoring");
    });

    it("should include grafana_dashboard label for provisioning discovery", async () => {
        const dashboards = { "test.json": sampleDashboard };
        const result = createDashboards({
            namespace: "monitoring",
            dashboards,
            provider: k8sProvider,
        });

        const metadata = await promiseOf(result.configMap.metadata);
        expect(metadata.labels).toBeDefined();
        expect(metadata.labels!["grafana_dashboard"]).toBe("1");
    });

    it("should include all dashboard JSON files as data entries", async () => {
        const dashboards = {
            "cluster-overview.json": sampleDashboard,
            "resource-utilization.json": sampleDashboard,
            "api-performance.json": sampleDashboard,
        };
        const result = createDashboards({
            namespace: "monitoring",
            dashboards,
            provider: k8sProvider,
        });

        const data = await promiseOf(result.configMap.data);
        expect(data).toBeDefined();
        // Verify expected dashboard files are included
        expect(data!["cluster-overview.json"]).toBeDefined();
        expect(data!["resource-utilization.json"]).toBeDefined();
        expect(data!["api-performance.json"]).toBeDefined();
    });

    it("should contain valid JSON content for dashboards", async () => {
        const dashboards = { "test.json": sampleDashboard };
        const result = createDashboards({
            namespace: "monitoring",
            dashboards,
            provider: k8sProvider,
        });

        const data = await promiseOf(result.configMap.data);
        expect(data).toBeDefined();

        // Test that each dashboard is valid JSON
        Object.keys(data!).forEach((filename) => {
            expect(() => JSON.parse(data![filename])).not.toThrow();

            // Verify basic Grafana dashboard structure
            const dashboard = JSON.parse(data![filename]);
            expect(dashboard.uid).toBeDefined();
            expect(dashboard.title).toBeDefined();
            expect(dashboard.panels).toBeDefined();
            expect(Array.isArray(dashboard.panels)).toBe(true);
        });
    });

    it("should handle custom namespace", async () => {
        const dashboards = { "test.json": sampleDashboard };
        const result = createDashboards({
            namespace: "custom-monitoring",
            dashboards,
            provider: k8sProvider,
        });

        const metadata = await promiseOf(result.configMap.metadata);
        expect(metadata.namespace).toBe("custom-monitoring");
    });

    it("should include component labels", async () => {
        const dashboards = { "test.json": sampleDashboard };
        const result = createDashboards({
            namespace: "monitoring",
            dashboards,
            provider: k8sProvider,
        });

        const metadata = await promiseOf(result.configMap.metadata);
        expect(metadata.labels).toBeDefined();
        expect(metadata.labels!["app.kubernetes.io/name"]).toBe("grafana-dashboards");
        expect(metadata.labels!["app.kubernetes.io/component"]).toBe("monitoring");
    });

    it("should throw error for invalid JSON content", () => {
        const invalidDashboards = {
            "invalid.json": "{ invalid json }",
        };

        // Expect createDashboards to throw
        expect(() => {
            createDashboards({
                namespace: "monitoring",
                dashboards: invalidDashboards,
                provider: k8sProvider,
            });
        }).toThrow(/Invalid JSON in dashboard invalid.json/);
    });
});
