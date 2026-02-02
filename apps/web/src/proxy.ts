import { NextRequest, NextResponse } from "next/server";
import { createRedirectUrl } from "@/lib/routing/redirects";
import { parseContext } from "@/lib/context/resolver";

/**
 * Next.js proxy for URL redirects and query param injection
 *
 * Handles:
 * - Legacy .html URLs → extension-less URLs (301)
 * - /docs → /docs/1.x/introduction (302)
 * - /docs/* without ?context= → adds ?context=framework (or cookie value)
 */
export default function proxy(request: NextRequest) {
    const url = request.nextUrl;

    // Redirect /docs to /docs/1.x/introduction
    if (url.pathname === "/docs") {
        return NextResponse.redirect(new URL("/docs/1.x/introduction", request.url), 302);
    }

    // Redirect .html URLs to extension-less equivalents (301 permanent)
    if (url.pathname.endsWith(".html")) {
        const redirectUrl = createRedirectUrl(url);
        return NextResponse.redirect(new URL(redirectUrl, request.url), 301);
    }

    // Ensure all /docs/* URLs have explicit ?context= parameter
    if (url.pathname.startsWith("/docs/") && !url.searchParams.has("context")) {
        const contextCookie = request.cookies.get("context");
        const contextValue = parseContext(contextCookie?.value);

        const redirectUrl = url.clone();
        redirectUrl.searchParams.set("context", contextValue);

        return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
}

/**
 * Configure proxy to run on /docs routes
 */
export const config = {
    matcher: ["/docs/:path*"],
};
