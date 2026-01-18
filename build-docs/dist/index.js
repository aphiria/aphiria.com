#!/usr/bin/env node
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
exports.main = main;
exports.parseArgs = parseArgs;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
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
function printHelp() {
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
function validateConfig(config) {
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
async function main() {
    try {
        const config = parseArgs();
        validateConfig(config);
        if (config.verbose) {
            console.log("Starting documentation build...");
        }
        // TODO: Implement build pipeline
        // 1. Compile markdown to HTML (src/markdown-compiler.ts)
        // 2. Apply syntax highlighting (src/syntax-highlighter.ts)
        // 3. Extract lexemes (src/lexeme-extractor.ts)
        // 4. Write NDJSON (src/ndjson-writer.ts)
        // 5. Generate meta.json (src/meta-generator.ts)
        console.log("Build complete! (pipeline not yet implemented)");
    }
    catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}
// Run if executed directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map