"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Context } from "@/types/context";
import { setContextCookie } from "@/lib/cookies/context-cookie";
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
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize context visibility on mount
    useEffect(() => {
        toggleContextVisibility(context);
    }, []);

    const handleContextChange = (newContext: Context) => {
        // Update state
        setContext(newContext);

        // Update cookie
        setContextCookie(newContext);

        // Toggle DOM visibility
        toggleContextVisibility(newContext);

        // Update URL without reload
        const params = new URLSearchParams(searchParams.toString());
        params.set("context", newContext);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    return (
        <select
            id="context-selector"
            value={context}
            onChange={(e) => handleContextChange(e.target.value as Context)}
        >
            <option value="framework">Framework</option>
            <option value="library">Library</option>
        </select>
    );
}
