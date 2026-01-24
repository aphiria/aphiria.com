"use client";

import { useState, useEffect, useMemo } from "react";
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
 * - Local state for instant UI updates (no network calls)
 * - URL updated via history.replaceState (no navigation)
 * - Cookie syncs from state for persistence
 * - Visibility toggles instantly via DOM manipulation
 */
export function ContextSelector({ initialContext }: ContextSelectorProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Derive initial context from URL on each navigation
    const urlDerivedContext = useMemo(() => {
        const urlContext = searchParams.get("context");
        return urlContext === "library"
            ? "library"
            : urlContext === "framework"
              ? "framework"
              : initialContext;
    }, [searchParams, initialContext]);

    // Local state tracks current context (may differ from URL during user interaction)
    const [context, setContext] = useState<Context>(urlDerivedContext);

    // Sync state when URL changes (from navigation)
    useEffect(() => {
        setContext(urlDerivedContext);
    }, [urlDerivedContext]);

    // Update visibility and cookie whenever context changes
    useEffect(() => {
        setContextCookie(context);
        toggleContextVisibility(context);
    }, [context]);

    const handleContextChange = (newContext: Context) => {
        // Update local state (triggers visibility toggle via effect)
        setContext(newContext);

        // Update URL without navigation
        const url = new URL(window.location.href);
        url.searchParams.set("context", newContext);
        window.history.replaceState({}, "", url.toString());
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
