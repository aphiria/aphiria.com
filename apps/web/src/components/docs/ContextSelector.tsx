"use client";

import { useState, useEffect } from "react";
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
 * - Dropdown state (initialized from server-resolved context)
 * - Cookie updates when user changes selection
 * - DOM visibility toggling
 *
 * SSR: Context is resolved server-side and passed via initialContext prop.
 * This eliminates flicker by ensuring server and client render the same value.
 */
export function ContextSelector({ initialContext }: ContextSelectorProps) {
    // Use server-resolved context directly (no client-side resolution needed)
    const [context, setContext] = useState<Context>(initialContext);

    // Apply DOM visibility on mount and when context changes
    useEffect(() => {
        toggleContextVisibility(context);
    }, [context])

    const handleContextChange = (newContext: Context) => {
        // Update state (useEffect will handle DOM visibility toggle)
        setContext(newContext);

        // Persist to cookie
        setContextCookie(newContext);
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
