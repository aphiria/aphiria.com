import Prism from "prismjs";
import * as cheerio from "cheerio";

// Load language components (order matters - dependencies first)
import "prismjs/components/prism-markup-templating"; // Required by PHP
import "prismjs/components/prism-php";
import "prismjs/components/prism-bash";

/**
 * Server-side syntax highlighting using Prism
 *
 * Scans HTML for code blocks with language-* classes and highlights them
 */
export function highlightCode(html: string): string {
    const $ = cheerio.load(html, { decodeEntities: false });

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

        if (!grammar) {
            console.warn(`Prism grammar not found for language: ${language}`);
            return;
        }

        try {
            const highlighted = Prism.highlight(code, grammar, language);
            $code.html(highlighted);

            // Add language class to parent <pre> element
            const $pre = $code.parent("pre");
            if ($pre.length) {
                $pre.addClass(`language-${language}`);
            }
        } catch (error) {
            console.error(`Failed to highlight code for language ${language}:`, error);
        }
    });

    return $.html();
}
