import { NextRequest, NextResponse } from "next/server";
import { createRedirectUrl } from "@/lib/routing/redirects";

/**
 * Next.js proxy for URL redirects
 *
 * Handles:
 * - Legacy .html URLs → extension-less URLs (301)
 * - /docs → /docs/1.x/introduction (302)
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

    return NextResponse.next();
}

/**
 * Configure proxy to run only on specific routes
 */
export const config = {
    matcher: ["/docs/:path*.html", "/docs"],
};
