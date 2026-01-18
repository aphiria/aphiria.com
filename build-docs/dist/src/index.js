#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDocs = buildDocs;
const markdown_compiler_1 = require("./markdown-compiler");
const syntax_highlighter_1 = require("./syntax-highlighter");
const lexeme_extractor_1 = require("./lexeme-extractor");
const ndjson_writer_1 = require("./ndjson-writer");
const meta_generator_1 = require("./meta-generator");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Validate lexeme records
 */
function validateLexemes(lexemes) {
    const errors = [];
    lexemes.forEach((record, index) => {
        // T036: Verify all lexeme records have non-null h1_inner_text
        if (!record.h1_inner_text) {
            errors.push(`Lexeme ${index}: Missing h1_inner_text (link: ${record.link})`);
        }
        // T037: Verify all links start with /docs/ and match expected format
        if (!record.link.startsWith('/docs/')) {
            errors.push(`Lexeme ${index}: Link must start with /docs/ (got: ${record.link})`);
        }
        // T038: Verify context enum values
        const validContexts = ['framework', 'library', 'global'];
        if (!validContexts.includes(record.context)) {
            errors.push(`Lexeme ${index}: Invalid context value (got: ${record.context}, expected one of: ${validContexts.join(', ')})`);
        }
    });
    if (errors.length > 0) {
        throw new Error(`Lexeme validation failed:\n${errors.join('\n')}`);
    }
}
/**
 * Build documentation from markdown sources
 */
async function buildDocs(config) {
    const { docsSourceDir, outputDir, version } = config;
    // Configure markdown compiler
    (0, markdown_compiler_1.configureMarked)();
    // Ensure output directories exist
    const renderedDir = (0, path_1.join)(outputDir, 'rendered');
    const searchDir = (0, path_1.join)(outputDir, 'search');
    (0, fs_1.mkdirSync)(renderedDir, { recursive: true });
    (0, fs_1.mkdirSync)(searchDir, { recursive: true });
    // Process all markdown files
    const markdownFiles = (0, fs_1.readdirSync)(docsSourceDir).filter(file => file.endsWith('.md'));
    const allLexemes = [];
    const allMeta = [];
    const renderedFiles = [];
    for (const markdownFile of markdownFiles) {
        const slug = (0, path_1.basename)(markdownFile, '.md');
        const markdownPath = (0, path_1.join)(docsSourceDir, markdownFile);
        const outputPath = (0, path_1.join)(renderedDir, `${slug}.html`);
        // Read markdown source
        const markdown = (0, fs_1.readFileSync)(markdownPath, 'utf8');
        // Compile markdown to HTML fragment
        let htmlFragment = await (0, markdown_compiler_1.compileMarkdownWithDocTitle)(markdown);
        // Apply syntax highlighting to fragment
        htmlFragment = (0, syntax_highlighter_1.highlightCode)(htmlFragment);
        // Wrap in proper structure for lexeme extraction
        const wrappedHtml = `<body><main><article>${htmlFragment}</article></main></body>`;
        // Extract lexemes for search indexing
        const lexemes = (0, lexeme_extractor_1.extractLexemes)(wrappedHtml, version, slug);
        allLexemes.push(...lexemes);
        // Generate metadata (needs wrapped HTML to find h1#doc-title)
        allMeta.push(...(0, meta_generator_1.generateMetaJson)([{ html: wrappedHtml, version, slug }]));
        // Write rendered HTML fragment (NOT wrapped - just the fragment for Next.js)
        (0, fs_1.writeFileSync)(outputPath, htmlFragment, 'utf8');
        renderedFiles.push(outputPath);
    }
    // Validate lexemes before writing
    validateLexemes(allLexemes);
    // Write search index (NDJSON)
    const lexemesPath = (0, path_1.join)(searchDir, 'lexemes.ndjson');
    await (0, ndjson_writer_1.writeLexemesToNdjson)(allLexemes, lexemesPath);
    // Write metadata (JSON)
    const metaPath = (0, path_1.join)(outputDir, 'meta.json');
    (0, fs_1.writeFileSync)(metaPath, JSON.stringify(allMeta, null, 2), 'utf8');
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
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error('Usage: build-docs <source-dir> <output-dir> <version>');
        console.error('Example: build-docs ./docs/1.x ./dist/docs 1.x');
        process.exit(1);
    }
    const [docsSourceDir, outputDir, version] = args;
    if (!(0, fs_1.existsSync)(docsSourceDir)) {
        console.error(`Error: Source directory does not exist: ${docsSourceDir}`);
        process.exit(1);
    }
    console.log('Building documentation...');
    console.log(`  Source: ${docsSourceDir}`);
    console.log(`  Output: ${outputDir}`);
    console.log(`  Version: ${version}`);
    console.log('');
    try {
        const result = await buildDocs({ docsSourceDir, outputDir, version });
        console.log('Build complete!');
        console.log(`  Documents processed: ${result.documentsProcessed}`);
        console.log(`  Lexemes generated: ${result.lexemesGenerated}`);
        console.log(`  Output files:`);
        console.log(`    - Rendered HTML: ${result.outputFiles.rendered.length} files in ${(0, path_1.join)(outputDir, 'rendered')}`);
        console.log(`    - Search index: ${result.outputFiles.lexemes}`);
        console.log(`    - Metadata: ${result.outputFiles.meta}`);
    }
    catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}
// Run CLI if invoked directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map