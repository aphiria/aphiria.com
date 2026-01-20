/**
 * Core configuration type definitions
 */

/**
 * Resource limits and requests for Kubernetes containers
 */
export interface ResourceRequirements {
    requests: {
        cpu: string;
        memory: string;
    };
    limits: {
        cpu: string;
        memory: string;
    };
}

/**
 * Utility type for creating deep partial types (all properties optional at all nesting levels)
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
