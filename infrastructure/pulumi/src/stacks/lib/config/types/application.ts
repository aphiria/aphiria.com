import { ResourceRequirements } from "./config";

/**
 * Web application configuration
 */
export interface WebAppConfig {
    url: string;
    cookieDomain: string;
    replicas: number;
    image: string;
    resources: ResourceRequirements;
    podDisruptionBudget?: {
        minAvailable: number;
    };
}

/**
 * API application configuration
 */
export interface APIAppConfig {
    url: string;
    logLevel: string;
    replicas: number;
    image: string;
    resources: {
        initContainer: ResourceRequirements;
        nginx: ResourceRequirements;
        php: ResourceRequirements;
    };
    podDisruptionBudget?: {
        minAvailable: number;
    };
}

/**
 * Database migration job configuration
 */
export interface MigrationConfig {
    resources: {
        migration: ResourceRequirements;
        initContainer: ResourceRequirements;
    };
}

/**
 * Application configuration (web, API, migration)
 */
export interface AppConfig {
    imagePullPolicy: string;
    web: WebAppConfig;
    api: APIAppConfig;
    migration: MigrationConfig;
}
