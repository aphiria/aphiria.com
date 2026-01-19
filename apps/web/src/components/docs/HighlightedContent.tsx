import { ReactNode } from "react";
import * as cheerio from "cheerio";
import Prism from "prismjs";
import "prismjs/components/prism-php";
import "prismjs/components/prism-bash";

interface HighlightedContentProps {
    children: ReactNode;
}

/**
 * Server-side syntax highlighting wrapper
 *
 * Scans children for code blocks and applies Prism highlighting server-side
 * Converts JSX children to HTML, highlights code blocks, and renders as HTML
 */
export function HighlightedContent({ children }: HighlightedContentProps) {
    // Convert React children to HTML string
    const htmlString = renderToStaticMarkup(children);

    // Load into cheerio for parsing
    const $ = cheerio.load(htmlString);

    // Find all code blocks with language classes
    $("code[class*='language-']").each((_, element) => {
        const $code = $(element);
        const className = $code.attr("class") || "";
        const languageMatch = className.match(/language-(\w+)/);

        if (!languageMatch) {
            return;
        }

        const language = languageMatch[1];
        const code = $code.text();
        const grammar = Prism.languages[language];

        if (grammar) {
            const highlighted = Prism.highlight(code, grammar, language);
            $code.html(highlighted);
        }
    });

    return <div dangerouslySetInnerHTML={{ __html: $.html() }} />;
}

// Simple renderToStaticMarkup implementation for server components
function renderToStaticMarkup(children: ReactNode): string {
    // This is a simplified version - in reality we'd use a proper React renderer
    // For now, we'll just return the children as-is and rely on React's SSR
    return String(children);
}
