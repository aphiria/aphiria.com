import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createDashboards } from "../../src/components/dashboards";
import * as path from "path";
import { promiseOf } from "../test-utils";

describe("createDashboards", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create ConfigMap with name grafana-dashboards", async () => {
        const dashboardDir = path.join(__dirname, "../../dashboards");
        const result = createDashboards({
            namespace: "monitoring",
            dashboardDir,
            provider: k8sProvider,
        });

        expect(result.configMap).toBeDefined();

        const metadata = await promiseOf(result.configMap.metadata);
        expect(metadata.name).toBe("grafana-dashboards");
        expect(metadata.namespace).toBe("monitoring");
    });

    it("should create ConfigMap in monitoring namespace", async () => {
        const dashboardDir = path.join(__dirname, "../../dashboards");
        const result = createDashboards({
            namespace: "monitoring",
            dashboardDir,
            provider: k8sProvider,
        });

        const metadata = await promiseOf(result.configMap.metadata);
        expect(metadata.namespace).toBe("monitoring");
    });

    it("should include grafana_dashboard label for provisioning discovery", async () => {
        const dashboardDir = path.join(__dirname, "../../dashboards");
        const result = createDashboards({
            namespace: "monitoring",
            dashboardDir,
            provider: k8sProvider,
        });

        const metadata = await promiseOf(result.configMap.metadata);
        expect(metadata.labels).toBeDefined();
        expect(metadata.labels!["grafana_dashboard"]).toBe("1");
    });

    it("should include all dashboard JSON files as data entries", async () => {
        const dashboardDir = path.join(__dirname, "../../dashboards");
        const result = createDashboards({
            namespace: "monitoring",
            dashboardDir,
            provider: k8sProvider,
        });

        const data = await promiseOf(result.configMap.data);
        expect(data).toBeDefined();
        // Verify expected dashboard files are included
        expect(data!["cluster-overview.json"]).toBeDefined();
        expect(data!["resource-utilization.json"]).toBeDefined();
        expect(data!["api-performance.json"]).toBeDefined();
        expect(data!["error-rates.json"]).toBeDefined();
        expect(data!["namespace-service.json"]).toBeDefined();
    });

    it("should contain valid JSON content for dashboards", async () => {
        const dashboardDir = path.join(__dirname, "../../dashboards");
        const result = createDashboards({
            namespace: "monitoring",
            dashboardDir,
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
        const dashboardDir = path.join(__dirname, "../../dashboards");
        const result = createDashboards({
            namespace: "custom-monitoring",
            dashboardDir,
            provider: k8sProvider,
        });

        const metadata = await promiseOf(result.configMap.metadata);
        expect(metadata.namespace).toBe("custom-monitoring");
    });

    it("should include component labels", async () => {
        const dashboardDir = path.join(__dirname, "../../dashboards");
        const result = createDashboards({
            namespace: "monitoring",
            dashboardDir,
            provider: k8sProvider,
        });

        const metadata = await promiseOf(result.configMap.metadata);
        expect(metadata.labels).toBeDefined();
        expect(metadata.labels!["app.kubernetes.io/name"]).toBe("grafana-dashboards");
        expect(metadata.labels!["app.kubernetes.io/component"]).toBe("monitoring");
    });

    it("should throw error for invalid JSON files", () => {
        // Create a temporary directory with invalid JSON
        const tempDir = path.join(__dirname, "../../../dashboards-invalid-test");
        const fs = require("fs");

        try {
            // Create temp directory and invalid JSON file
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            fs.writeFileSync(path.join(tempDir, "invalid.json"), "{ invalid json }");

            // Expect createDashboards to throw
            expect(() => {
                createDashboards({
                    namespace: "monitoring",
                    dashboardDir: tempDir,
                    provider: k8sProvider,
                });
            }).toThrow(/Invalid JSON in dashboard file invalid.json/);
        } finally {
            // Clean up temp directory
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        }
    });
});
