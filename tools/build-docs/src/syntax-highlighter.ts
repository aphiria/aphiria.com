import { JSDOM } from "jsdom";
import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";

/**
 * Track whether languages have been loaded
 */
let languagesLoaded = false;

/**
 * Load Prism language components
 */
export function loadPrismLanguages(): void {
    if (!languagesLoaded) {
        loadLanguages([
            "apacheconf",
            "bash",
            "http",
            "json",
            "markup",
            "nginx",
            "php",
            "xml",
            "yaml",
        ]);
        languagesLoaded = true;
    }
}

/**
 * Apply Prism.js syntax highlighting to HTML fragment
 * Replicates apps/web/src/js/server-side/highlight-code.js logic
 *
 * @param html - HTML fragment containing <pre><code> blocks
 * @returns HTML with highlighted code blocks and copy buttons
 */
export function highlightCode(html: string): string {
    loadPrismLanguages();

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const codeBlocks = document.querySelectorAll("pre > code");

    codeBlocks.forEach((codeBlock) => {
        const codeElement = codeBlock as HTMLElement;
        let languageClass = Array.from(codeElement.classList).find((cls) =>
            cls.startsWith("language-")
        );

        // Default to PHP (matching highlight-code.js line 20)
        let lang = languageClass ? languageClass.replace("language-", "") : "php";

        if (!languageClass) {
            languageClass = "language-php";
            codeElement.classList.add(languageClass);
        }

        // Apply Prism highlighting if language is supported
        const grammar = Prism.languages[lang];
        if (grammar) {
            const code = codeElement.textContent || "";
            const highlighted = Prism.highlight(code, grammar, lang);
            codeElement.innerHTML = highlighted;

            // Ensure <pre> has the same language class (line 32-34)
            const preElement = codeElement.parentElement as HTMLElement;
            if (
                preElement &&
                preElement.tagName.toLowerCase() === "pre" &&
                !preElement.classList.contains(languageClass)
            ) {
                preElement.classList.add(languageClass);
            }
        }
    });

    // Return serialized HTML body content (matching line 52)
    return dom.window.document.body.innerHTML;
}

/**
 * Apply syntax highlighting to all compiled HTML files
 *
 * @param compiledFiles - Map of slug -> HTML content
 * @returns Map of slug -> highlighted HTML content
 */
export function highlightAllFiles(compiledFiles: Map<string, string>): Map<string, string> {
    const highlightedFiles = new Map<string, string>();

    for (const [slug, html] of compiledFiles) {
        highlightedFiles.set(slug, highlightCode(html));
    }

    return highlightedFiles;
}
