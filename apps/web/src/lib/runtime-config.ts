/**
 * Runtime configuration for client components
 *
 * Server-side environment variables are injected into window.__RUNTIME_CONFIG__
 * via an inline script in layout.tsx. This allows the same Docker image to work
 * across all environments (local, preview, production) with runtime configuration.
 */

export interface RuntimeConfig {
    apiUri: string;
    cookieDomain: string;
    appEnv: string;
}

// Extend Window interface for TypeScript
declare global {
    interface Window {
        __RUNTIME_CONFIG__?: RuntimeConfig;
    }
}

/**
 * Get runtime configuration (client-side only)
 *
 * Injected via inline script in layout.tsx from server environment variables.
 * This allows the same static build to work across environments.
 *
 * @returns Runtime configuration or development defaults
 */
export function getRuntimeConfig(): RuntimeConfig {
    // Server-side or config not loaded: return development defaults
    if (typeof window === "undefined" || !window.__RUNTIME_CONFIG__) {
        return {
            apiUri: "http://localhost:8080",
            cookieDomain: "localhost",
            appEnv: "development",
        };
    }

    return window.__RUNTIME_CONFIG__;
}
