#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { BuildConfig } from "./src/types.js";

/**
 * CLI entry point for documentation build system
 * Compiles markdown → HTML fragments + NDJSON lexemes
 *
 * Usage:
 *   node index.js [options]
 *
 * Options:
 *   --input <dir>   Input directory (default: docs/)
 *   --output <dir>  Output directory (default: dist/docs/)
 *   --verbose       Enable verbose logging
 */

function parseArgs(): BuildConfig {
    const args = process.argv.slice(2);
    const config: BuildConfig = {
        inputDir: path.join(process.cwd(), "docs"),
        outputDir: path.join(process.cwd(), "dist", "docs"),
        verbose: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case "--input":
                config.inputDir = path.resolve(args[++i]);
                break;
            case "--output":
                config.outputDir = path.resolve(args[++i]);
                break;
            case "--verbose":
            case "-v":
                config.verbose = true;
                break;
            case "--help":
            case "-h":
                printHelp();
                process.exit(0);
                break;
            default:
                console.error(`Unknown option: ${args[i]}`);
                printHelp();
                process.exit(1);
        }
    }

    return config;
}

function printHelp(): void {
    console.log(`
Documentation Build System

Compiles markdown to HTML fragments and generates NDJSON lexemes for search.

Usage:
  npm run build:docs [options]

Options:
  --input <dir>   Input directory containing markdown files (default: docs/)
  --output <dir>  Output directory for build artifacts (default: dist/docs/)
  --verbose, -v   Enable verbose logging
  --help, -h      Show this help message

Output Structure:
  dist/docs/
    rendered/
      1.x/
        *.html          # HTML fragments
    search/
      lexemes.ndjson    # Search index
    meta.json           # Page metadata
`);
}

function validateConfig(config: BuildConfig): void {
    if (!fs.existsSync(config.inputDir)) {
        console.error(`Error: Input directory does not exist: ${config.inputDir}`);
        process.exit(1);
    }

    if (config.verbose) {
        console.log("Configuration:");
        console.log(`  Input:  ${config.inputDir}`);
        console.log(`  Output: ${config.outputDir}`);
    }
}

async function main(): Promise<void> {
    try {
        const config = parseArgs();
        validateConfig(config);

        if (config.verbose) {
            console.log("Starting documentation build...");
        }

        // Use default version for now (can be made configurable later)
        const version = "1.x";

        // Import and run the build pipeline from src/index.ts
        const { buildDocs } = await import("./src/index.js");
        const result = await buildDocs({
            docsSourceDir: config.inputDir,
            outputDir: config.outputDir,
            version: version,
        });

        console.log("Build complete!");
        console.log(`  Documents processed: ${result.documentsProcessed}`);
        console.log(`  Lexemes generated: ${result.lexemesGenerated}`);
        console.log(`  Output files:`);
        console.log(
            `    - Rendered HTML: ${result.outputFiles.rendered.length} files in ${path.join(config.outputDir, "rendered")}`
        );
        console.log(`    - Search index: ${result.outputFiles.lexemes}`);
        console.log(`    - Metadata: ${result.outputFiles.meta}`);
    } catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main, parseArgs, BuildConfig };
