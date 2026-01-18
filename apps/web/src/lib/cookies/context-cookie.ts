import { getCookie, setCookie } from "cookies-next";
import { Context } from "@/types/context";

const COOKIE_NAME = "context";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Get the cookie domain from environment variable
 *
 * Defaults to .aphiria.com for k8s environments
 */
function getCookieDomain(): string {
    return process.env.NEXT_PUBLIC_COOKIE_DOMAIN || ".aphiria.com";
}

/**
 * Get the current context from cookie
 *
 * @returns Context value or null if not set
 */
export function getContextCookie(): Context | null {
    const value = getCookie(COOKIE_NAME);

    if (value === "framework" || value === "library") {
        return value;
    }

    return null;
}

/**
 * Set the context cookie
 *
 * @param context - Context value to set
 */
export function setContextCookie(context: Context): void {
    setCookie(COOKIE_NAME, context, {
        maxAge: COOKIE_MAX_AGE,
        path: "/",
        domain: getCookieDomain(),
        secure: true,
        sameSite: "lax",
    });
}
