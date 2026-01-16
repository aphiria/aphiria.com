import * as pulumi from "@pulumi/pulumi";
import {
    AppConfig,
    PostgreSQLConfig,
    PrometheusConfig,
    GrafanaConfig,
    GatewayConfig,
    NamespaceConfig,
    MonitoringConfig,
    ClusterConfig,
    ConfigOverrides,
    DeepPartial,
} from "./types";

/**
 * All configuration read from Pulumi config
 */
export interface Config {
    // Infrastructure configuration
    cluster?: ClusterConfig;

    // Application configuration
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
 * Deep merges base configuration with overrides
 *
 * Merge strategy:
 * - Primitives (string, number, boolean): Override replaces base
 * - Arrays: Override replaces entire array (no element-wise merging)
 * - Objects: Recursively merge properties
 *
 * @param base - Base configuration object
 * @param overrides - Override values to apply
 * @returns Merged configuration
 * @internal - Exported for testing only
 */
export function deepMerge<T>(base: T, overrides: DeepPartial<T> | undefined): T {
    if (!overrides) return base;

    const result = { ...base };

    for (const key in overrides) {
        const overrideValue = overrides[key];
        const baseValue = base[key];

        if (Array.isArray(overrideValue)) {
            // Arrays: replace entirely (don't merge elements)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result[key] = overrideValue as any;
        } else if (
            overrideValue &&
            typeof overrideValue === "object" &&
            !Array.isArray(overrideValue)
        ) {
            // Objects: recurse
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result[key] = deepMerge(baseValue as any, overrideValue as any);
        } else if (overrideValue !== undefined) {
            // Primitives: replace
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
 * 4. Validate merged config matches environment requirements
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
 * @returns Merged and validated configuration for the current stack
 * @throws Error if configuration is invalid for the current stack
 */
export function loadConfig(): Config {
    const config = new pulumi.Config("aphiria-com-infrastructure");

    // Load stack-specific overrides (optional)
    const overrides = config.getObject<ConfigOverrides>("overrides") || {};

    const mergedConfig: Config = {
        // Infrastructure configuration - merge base with overrides
        cluster: deepMerge(config.getObject<ClusterConfig>("cluster"), overrides.cluster),

        // Application configuration - merge base with overrides
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

    // Validate configuration matches stack requirements
    const stackName = pulumi.getStack();
    validateConfig(stackName, mergedConfig);

    return mergedConfig;
}

/**
 * Validates that configuration matches the requirements for the given stack
 *
 * @param stackName - The Pulumi stack name (e.g., "production", "preview-base", "preview-pr-123", "local")
 * @param config - The merged configuration to validate
 * @throws Error if configuration is invalid for the stack
 * @internal - Exported for testing only
 */
export function validateConfig(stackName: string, config: Config): void {
    const errors: string[] = [];

    if (stackName === "production") {
        // Production: requires full infrastructure
        if (!config.cluster) errors.push("cluster configuration is required for production");
        if (!config.app) errors.push("app configuration is required for production");
        if (!config.postgresql) errors.push("postgresql configuration is required for production");
        if (!config.prometheus) errors.push("prometheus configuration is required for production");
        if (!config.grafana) errors.push("grafana configuration is required for production");
        if (!config.gateway) {
            errors.push("gateway configuration is required for production");
        } else if (!config.gateway.dns) {
            errors.push("gateway.dns configuration is required for production (DNS records)");
        }
        if (!config.monitoring) errors.push("monitoring configuration is required for production");
        if (config.namespace) {
            errors.push(
                "namespace configuration should not be present in production (uses default)"
            );
        }
        if (config.skipBaseInfrastructure) {
            errors.push(
                "skipBaseInfrastructure should not be set in production (always provisions infrastructure)"
            );
        }
    } else if (stackName === "preview-base") {
        // Preview-base: shared infrastructure for all PRs
        if (!config.cluster) errors.push("cluster configuration is required for preview-base");
        if (!config.postgresql)
            errors.push("postgresql configuration is required for preview-base");
        if (!config.prometheus)
            errors.push("prometheus configuration is required for preview-base");
        if (!config.grafana) errors.push("grafana configuration is required for preview-base");
        if (!config.gateway) {
            errors.push("gateway configuration is required for preview-base");
        } else if (!config.gateway.dns) {
            errors.push("gateway.dns configuration is required for preview-base (wildcard DNS)");
        }
        if (!config.monitoring)
            errors.push("monitoring configuration is required for preview-base");
        if (config.app) {
            errors.push(
                "app configuration should not be present in preview-base (no app deployments)"
            );
        }
        if (config.namespace) {
            errors.push("namespace configuration should not be present in preview-base");
        }
        if (config.skipBaseInfrastructure) {
            errors.push(
                "skipBaseInfrastructure should not be set in preview-base (provisions infrastructure)"
            );
        }
    } else if (stackName.startsWith("preview-pr-")) {
        // Preview-PR: per-PR isolated environment
        if (!config.namespace) {
            errors.push("namespace configuration is required for preview-pr (resource isolation)");
        } else if (!config.namespace.name) {
            errors.push("namespace.name is required for preview-pr");
        }
        if (!config.app) errors.push("app configuration is required for preview-pr");
        if (!config.postgresql) {
            errors.push("postgresql configuration is required for preview-pr");
        } else {
            if (!config.postgresql.createDatabase) {
                errors.push("postgresql.createDatabase must be true for preview-pr");
            }
            if (!config.postgresql.databaseName) {
                errors.push("postgresql.databaseName is required for preview-pr");
            }
        }
        if (!config.prometheus) errors.push("prometheus configuration is required for preview-pr");
        if (!config.skipBaseInfrastructure) {
            errors.push(
                "skipBaseInfrastructure must be true for preview-pr (uses preview-base infrastructure)"
            );
        }
        if (config.cluster) {
            errors.push(
                "cluster configuration should not be present in preview-pr (uses preview-base cluster)"
            );
        }
        if (config.gateway) {
            errors.push(
                "gateway configuration should not be present in preview-pr (uses preview-base gateway)"
            );
        }
        if (config.grafana) {
            errors.push(
                "grafana configuration should not be present in preview-pr (uses preview-base grafana)"
            );
        }
        if (config.monitoring) {
            errors.push(
                "monitoring configuration should not be present in preview-pr (uses preview-base monitoring)"
            );
        }
    } else if (stackName === "local") {
        // Local: minikube development environment
        if (!config.app) errors.push("app configuration is required for local");
        if (!config.postgresql) errors.push("postgresql configuration is required for local");
        if (!config.prometheus) errors.push("prometheus configuration is required for local");
        if (!config.grafana) errors.push("grafana configuration is required for local");
        if (!config.gateway) errors.push("gateway configuration is required for local");
        if (!config.monitoring) errors.push("monitoring configuration is required for local");
        if (config.cluster) {
            errors.push(
                "cluster configuration should not be present in local (uses minikube or existing cluster)"
            );
        }
        if (config.namespace) {
            errors.push("namespace configuration should not be present in local (uses default)");
        }
    } else {
        errors.push(
            `Unknown stack: ${stackName}. Expected one of: production, preview-base, preview-pr-*, local`
        );
    }

    if (errors.length > 0) {
        throw new Error(
            `Configuration validation failed for stack "${stackName}":\n` +
                errors.map((e) => `  - ${e}`).join("\n")
        );
    }
}
