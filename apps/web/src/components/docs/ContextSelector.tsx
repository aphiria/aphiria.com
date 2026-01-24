"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Context } from "@/types/context";
import { setContextCookie } from "@/lib/cookies/context-cookie.client";
import { toggleContextVisibility } from "@/lib/context/toggler";

interface ContextSelectorProps {
    /** Initial context value from URL param */
    initialContext: Context;
}

/**
 * Context selector dropdown for switching between framework and library modes
 *
 * Strategy:
 * - State derives from URL param on every render (single source of truth)
 * - Dropdown change updates URL via history.pushState + forces re-render
 * - Cookie syncs from state for persistence
 * - DOM updates (visibility, links) happen on state change
 */
export function ContextSelector({ initialContext }: ContextSelectorProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Derive context from current URL (or use initialContext as fallback)
    const urlContext = searchParams.get("context");
    const context: Context =
        urlContext === "library"
            ? "library"
            : urlContext === "framework"
              ? "framework"
              : initialContext;

    // Note: Middleware ensures all /docs/* URLs have ?context= param
    // No client-side redirect needed

    // Update visibility and cookie whenever context changes
    useEffect(() => {
        // Save to cookie
        setContextCookie(context);

        // Toggle visibility
        toggleContextVisibility(context);
    }, [context, pathname]);

    const handleContextChange = (newContext: Context) => {
        // Update URL and force page navigation to ensure Next.js updates
        const url = new URL(window.location.href);
        url.searchParams.set("context", newContext);
        window.location.href = url.toString();
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
