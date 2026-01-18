import { Context } from "@/types/context";
import { getContextCookie } from "@/lib/cookies/context-cookie";

/**
 * Resolve context with precedence: query param > cookie > default
 *
 * @param searchParams - URL search parameters
 * @returns Resolved context value
 */
export function resolveContext(searchParams: URLSearchParams | Record<string, string | string[] | undefined>): Context {
    // Check query parameter first
    const queryContext = searchParams instanceof URLSearchParams
        ? searchParams.get("context")
        : searchParams.context;

    if (queryContext === "framework" || queryContext === "library") {
        return queryContext;
    }

    // Fall back to cookie
    const cookieContext = getContextCookie();
    if (cookieContext === "framework" || cookieContext === "library") {
        return cookieContext;
    }

    // Default to framework
    return "framework";
}
