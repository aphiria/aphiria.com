import { JSDOM } from "jsdom";

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
export function extractDocTitle(html: string): string {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Find h1#doc-title element
    const titleElement = document.querySelector("h1#doc-title");

    if (!titleElement) {
        throw new Error("Document missing h1#doc-title element");
    }

    return titleElement.textContent?.trim() || "";
}

/**
 * Generate metadata for a single document
 */
export function generateDocMeta(html: string, version: string, slug: string): DocMeta {
    return {
        version,
        slug,
        title: extractDocTitle(html),
    };
}

/**
 * Generate meta.json from all compiled documents
 */
export function generateMetaJson(
    documents: Array<{ html: string; version: string; slug: string }>
): DocMeta[] {
    return documents.map((doc) => generateDocMeta(doc.html, doc.version, doc.slug));
}
