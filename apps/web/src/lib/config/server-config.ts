/**
 * Server-side runtime configuration from environment variables
 */

export interface RuntimeConfig {
    apiUri: string;
    cookieDomain: string;
    appEnv: string;
}

/**
 * Get runtime configuration (server-side only)
 *
 * @returns Runtime configuration with defaults for missing values
 */
export function getServerConfig(): RuntimeConfig {
    const apiUri = process.env.API_URI || "http://localhost:8080";
    const cookieDomain = process.env.COOKIE_DOMAIN || "localhost";
    const appEnv = process.env.APP_ENV || "development";

    if (!process.env.API_URI) {
        console.warn(`API_URI environment variable not set - using default: "${apiUri}"`);
    }

    if (!process.env.COOKIE_DOMAIN) {
        console.warn(
            `COOKIE_DOMAIN environment variable not set - using default: "${cookieDomain}"`
        );
    }

    if (!process.env.APP_ENV) {
        console.warn(`APP_ENV environment variable not set - using default: "${appEnv}"`);
    }

    return {
        apiUri,
        cookieDomain,
        appEnv,
    };
}
