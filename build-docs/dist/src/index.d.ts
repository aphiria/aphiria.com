#!/usr/bin/env node
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
 * Build documentation from markdown sources
 */
export declare function buildDocs(config: BuildConfig): Promise<BuildResult>;
export {};
//# sourceMappingURL=index.d.ts.map