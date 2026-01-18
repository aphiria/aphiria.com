/**
 * Context enum matching PHP App\Documentation\Searching\Context
 */
export declare enum Context {
    Framework = "framework",
    Library = "library",
    Global = "global"
}
/**
 * Lexeme record matching PHP App\Documentation\Searching\IndexEntry
 * This is the structure output to NDJSON for PHP consumption
 */
export interface LexemeRecord {
    version: string;
    context: Context;
    link: string;
    html_element_type: "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "li" | "blockquote";
    inner_text: string;
    h1_inner_text: string;
    h2_inner_text: string | null;
    h3_inner_text: string | null;
    h4_inner_text: string | null;
    h5_inner_text: string | null;
}
/**
 * Page metadata for meta.json
 */
export interface PageMetadata {
    version: string;
    slug: string;
    title: string;
    path: string;
}
/**
 * Build configuration
 */
export interface BuildConfig {
    inputDir: string;
    outputDir: string;
    verbose?: boolean;
}
//# sourceMappingURL=types.d.ts.map