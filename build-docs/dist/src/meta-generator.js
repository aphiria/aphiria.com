"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDocTitle = extractDocTitle;
exports.generateDocMeta = generateDocMeta;
exports.generateMetaJson = generateMetaJson;
const jsdom_1 = require("jsdom");
/**
 * Extract document title from compiled HTML
 */
function extractDocTitle(html) {
    const dom = new jsdom_1.JSDOM(html);
    const document = dom.window.document;
    // Find h1#doc-title element
    const titleElement = document.querySelector('h1#doc-title');
    if (!titleElement) {
        throw new Error('Document missing h1#doc-title element');
    }
    return titleElement.textContent?.trim() || '';
}
/**
 * Generate metadata for a single document
 */
function generateDocMeta(html, version, slug) {
    return {
        version,
        slug,
        title: extractDocTitle(html),
    };
}
/**
 * Generate meta.json from all compiled documents
 */
function generateMetaJson(documents) {
    return documents.map(doc => generateDocMeta(doc.html, doc.version, doc.slug));
}
//# sourceMappingURL=meta-generator.js.map