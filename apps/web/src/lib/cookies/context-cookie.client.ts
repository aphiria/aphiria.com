import { setCookie } from "cookies-next";
import { Context } from "@/types/context";
import { getRuntimeConfig } from "@/lib/runtime-config";

const COOKIE_NAME = "context";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Set the context cookie (client-side)
 *
 * @param context - Context value to set
 */
export function setContextCookie(context: Context): void {
    const config = getRuntimeConfig();
    const domain = config.cookieDomain;

    setCookie(COOKIE_NAME, context, {
        maxAge: COOKIE_MAX_AGE,
        path: "/",
        domain,
        secure: domain !== "localhost", // Secure everywhere except localhost
        sameSite: "lax",
    });
}
