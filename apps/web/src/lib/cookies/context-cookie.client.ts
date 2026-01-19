import { setCookie } from "cookies-next";
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
 * Set the context cookie (client-side)
 *
 * @param context - Context value to set
 */
export function setContextCookie(context: Context): void {
    const domain = getCookieDomain();

    setCookie(COOKIE_NAME, context, {
        maxAge: COOKIE_MAX_AGE,
        path: "/",
        domain,
        secure: domain !== "localhost", // Secure everywhere except localhost
        sameSite: "lax",
    });
}
