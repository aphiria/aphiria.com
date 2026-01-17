import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { buildLabels } from "./labels";

export interface DashboardsArgs {
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Dashboard definitions (filename -> JSON content) */
    dashboards: Record<string, string>;
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
 * Accepts dashboard JSON content and creates a ConfigMap that Grafana
 * will auto-discover and provision via the grafana_dashboard="1" label.
 *
 * IMPORTANT: The Grafana deployment must include a checksum annotation based on
 * this ConfigMap's data to trigger pod restarts when dashboards change. Without
 * the checksum annotation, dashboard updates require manual pod deletion.
 *
 * @param args - Dashboard configuration including content and namespace
 * @returns ConfigMap metadata
 */
export function createDashboards(args: DashboardsArgs): DashboardsResult {
    const labels = {
        ...buildLabels("grafana-dashboards", "monitoring", args.labels),
        grafana_dashboard: "1", // Grafana sidecar discovery label
    };

    // Validate all dashboard JSON
    Object.entries(args.dashboards).forEach(([filename, content]) => {
        try {
            JSON.parse(content);
        } catch (error) {
            throw new Error(`Invalid JSON in dashboard ${filename}: ${error}`);
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
            data: args.dashboards,
        },
        { provider: args.provider }
    );

    return {
        configMap,
    };
}
