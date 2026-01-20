import { Context } from "@/types/context";
import { getContextCookie } from "@/lib/cookies/context-cookie.server";

/**
 * Resolve context with precedence: query param > cookie > default
 *
 * @param searchParams - URL search parameters
 * @returns Resolved context value
 */
export async function resolveContext(
    searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): Promise<Context> {
    // Check query parameter first
    const queryContext =
        searchParams instanceof URLSearchParams
            ? searchParams.get("context")
            : searchParams.context;

    if (queryContext === "framework" || queryContext === "library") {
        return queryContext;
    }

    // Fall back to cookie
    const cookieContext = await getContextCookie();
    if (cookieContext === "framework" || cookieContext === "library") {
        return cookieContext;
    }

    // Default to framework
    return "framework";
}
