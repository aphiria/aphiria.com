import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { Context } from "@/types/context";

const COOKIE_NAME = "context";
const DEFAULT_CONTEXT: Context = "framework";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Type guard to validate context values
 */
function isValidContext(value: unknown): value is Context {
    return value === "framework" || value === "library";
}

/**
 * Resolves user's context preference from cookies, URL params, or default
 * Called server-side during page rendering
 *
 * Precedence: URL param > Cookie > Default
 *
 * NOTE: This function only READS state during SSR. Cookies are set client-side
 * when the user changes context, or via the useEffect in ContextSelector.
 *
 * @param cookieStore - Read-only cookie store from next/headers
 * @param searchParams - URL search parameters
 * @returns Validated context value ("framework" or "library")
 */
export async function resolveContext(
    cookieStore: ReadonlyRequestCookies,
    searchParams: URLSearchParams
): Promise<Context> {
    // Check URL parameter first (highest priority)
    const urlContext = searchParams.get("context");
    if (urlContext && isValidContext(urlContext)) {
        return urlContext;
    }

    // Check cookie (second priority)
    const cookieValue = cookieStore.get(COOKIE_NAME)?.value;
    if (cookieValue && isValidContext(cookieValue)) {
        return cookieValue;
    }

    // Default fallback
    return DEFAULT_CONTEXT;
}

/**
 * Sets the context cookie server-side
 *
 * @param context - Context value to set
 */
export async function setContextCookie(context: Context): Promise<void> {
    const cookieStore = await cookies();
    const cookieDomain = process.env.COOKIE_DOMAIN || "localhost";

    // Warn if using default
    if (!process.env.COOKIE_DOMAIN) {
        console.warn(
            `COOKIE_DOMAIN environment variable not set - using default: "${cookieDomain}"`
        );
    }

    cookieStore.set(COOKIE_NAME, context, {
        maxAge: COOKIE_MAX_AGE,
        path: "/",
        domain: cookieDomain,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: false, // Client needs to read for updates
    });
}

/**
 * Get the current context from cookie (server-side only)
 *
 * @returns Context value or null if not set
 */
export async function getContextCookie(): Promise<Context | null> {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    const value = cookie?.value;

    if (value === "framework" || value === "library") {
        return value;
    }

    return null;
}
