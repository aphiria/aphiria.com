"use client";

import { useState, useEffect } from "react";
import { getCookie } from "cookies-next";
import { Context } from "@/types/context";
import { setContextCookie } from "@/lib/cookies/context-cookie.client";
import { toggleContextVisibility } from "@/lib/context/toggler";

interface ContextSelectorProps {
    /** Initial context value from server (fallback only) */
    initialContext: Context;
}

/**
 * Context selector dropdown for switching between framework and library modes
 *
 * Client component that handles:
 * - Context resolution (query param → cookie → default)
 * - Dropdown state
 * - Cookie updates
 * - URL updates (without reload)
 * - DOM visibility toggling
 */
export function ContextSelector({ initialContext }: ContextSelectorProps) {
    // Start with initialContext to match server-rendered HTML (prevent hydration mismatch)
    // Client-side effect will update from URL/cookies after hydration
    const [context, setContext] = useState<Context>(initialContext);

    // Sync state from URL params and cookies on mount (after hydration completes)
    useEffect(() => {
        // Check URL params first
        const urlParams = new URLSearchParams(window.location.search);
        const queryContext = urlParams.get("context");
        if (queryContext === "framework" || queryContext === "library") {
            setContext(queryContext);
            // Set cookie so it persists across navigation
            setContextCookie(queryContext);
            return;
        }

        // Check cookie second
        const cookieContext = getCookie("context");
        if (cookieContext === "framework" || cookieContext === "library") {
            setContext(cookieContext as Context);
            return;
        }

        // Use initialContext (already set in useState)
        // Set cookie to persist the default
        setContextCookie(initialContext);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Side effects: toggle DOM visibility and sync URL
    useEffect(() => {
        // Toggle context visibility in DOM
        toggleContextVisibility(context);

        // Sync context to URL if not already present
        const urlParams = new URLSearchParams(window.location.search);
        const currentUrlContext = urlParams.get("context");
        if (currentUrlContext !== context) {
            urlParams.set("context", context);
            const newUrl = `${window.location.pathname}?${urlParams.toString()}${window.location.hash}`;
            window.history.replaceState(
                { ...window.history.state, as: newUrl, url: newUrl },
                "",
                newUrl
            );
        }
    }, [context]); // Run when context changes

    const handleContextChange = (newContext: Context) => {
        // Update state
        setContext(newContext);

        // Update cookie
        setContextCookie(newContext);

        // Toggle DOM visibility
        toggleContextVisibility(newContext);

        // Update URL without triggering re-render (preserve existing params and hash)
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set("context", newContext);
        const newUrl = `${window.location.pathname}?${urlParams.toString()}${window.location.hash}`;
        window.history.replaceState(
            { ...window.history.state, as: newUrl, url: newUrl },
            "",
            newUrl
        );
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
