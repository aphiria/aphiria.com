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
    // Start with initialContext to avoid flickering
    // Will be updated in useEffect based on query params/cookies
    const [context, setContext] = useState<Context>(initialContext);

    // Resolve actual context client-side on mount
    useEffect(() => {
        // 1. Check query param (using window.location to avoid useSearchParams)
        const urlParams = new URLSearchParams(window.location.search);
        const queryContext = urlParams.get("context");
        if (queryContext === "framework" || queryContext === "library") {
            setContext(queryContext);
            toggleContextVisibility(queryContext);
            return;
        }

        // 2. Check cookie
        const cookieContext = getCookie("context");
        if (cookieContext === "framework" || cookieContext === "library") {
            setContext(cookieContext as Context);
            toggleContextVisibility(cookieContext as Context);
            // Add to URL
            urlParams.set("context", cookieContext as string);
            const newUrl = `${window.location.pathname}?${urlParams.toString()}${window.location.hash}`;
            window.history.replaceState(
                { ...window.history.state, as: newUrl, url: newUrl },
                "",
                newUrl
            );
            return;
        }

        // 3. Use initialContext (already set in state)
        toggleContextVisibility(initialContext);
        // Add to URL
        urlParams.set("context", initialContext);
        const newUrl = `${window.location.pathname}?${urlParams.toString()}${window.location.hash}`;
        window.history.replaceState(
            { ...window.history.state, as: newUrl, url: newUrl },
            "",
            newUrl
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

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
