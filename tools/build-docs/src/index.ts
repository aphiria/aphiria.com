#!/usr/bin/env node

import { configureMarked, compileMarkdownWithDocTitle } from "./markdown-compiler.js";
import { extractLexemes } from "./lexeme-extractor.js";
import { writeLexemesToNdjson } from "./ndjson-writer.js";
import { generateMetaJson, DocMeta } from "./meta-generator.js";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { LexemeRecord } from "./types.js";

/**
 * Build configuration
 */
interface BuildConfig {
    docsSourceDir: string;
    outputDir: string;
    version: string;
}

/**
 * Build result
 */
interface BuildResult {
    documentsProcessed: number;
    lexemesGenerated: number;
    outputFiles: {
        rendered: string[];
        lexemes: string;
        meta: string;
    };
}

/**
 * Validate lexeme records
 */
export function validateLexemes(lexemes: LexemeRecord[]): void {
    const errors: string[] = [];

    lexemes.forEach((record, index) => {
        // T036: Verify all lexeme records have non-null h1_inner_text
        if (!record.h1_inner_text) {
            errors.push(`Lexeme ${index}: Missing h1_inner_text (link: ${record.link})`);
        }

        // T037: Verify all links start with /docs/ and match expected format
        if (!record.link.startsWith("/docs/")) {
            errors.push(`Lexeme ${index}: Link must start with /docs/ (got: ${record.link})`);
        }

        // T038: Verify context enum values
        const validContexts = ["framework", "library", "global"];
        if (!validContexts.includes(record.context)) {
            errors.push(
                `Lexeme ${index}: Invalid context value (got: ${record.context}, expected one of: ${validContexts.join(", ")})`
            );
        }
    });

    if (errors.length > 0) {
        throw new Error(`Lexeme validation failed:\n${errors.join("\n")}`);
    }
}

/**
 * Build documentation from markdown sources
 */
export async function buildDocs(config: BuildConfig): Promise<BuildResult> {
    const { docsSourceDir, outputDir, version } = config;

    // Configure markdown compiler
    configureMarked();

    // Ensure output directories exist
    const renderedDir = join(outputDir, "rendered");
    const searchDir = join(outputDir, "search");

    mkdirSync(renderedDir, { recursive: true });
    mkdirSync(searchDir, { recursive: true });

    // Process all markdown files
    const markdownFiles = readdirSync(docsSourceDir).filter((file) => file.endsWith(".md"));
    const allLexemes: LexemeRecord[] = [];
    const allMeta: DocMeta[] = [];
    const renderedFiles: string[] = [];

    for (const markdownFile of markdownFiles) {
        const slug = basename(markdownFile, ".md");
        const markdownPath = join(docsSourceDir, markdownFile);
        const outputPath = join(renderedDir, `${slug}.html`);

        // Read markdown source
        const markdown = readFileSync(markdownPath, "utf8");

        // Compile markdown to HTML fragment
        const htmlFragment = await compileMarkdownWithDocTitle(markdown);

        // Wrap in proper structure for lexeme extraction
        const wrappedHtml = `<body><main><article>${htmlFragment}</article></main></body>`;

        // Extract lexemes for search indexing
        const lexemes = extractLexemes(wrappedHtml, version, slug);
        allLexemes.push(...lexemes);

        // Generate metadata (needs wrapped HTML to find h1#doc-title)
        allMeta.push(...generateMetaJson([{ html: wrappedHtml, version, slug }]));

        // Write rendered HTML fragment (NOT wrapped - just the fragment for Next.js)
        writeFileSync(outputPath, htmlFragment, "utf8");
        renderedFiles.push(outputPath);
    }

    // Validate lexemes before writing
    validateLexemes(allLexemes);

    // Write search index (NDJSON)
    const lexemesPath = join(searchDir, "lexemes.ndjson");
    await writeLexemesToNdjson(allLexemes, lexemesPath);

    // Write metadata (JSON)
    const metaPath = join(outputDir, "meta.json");
    writeFileSync(metaPath, JSON.stringify(allMeta, null, 2), "utf8");

    return {
        documentsProcessed: markdownFiles.length,
        lexemesGenerated: allLexemes.length,
        outputFiles: {
            rendered: renderedFiles,
            lexemes: lexemesPath,
            meta: metaPath,
        },
    };
}

/**
 * CLI entry point
 */
/* v8 ignore start */
async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.error("Usage: build-docs <source-dir> <output-dir> <version>");
        console.error("Example: build-docs ./docs/1.x ./dist/docs 1.x");
        process.exit(1);
    }

    const [docsSourceDir, outputDir, version] = args;

    if (!existsSync(docsSourceDir)) {
        console.error(`Error: Source directory does not exist: ${docsSourceDir}`);
        process.exit(1);
    }

    console.log("Building documentation...");
    console.log(`  Source: ${docsSourceDir}`);
    console.log(`  Output: ${outputDir}`);
    console.log(`  Version: ${version}`);
    console.log("");

    try {
        const result = await buildDocs({ docsSourceDir, outputDir, version });

        console.log("Build complete!");
        console.log(`  Documents processed: ${result.documentsProcessed}`);
        console.log(`  Lexemes generated: ${result.lexemesGenerated}`);
        console.log(`  Output files:`);
        console.log(
            `    - Rendered HTML: ${result.outputFiles.rendered.length} files in ${join(outputDir, "rendered")}`
        );
        console.log(`    - Search index: ${result.outputFiles.lexemes}`);
        console.log(`    - Metadata: ${result.outputFiles.meta}`);
    } catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}

// Run CLI if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}
/* v8 ignore stop */
