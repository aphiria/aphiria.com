import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";
import * as path from "path";
import { buildLabels } from "../labels";

export interface DashboardsArgs {
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Directory containing dashboard JSON files */
    dashboardDir: string;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

export interface DashboardsResult {
    configMap: k8s.core.v1.ConfigMap;
}

/**
 * Creates Grafana dashboard provisioning ConfigMap
 *
 * Reads all .json files from dashboardDir and creates a ConfigMap that Grafana
 * will auto-discover and provision via the grafana_dashboard="1" label.
 *
 * IMPORTANT: The Grafana deployment must include a checksum annotation based on
 * this ConfigMap's data to trigger pod restarts when dashboards change. Without
 * the checksum annotation, dashboard updates require manual pod deletion.
 */
export function createDashboards(args: DashboardsArgs): DashboardsResult {
    const labels = {
        ...buildLabels("grafana-dashboards", "monitoring", args.labels),
        grafana_dashboard: "1", // Grafana sidecar discovery label
    };

    // Read all dashboard JSON files from the specified directory
    const dashboardData: Record<string, string> = {};

    const files = fs.readdirSync(args.dashboardDir);
    files.forEach((filename) => {
        if (path.extname(filename) === ".json") {
            const filePath = path.join(args.dashboardDir, filename);
            const content = fs.readFileSync(filePath, "utf-8");

            // Validate JSON syntax
            try {
                JSON.parse(content);
                dashboardData[filename] = content;
            } catch (error) {
                throw new Error(`Invalid JSON in dashboard file ${filename}: ${error}`);
            }
        }
    });

    // Create ConfigMap with all dashboard files
    const configMap = new k8s.core.v1.ConfigMap(
        "grafana-dashboards",
        {
            metadata: {
                name: "grafana-dashboards",
                namespace: args.namespace,
                labels,
            },
            data: dashboardData,
        },
        { provider: args.provider }
    );

    return {
        configMap,
    };
}
