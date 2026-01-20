import { DeepPartial } from "./config";
import { ClusterConfig, NamespaceConfig, MonitoringConfig } from "./kubernetes";
import { PostgreSQLConfig } from "./database";
import { AppConfig } from "./application";
import { GatewayConfig } from "./networking";
import { PrometheusConfig, GrafanaConfig } from "./monitoring";

/**
 * Configuration overrides structure
 *
 * Used for stack-specific config overrides via the 'overrides' key in Pulumi.{stack}.yaml
 * Each property is a deep partial of the corresponding config type, allowing selective
 * override of nested properties without duplicating the entire config object.
 */
export interface ConfigOverrides {
    cluster?: DeepPartial<ClusterConfig>;
    app?: DeepPartial<AppConfig>;
    postgresql?: DeepPartial<PostgreSQLConfig>;
    prometheus?: DeepPartial<PrometheusConfig>;
    grafana?: DeepPartial<GrafanaConfig>;
    gateway?: DeepPartial<GatewayConfig>;
    namespace?: DeepPartial<NamespaceConfig>;
    monitoring?: DeepPartial<MonitoringConfig>;
}
