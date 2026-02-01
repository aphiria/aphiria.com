import { cookies } from "next/headers";
import type { Theme } from "@/types/theme";
import { COOKIE_NAME, DEFAULT_THEME } from "@/lib/theme/constants";

const cookieMaxAge = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Type guard to validate theme values
 */
function isValidTheme(value: unknown): value is Theme {
    return value === "light" || value === "dark";
}

/**
 * Sets the theme cookie server-side
 *
 * @param theme - Theme value to set
 */
export async function setThemeCookie(theme: Theme): Promise<void> {
    const cookieStore = await cookies();
    const cookieDomain = process.env.COOKIE_DOMAIN || "localhost";

    // Warn if using default
    if (!process.env.COOKIE_DOMAIN) {
        console.warn(
            `COOKIE_DOMAIN environment variable not set - using default: "${cookieDomain}"`
        );
    }

    cookieStore.set(COOKIE_NAME, theme, {
        maxAge: cookieMaxAge,
        path: "/",
        domain: cookieDomain,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: false, // Client needs to read for updates
    });
}

/**
 * Get the current theme from cookie (server-side only)
 *
 * @returns Theme value or null if not set
 */
export async function getThemeCookie(): Promise<Theme | null> {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    const value = cookie?.value;

    if (isValidTheme(value)) {
        return value;
    }

    return null;
}

/**
 * Resolves user's theme preference from cookie or default
 * Called server-side during page rendering
 *
 * @returns Validated theme value ("light" or "dark")
 */
export async function resolveTheme(): Promise<Theme> {
    const theme = await getThemeCookie();
    return theme ?? DEFAULT_THEME;
}
