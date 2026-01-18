/**
 * Document metadata entry
 */
export interface DocMeta {
    version: string;
    slug: string;
    title: string;
}
/**
 * Extract document title from compiled HTML
 */
export declare function extractDocTitle(html: string): string;
/**
 * Generate metadata for a single document
 */
export declare function generateDocMeta(html: string, version: string, slug: string): DocMeta;
/**
 * Generate meta.json from all compiled documents
 */
export declare function generateMetaJson(documents: Array<{
    html: string;
    version: string;
    slug: string;
}>): DocMeta[];
//# sourceMappingURL=meta-generator.d.ts.map