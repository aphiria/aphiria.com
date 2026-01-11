import * as pulumi from "@pulumi/pulumi";
import {
    AppConfig,
    PostgreSQLConfig,
    PrometheusConfig,
    GrafanaConfig,
    GatewayConfig,
    NamespaceConfig,
    MonitoringConfig,
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
 * Loads all configuration from Pulumi config
 *
 * This function centralizes all Pulumi config reading in one place,
 * making it the only function that needs a Pulumi runtime environment.
 * All other code (factories, stack-factory) can be tested by passing
 * in config objects directly.
 *
 * @returns All configuration objects
 */
export function loadConfig(): Config {
    const config = new pulumi.Config();

    return {
        // Domain configuration
        app: config.getObject<AppConfig>("app"),
        postgresql: config.getObject<PostgreSQLConfig>("postgresql"),
        prometheus: config.getObject<PrometheusConfig>("prometheus"),
        grafana: config.getObject<GrafanaConfig>("grafana"),
        gateway: config.getObject<GatewayConfig>("gateway"),
        namespace: config.getObject<NamespaceConfig>("namespace"),
        monitoring: config.getObject<MonitoringConfig>("monitoring"),

        // Stack orchestration flags
        skipBaseInfrastructure: config.getBoolean("skipBaseInfrastructure"),
    };
}
