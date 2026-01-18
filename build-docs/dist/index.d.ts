#!/usr/bin/env node
import { BuildConfig } from './src/types';
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
declare function parseArgs(): BuildConfig;
declare function main(): Promise<void>;
export { main, parseArgs, BuildConfig };
//# sourceMappingURL=index.d.ts.map