import { ReactNode } from "react";

interface ContextStyleInjectorProps {
    context: "framework" | "library";
    children: ReactNode;
}

/**
 * Wrapper component that applies context-specific visibility via data attribute
 *
 * Combined with CSS in aphiria.css ([data-context="framework"] .context-library { display: none; }),
 * this hides context-specific content during SSR without flicker and with valid HTML.
 */
export function ContextStyleInjector({ context, children }: ContextStyleInjectorProps) {
    return <div data-context={context}>{children}</div>;
}
