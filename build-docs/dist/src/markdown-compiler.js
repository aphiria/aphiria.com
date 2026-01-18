"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureMarked = configureMarked;
exports.compileMarkdownWithDocTitle = compileMarkdownWithDocTitle;
exports.resetMarked = resetMarked;
exports.compileMarkdown = compileMarkdown;
exports.compileAllMarkdown = compileAllMarkdown;
const marked_1 = require("marked");
const marked_gfm_heading_id_1 = require("marked-gfm-heading-id");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Configure marked for documentation compilation
 * - GFM tables support
 * - Preserve heading IDs (mangle: false)
 * - Allow raw HTML (sanitize: false) for embedded <div>, <h1>, etc.
 */
function configureMarked() {
    // Add GFM heading ID extension for stable anchor generation
    marked_1.marked.use((0, marked_gfm_heading_id_1.gfmHeadingId)({
        prefix: "", // No prefix on IDs
    }));
    // Configure marked options
    // GFM (GitHub Flavored Markdown) is enabled by default in marked v12+
    // gfmHeadingId extension handles ID generation with mangle: false by default
    marked_1.marked.setOptions({
        breaks: false, // Don't convert \n to <br>
    });
}
/**
 * Compile markdown to HTML
 * Note: Markdown files already include <h1 id="doc-title"> - we just parse them as-is
 */
async function compileMarkdownWithDocTitle(markdown) {
    return await marked_1.marked.parse(markdown);
}
/**
 * Reset the marked configuration (needed for tests to have independent state)
 */
function resetMarked() {
    marked_1.marked.setOptions(marked_1.marked.getDefaults());
}
/**
 * Compile a single markdown file to HTML fragment
 *
 * @param markdownPath - Path to markdown file
 * @returns HTML fragment (NOT a full document - no <html>, <body>, etc.)
 */
async function compileMarkdown(markdownPath) {
    const markdown = fs.readFileSync(markdownPath, "utf-8");
    // Parse and render to HTML
    const html = await marked_1.marked.parse(markdown);
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
async function compileAllMarkdown(inputDir, outputDir, version, verbose = false) {
    configureMarked();
    const compiledFiles = new Map();
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
//# sourceMappingURL=markdown-compiler.js.map