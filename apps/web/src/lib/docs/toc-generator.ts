import * as cheerio from "cheerio";

export interface TocHeading {
    /** Heading ID for anchor link */
    id: string;

    /** Heading text content */
    text: string;

    /** Heading level (2 or 3) */
    level: 2 | 3;

    /** Context class if heading is inside context-specific div */
    context?: "context-framework" | "context-library";

    /** Child h3 headings (only for h2) */
    children?: TocHeading[];
}

// In-memory cache for TOC (static during runtime, keyed by HTML hash)
const tocCache = new Map<string, TocHeading[]>();

/**
 * Simple hash function for caching TOC by HTML content
 */
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}

/**
 * Generate hierarchical table of contents from HTML
 *
 * Extracts h2 and h3 headings, nesting h3 under their parent h2
 * Detects context classes from ancestor divs
 * Cached in memory after first generation (static content)
 *
 * @param html - Rendered HTML content
 * @returns Array of h2 headings with nested h3 children
 */
export function generateToc(html: string): TocHeading[] {
    const cacheKey = hashString(html);

    if (tocCache.has(cacheKey)) {
        return tocCache.get(cacheKey)!;
    }

    const $ = cheerio.load(html);
    const headings: TocHeading[] = [];
    let currentH2: TocHeading | null = null;

    // Extract h2 and h3 headings, building hierarchy
    $("h2, h3").each((_, element) => {
        const $heading = $(element);
        const id = $heading.attr("id");
        const text = $heading.text().trim();
        const level = parseInt(element.tagName.substring(1)) as 2 | 3;

        // Skip if no ID or text
        if (!id || !text) {
            return;
        }

        // Check if heading is inside a context-specific div
        let context: "context-framework" | "context-library" | undefined;
        const contextParent = $heading.closest(".context-framework, .context-library");
        if (contextParent.length > 0) {
            if (contextParent.hasClass("context-framework")) {
                context = "context-framework";
            } else if (contextParent.hasClass("context-library")) {
                context = "context-library";
            }
        }

        if (level === 2) {
            // New h2 - add to top level
            currentH2 = { id, text, level, context, children: [] };
            headings.push(currentH2);
        } else if (level === 3 && currentH2) {
            // h3 - nest under current h2
            currentH2.children!.push({ id, text, level, context });
        }
    });

    tocCache.set(cacheKey, headings);
    return headings;
}

/**
 * Clear TOC cache (for testing)
 *
 * @internal
 */
export function clearTocCache(): void {
    tocCache.clear();
}
