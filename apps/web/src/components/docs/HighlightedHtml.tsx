import { ReactNode } from "react";
import { highlightCode } from "@/lib/prism/highlighter";

interface HighlightedHtmlProps {
    children: ReactNode;
}

/**
 * Server component that renders children as HTML and highlights code blocks
 *
 * Works identically to docs: converts React children to HTML string,
 * runs Prism highlighting server-side, then renders the highlighted HTML
 */
export async function HighlightedHtml({ children }: HighlightedHtmlProps) {
    // Dynamically import renderToStaticMarkup only on server
    const { renderToStaticMarkup } = await import("react-dom/server");

    // Render React children to HTML string (server-side)
    const htmlString = renderToStaticMarkup(<>{children}</>);

    // Highlight code blocks server-side
    const highlighted = highlightCode(htmlString);

    // Render highlighted HTML
    return <div dangerouslySetInnerHTML={{ __html: highlighted }} />;
}
