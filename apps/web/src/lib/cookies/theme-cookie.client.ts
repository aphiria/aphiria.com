import { setCookie, getCookie } from "cookies-next";
import type { Theme } from "@/types/theme";
import { COOKIE_NAME } from "@/lib/theme/constants";
import { getRuntimeConfig } from "@/lib/runtime-config";

const cookieMaxAge = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Get the theme cookie (client-side)
 *
 * @returns Theme value from cookie or null if not set
 */
export function getThemeCookie(): Theme | null {
    const value = getCookie(COOKIE_NAME);

    if (value === "light" || value === "dark") {
        return value;
    }

    return null;
}

/**
 * Set the theme cookie (client-side)
 *
 * @param theme - Theme value to set
 */
export function setThemeCookie(theme: Theme): void {
    const config = getRuntimeConfig();
    const domain = config.cookieDomain;

    setCookie(COOKIE_NAME, theme, {
        maxAge: cookieMaxAge,
        path: "/",
        domain,
        secure: domain !== "localhost", // Secure everywhere except localhost
        sameSite: "lax",
    });
}
