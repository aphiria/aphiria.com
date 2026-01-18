/**
 * Load Prism language components
 * Matching apps/web/src/js/server-side/highlight-code.js line 9
 */
export declare function loadPrismLanguages(): void;
/**
 * Apply Prism.js syntax highlighting to HTML fragment
 * Replicates apps/web/src/js/server-side/highlight-code.js logic
 *
 * @param html - HTML fragment containing <pre><code> blocks
 * @returns HTML with highlighted code blocks and copy buttons
 */
export declare function highlightCode(html: string): string;
/**
 * Apply syntax highlighting to all compiled HTML files
 *
 * @param compiledFiles - Map of slug -> HTML content
 * @returns Map of slug -> highlighted HTML content
 */
export declare function highlightAllFiles(compiledFiles: Map<string, string>): Map<string, string>;
//# sourceMappingURL=syntax-highlighter.d.ts.map