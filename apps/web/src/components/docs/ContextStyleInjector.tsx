"use client";

import { useEffect } from "react";

interface ContextStyleInjectorProps {
    context: "framework" | "library";
}

/**
 * Client component that injects context-specific CSS into <head>
 *
 * This prevents flicker by hiding context-specific content based on URL param.
 * Must be client component to access document.head, but executes synchronously
 * on hydration to minimize visual flicker.
 */
export function ContextStyleInjector({ context }: ContextStyleInjectorProps) {
    useEffect(() => {
        const styleId = "context-visibility-css";
        const existingStyle = document.getElementById(styleId);

        // Generate CSS to hide non-active context content
        const css =
            context === "framework"
                ? ".context-library { display: none; }"
                : ".context-framework { display: none; }";

        if (existingStyle) {
            // Update existing style element
            existingStyle.textContent = css;
        } else {
            // Create new style element in <head>
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = css;
            document.head.appendChild(style);
        }
    }, [context]);

    return null;
}
