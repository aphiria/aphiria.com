interface ContextStyleInjectorProps {
    context: "framework" | "library";
}

/**
 * Server component that renders context-specific CSS into <head>
 *
 * This prevents flicker by hiding context-specific content during SSR.
 * The <style> tag is rendered directly in <head> by Next.js.
 */
export function ContextStyleInjector({ context }: ContextStyleInjectorProps) {
    const css =
        context === "framework"
            ? ".context-library { display: none; }"
            : ".context-framework { display: none; }";

    return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
