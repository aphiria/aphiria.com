import { LexemeRecord } from './types';
/**
 * Extract lexemes from compiled HTML for search indexing
 *
 * @param html - HTML fragment to extract lexemes from
 * @param version - Documentation version (e.g., "1.x")
 * @param slug - Document slug (filename without extension)
 * @returns Array of lexeme records for NDJSON output
 */
export declare function extractLexemes(html: string, version: string, slug: string): LexemeRecord[];
//# sourceMappingURL=lexeme-extractor.d.ts.map