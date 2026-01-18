"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPrismLanguages = loadPrismLanguages;
exports.highlightCode = highlightCode;
exports.highlightAllFiles = highlightAllFiles;
const jsdom_1 = require("jsdom");
const prismjs_1 = __importDefault(require("prismjs"));
const index_js_1 = __importDefault(require("prismjs/components/index.js"));
/**
 * Load Prism language components
 * Matching apps/web/src/js/server-side/highlight-code.js line 9
 */
function loadPrismLanguages() {
    (0, index_js_1.default)(['apacheconf', 'bash', 'http', 'json', 'markup', 'nginx', 'php', 'xml', 'yaml']);
}
/**
 * Apply Prism.js syntax highlighting to HTML fragment
 * Replicates apps/web/src/js/server-side/highlight-code.js logic
 *
 * @param html - HTML fragment containing <pre><code> blocks
 * @returns HTML with highlighted code blocks and copy buttons
 */
function highlightCode(html) {
    loadPrismLanguages();
    const dom = new jsdom_1.JSDOM(html);
    const document = dom.window.document;
    const codeBlocks = document.querySelectorAll('pre > code');
    codeBlocks.forEach(codeBlock => {
        const codeElement = codeBlock;
        let languageClass = Array.from(codeElement.classList).find(cls => cls.startsWith('language-'));
        // Default to PHP (matching highlight-code.js line 20)
        let lang = languageClass ? languageClass.replace('language-', '') : 'php';
        if (!languageClass) {
            languageClass = 'language-php';
            codeElement.classList.add(languageClass);
        }
        // Apply Prism highlighting if language is supported
        const grammar = prismjs_1.default.languages[lang];
        if (grammar) {
            const code = codeElement.textContent || '';
            const highlighted = prismjs_1.default.highlight(code, grammar, lang);
            codeElement.innerHTML = highlighted;
            // Ensure <pre> has the same language class (line 32-34)
            const preElement = codeElement.parentElement;
            if (preElement && preElement.tagName.toLowerCase() === 'pre' && !preElement.classList.contains(languageClass)) {
                preElement.classList.add(languageClass);
            }
            // Add Copy button unless <pre> has 'no-copy' class (line 37-48)
            if (preElement && !preElement.classList.contains('no-copy')) {
                const buttonWrapper = document.createElement('div');
                buttonWrapper.className = 'button-wrapper';
                const copyButton = document.createElement('button');
                copyButton.className = 'copy-button';
                copyButton.title = 'Copy to clipboard';
                copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"></path></svg>';
                buttonWrapper.appendChild(copyButton);
                preElement.insertBefore(buttonWrapper, preElement.firstChild);
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
function highlightAllFiles(compiledFiles) {
    const highlightedFiles = new Map();
    for (const [slug, html] of compiledFiles) {
        highlightedFiles.set(slug, highlightCode(html));
    }
    return highlightedFiles;
}
//# sourceMappingURL=syntax-highlighter.js.map