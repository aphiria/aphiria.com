import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import * as fs from "fs";
import * as path from "path";

/**
 * Configure marked for documentation compilation
 * - GFM tables support
 * - Preserve heading IDs (mangle: false)
 * - Allow raw HTML (sanitize: false) for embedded <div>, <h1>, etc.
 * - Transform .md links to extension-less URLs
 */
export function configureMarked(): void {
    // Add GFM heading ID extension for stable anchor generation
    marked.use(
        gfmHeadingId({
            prefix: "", // No prefix on IDs
        })
    );

    // Transform .md links to extension-less URLs using walkTokens
    // walkTokens is called for every token before rendering (tokens passed by reference)
    marked.use({
        walkTokens(token) {
            if (token.type === "link") {
                // Transform .md links to extension-less (e.g., dependency-injection.md#binders -> dependency-injection#binders)
                if (token.href && (token.href.endsWith(".md") || token.href.includes(".md#"))) {
                    token.href = token.href.replace(/\.md(#|$)/, "$1");
                }
            }
        },
    });

    // Configure marked options
    // GFM (GitHub Flavored Markdown) is enabled by default in marked v12+
    // gfmHeadingId extension handles ID generation with mangle: false by default
    marked.setOptions({
        breaks: false, // Don't convert \n to <br>
    });
}

/**
 * Compile markdown to HTML
 * Note: Markdown files already include <h1 id="doc-title"> - we just parse them as-is
 */
export async function compileMarkdownWithDocTitle(markdown: string): Promise<string> {
    return await marked.parse(markdown);
}

/**
 * Reset the marked configuration (needed for tests to have independent state)
 */
export function resetMarked(): void {
    marked.setOptions(marked.getDefaults());
}

/**
 * Compile a single markdown file to HTML fragment
 *
 * @param markdownPath - Path to markdown file
 * @returns HTML fragment (NOT a full document - no <html>, <body>, etc.)
 */
export async function compileMarkdown(markdownPath: string): Promise<string> {
    const markdown = fs.readFileSync(markdownPath, "utf-8");

    // Parse and render to HTML
    const html = await marked.parse(markdown);

    return html;
}

/**
 * Compile all markdown files in a directory
 *
 * @param inputDir - Directory containing markdown files
 * @param outputDir - Directory for HTML output
 * @param version - Documentation version (e.g., "1.x")
 * @param verbose - Enable verbose logging
 * @returns Map of slug -> HTML content
 */
export async function compileAllMarkdown(
    inputDir: string,
    outputDir: string,
    version: string,
    verbose: boolean = false
): Promise<Map<string, string>> {
    configureMarked();

    const compiledFiles = new Map<string, string>();

    // Find all .md files
    const files = fs.readdirSync(inputDir).filter((f) => f.endsWith(".md"));

    if (verbose) {
        console.log(`Found ${files.length} markdown files in ${inputDir}`);
    }

    // Compile each file
    for (const file of files) {
        const markdownPath = path.join(inputDir, file);
        const slug = path.basename(file, ".md");

        if (verbose) {
            console.log(`  Compiling ${file} -> ${slug}.html`);
        }

        const html = await compileMarkdown(markdownPath);
        compiledFiles.set(slug, html);

        // Write HTML fragment to output
        const versionDir = path.join(outputDir, "rendered", version);
        fs.mkdirSync(versionDir, { recursive: true });

        const outputPath = path.join(versionDir, `${slug}.html`);
        fs.writeFileSync(outputPath, html, "utf-8");
    }

    if (verbose) {
        console.log(`Compiled ${compiledFiles.size} files to ${outputDir}/rendered/${version}/`);
    }

    return compiledFiles;
}
