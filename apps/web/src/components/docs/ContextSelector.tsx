"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Context } from "@/types/context";
import { setContextCookie, getContextCookie } from "@/lib/cookies/context-cookie.client";
import { toggleContextVisibility } from "@/lib/context/toggler";

interface ContextSelectorProps {
    /** Initial context value from URL param */
    initialContext: Context;
}

/**
 * Context selector dropdown for switching between framework and library modes
 *
 * Client component that handles:
 * - Reading context from URL (single source of truth)
 * - Cookie → URL sync on initial load
 * - Cookie updates when user changes selection
 * - DOM visibility toggling
 * - Updating all doc link hrefs when context changes
 *
 * SSR: Context is read from URL param server-side for cacheability.
 */
export function ContextSelector({ initialContext }: ContextSelectorProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Derive context from URL (single source of truth)
    const urlContext = searchParams.get("context");
    const context: Context = (urlContext === "library" ? "library" : "framework");

    // On mount: sync cookie to URL if no URL param
    useEffect(() => {
        const urlContext = searchParams.get("context");
        const cookieContext = getContextCookie();

        // If no URL param but cookie exists, navigate to URL with cookie context
        if (!urlContext && cookieContext) {
            const url = new URL(window.location.href);
            url.searchParams.set("context", cookieContext);
            router.replace(url.pathname + url.search);
        }
    }, []);

    // Update visibility and links when URL context changes
    useEffect(() => {
        // Update cookie to match URL
        setContextCookie(context);

        // Toggle visibility
        toggleContextVisibility(context);

        // Update all internal doc links to use current context
        document.querySelectorAll("a[href]").forEach((link) => {
            const anchor = link as HTMLAnchorElement;
            try {
                const linkUrl = new URL(anchor.href, window.location.origin);

                // Only modify internal doc links
                if (linkUrl.origin === window.location.origin && linkUrl.pathname.startsWith("/docs/")) {
                    linkUrl.searchParams.set("context", context);
                    anchor.href = linkUrl.toString();
                }
            } catch {
                // Ignore invalid URLs
            }
        });
    }, [pathname, searchParams, context]);

    const handleContextChange = (newContext: Context) => {
        // Persist to cookie
        setContextCookie(newContext);

        // Navigate to current page with new context (client-side, no reload)
        const url = new URL(window.location.href);
        url.searchParams.set("context", newContext);
        router.push(url.pathname + url.search);
    };

    return (
        <label htmlFor="context-selector" title="Choose the context to view the documentation with">
            Context:{" "}
            <select
                id="context-selector"
                value={context}
                onChange={(e) => handleContextChange(e.target.value as Context)}
            >
                <option value="framework">Framework</option>
                <option value="library">Library</option>
            </select>
        </label>
    );
}
