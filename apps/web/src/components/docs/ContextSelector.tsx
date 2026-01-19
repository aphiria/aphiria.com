"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Context } from "@/types/context";
import { setContextCookie } from "@/lib/cookies/context-cookie.client";
import { toggleContextVisibility } from "@/lib/context/toggler";

interface ContextSelectorProps {
    /** Initial context value from server */
    initialContext: Context;
}

/**
 * Context selector dropdown for switching between framework and library modes
 *
 * Client component that handles:
 * - Dropdown state
 * - Cookie updates
 * - URL updates (without reload)
 * - DOM visibility toggling
 */
export function ContextSelector({ initialContext }: ContextSelectorProps) {
    const [context, setContext] = useState<Context>(initialContext);
    const searchParams = useSearchParams();

    // Initialize context visibility and URL on mount
    useEffect(() => {
        toggleContextVisibility(initialContext);

        // If no context query param exists, add it to the URL
        const currentContext = searchParams.get("context");
        if (!currentContext) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("context", initialContext);
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState(
                { ...window.history.state, as: newUrl, url: newUrl },
                "",
                newUrl
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    const handleContextChange = (newContext: Context) => {
        // Update state
        setContext(newContext);

        // Update cookie
        setContextCookie(newContext);

        // Toggle DOM visibility
        toggleContextVisibility(newContext);

        // Update URL without triggering re-render
        const params = new URLSearchParams(searchParams.toString());
        params.set("context", newContext);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
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
