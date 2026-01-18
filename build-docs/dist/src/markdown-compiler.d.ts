/**
 * Configure marked for documentation compilation
 * - GFM tables support
 * - Preserve heading IDs (mangle: false)
 * - Allow raw HTML (sanitize: false) for embedded <div>, <h1>, etc.
 */
export declare function configureMarked(): void;
/**
 * Compile markdown to HTML
 * Note: Markdown files already include <h1 id="doc-title"> - we just parse them as-is
 */
export declare function compileMarkdownWithDocTitle(markdown: string): Promise<string>;
/**
 * Reset the marked configuration (needed for tests to have independent state)
 */
export declare function resetMarked(): void;
/**
 * Compile a single markdown file to HTML fragment
 *
 * @param markdownPath - Path to markdown file
 * @returns HTML fragment (NOT a full document - no <html>, <body>, etc.)
 */
export declare function compileMarkdown(markdownPath: string): Promise<string>;
/**
 * Compile all markdown files in a directory
 *
 * @param inputDir - Directory containing markdown files
 * @param outputDir - Directory for HTML output
 * @param version - Documentation version (e.g., "1.x")
 * @param verbose - Enable verbose logging
 * @returns Map of slug -> HTML content
 */
export declare function compileAllMarkdown(inputDir: string, outputDir: string, version: string, verbose?: boolean): Promise<Map<string, string>>;
//# sourceMappingURL=markdown-compiler.d.ts.map