import * as pulumi from "@pulumi/pulumi";
import {
    AppConfig,
    PostgreSQLConfig,
    PrometheusConfig,
    GrafanaConfig,
    GatewayConfig,
    NamespaceConfig,
    MonitoringConfig,
    ConfigOverrides,
    DeepPartial,
} from "./types";

/**
 * All configuration read from Pulumi config
 */
export interface Config {
    // Domain configuration
    app?: AppConfig;
    postgresql?: PostgreSQLConfig;
    prometheus?: PrometheusConfig;
    grafana?: GrafanaConfig;
    gateway?: GatewayConfig;
    namespace?: NamespaceConfig;
    monitoring?: MonitoringConfig;

    // Stack orchestration flags
    skipBaseInfrastructure?: boolean;
}

/**
 * Enable debug logging for config merge operations
 * Set PULUMI_DEBUG_MERGE=true to see what config values are being overridden
 */
const DEBUG_MERGE = process.env.PULUMI_DEBUG_MERGE === "true";

/**
 * Deep merges base configuration with overrides
 *
 * Merge strategy:
 * - Primitives (string, number, boolean): Override replaces base
 * - Arrays: Override replaces entire array (no element-wise merging)
 * - Objects: Recursively merge properties
 *
 * @param base - Base configuration object
 * @param overrides - Override values to apply
 * @param path - Current property path (for debug logging)
 * @returns Merged configuration
 * @internal - Exported for testing only
 */
export function deepMerge<T>(base: T, overrides: DeepPartial<T> | undefined, path = ""): T {
    if (!overrides) return base;

    const result = { ...base };

    for (const key in overrides) {
        const overrideValue = overrides[key];
        const baseValue = base[key];
        const currentPath = path ? `${path}.${String(key)}` : String(key);

        if (Array.isArray(overrideValue)) {
            // Arrays: replace entirely (don't merge elements)
            if (DEBUG_MERGE) {
                const baseArray = Array.isArray(baseValue) ? baseValue : [];
                console.log(
                    `[MERGE] ${currentPath}: [${baseArray.length} items] -> [${overrideValue.length} items] (array replaced)`
                );
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result[key] = overrideValue as any;
        } else if (
            overrideValue &&
            typeof overrideValue === "object" &&
            !Array.isArray(overrideValue)
        ) {
            // Objects: recurse (leaf values will log)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result[key] = deepMerge(baseValue as any, overrideValue as any, currentPath);
        } else if (overrideValue !== undefined) {
            // Primitives: replace
            if (DEBUG_MERGE && baseValue !== overrideValue) {
                console.log(`[MERGE] ${currentPath}: ${baseValue} -> ${overrideValue}`);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result[key] = overrideValue as any;
        }
    }

    return result;
}

/**
 * Loads all configuration from Pulumi config with stack-specific overrides
 *
 * This function centralizes all Pulumi config reading in one place,
 * making it the only function that needs a Pulumi runtime environment.
 * All other code (factories, stack-factory) can be tested by passing
 * in config objects directly.
 *
 * Configuration merge strategy:
 * 1. Base config is read from Pulumi.yaml (e.g., config.app.value)
 * 2. Stack overrides are read from Pulumi.{stack}.yaml under 'overrides' key
 * 3. Deep merge applies overrides to base config
 *
 * Example:
 * # Pulumi.yaml
 * config:
 *   app:
 *     value:
 *       web: { replicas: 3, image: "prod-image" }
 *
 * # Pulumi.local.yaml
 * config:
 *   aphiria-com-infrastructure:overrides:
 *     app:
 *       web: { replicas: 1 }  # Only override replicas, keep image from base
 *
 * @returns Merged configuration for the current stack
 */
export function loadConfig(): Config {
    const config = new pulumi.Config("aphiria-com-infrastructure");

    // Load stack-specific overrides (optional)
    const overrides = config.getObject<ConfigOverrides>("overrides") || {};

    return {
        // Domain configuration - merge base with overrides
        app: deepMerge(config.getObject<AppConfig>("app"), overrides.app),
        postgresql: deepMerge(
            config.getObject<PostgreSQLConfig>("postgresql"),
            overrides.postgresql
        ),
        prometheus: deepMerge(
            config.getObject<PrometheusConfig>("prometheus"),
            overrides.prometheus
        ),
        grafana: deepMerge(config.getObject<GrafanaConfig>("grafana"), overrides.grafana),
        gateway: deepMerge(config.getObject<GatewayConfig>("gateway"), overrides.gateway),
        namespace: deepMerge(config.getObject<NamespaceConfig>("namespace"), overrides.namespace),
        monitoring: deepMerge(
            config.getObject<MonitoringConfig>("monitoring"),
            overrides.monitoring
        ),

        // Stack orchestration flags (no overrides needed)
        skipBaseInfrastructure: config.getBoolean("skipBaseInfrastructure"),
    };
}
