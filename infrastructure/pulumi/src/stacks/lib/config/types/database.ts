import { ResourceRequirements } from "./config";

/**
 * PostgreSQL database configuration
 */
export interface PostgreSQLConfig {
    version: string;
    persistentStorage: boolean;
    user: string;
    password: string; // Secret - wrap with pulumi.secret()
    storageSize: string;
    useHostPath: boolean;
    hostPath?: string;
    host: string;
    resources: ResourceRequirements;
    createDatabase?: boolean;
    databaseName?: string;
}
