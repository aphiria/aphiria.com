import { JSDOM } from 'jsdom';
import { Context, LexemeRecord } from './types';

/**
 * Indexable HTML elements (matches the elements we extract for search)
 */
const INDEXABLE_ELEMENTS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'p', 'li', 'blockquote']);

/**
 * Extract lexemes from compiled HTML for search indexing
 *
 * @param html - HTML fragment to extract lexemes from
 * @param version - Documentation version (e.g., "1.x")
 * @param slug - Document slug (filename without extension)
 * @returns Array of lexeme records for NDJSON output
 */
export function extractLexemes(html: string, version: string, slug: string): LexemeRecord[] {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const { Element } = dom.window;
    const lexemes: LexemeRecord[] = [];

    // Find the article element
    const article = document.querySelector('body > main > article:first-child');

    if (!article) {
        return lexemes;
    }

    // Track current heading hierarchy
    const state: HeadingState = {
        h1: null,
        h2: null,
        h3: null,
        h4: null,
        h5: null,
    };

    processNode(article, lexemes, version, slug, state, Element);

    return lexemes;
}

/**
 * Heading hierarchy state
 */
interface HeadingState {
    h1: Element | null;
    h2: Element | null;
    h3: Element | null;
    h4: Element | null;
    h5: Element | null;
}

/**
 * Process a DOM node recursively, extracting lexemes
 */
function processNode(
    node: Node,
    lexemes: LexemeRecord[],
    version: string,
    slug: string,
    state: HeadingState,
    ElementClass: typeof Element
): void {
    if (shouldSkipNode(node, ElementClass)) {
        return;
    }

    // Update heading hierarchy based on node type
    if (node instanceof ElementClass) {
        const nodeName = node.nodeName.toLowerCase();

        switch (nodeName) {
            case 'h1':
                state.h1 = node;
                state.h2 = state.h3 = state.h4 = state.h5 = null;
                break;
            case 'h2':
                state.h2 = node;
                state.h3 = state.h4 = state.h5 = null;
                break;
            case 'h3':
                state.h3 = node;
                state.h4 = state.h5 = null;
                break;
            case 'h4':
                state.h4 = node;
                state.h5 = null;
                break;
            case 'h5':
                state.h5 = node;
                break;
        }

        // Create lexeme record for indexable elements
        if (INDEXABLE_ELEMENTS.has(nodeName)) {
            lexemes.push(createLexemeRecord(node, version, slug, state));
        }
    }

    // Recursively process children
    node.childNodes.forEach(child => {
        processNode(child, lexemes, version, slug, state, ElementClass);
    });
}

/**
 * Check if node should be skipped
 */
function shouldSkipNode(node: Node, ElementClass: typeof Element): boolean {
    if (!(node instanceof ElementClass)) {
        return false;
    }

    // Skip table-of-contents navigation
    return node.nodeName.toLowerCase() === 'nav' &&
           (node.classList.contains('toc-nav') || node.className.includes('toc-nav'));
}

/**
 * Create lexeme record from DOM element
 */
function createLexemeRecord(
    element: Element,
    version: string,
    slug: string,
    state: HeadingState
): LexemeRecord {
    const nodeName = element.nodeName.toLowerCase();
    const link = buildLink(element, version, slug, state);
    const context = getContext(element);
    const innerText = getAllChildNodeTexts(element);

    return {
        version,
        context,
        link,
        html_element_type: nodeName as LexemeRecord['html_element_type'],
        inner_text: innerText,
        h1_inner_text: state.h1 ? getAllChildNodeTexts(state.h1) : '',
        h2_inner_text: state.h2 ? getAllChildNodeTexts(state.h2) : null,
        h3_inner_text: state.h3 ? getAllChildNodeTexts(state.h3) : null,
        h4_inner_text: state.h4 ? getAllChildNodeTexts(state.h4) : null,
        h5_inner_text: state.h5 ? getAllChildNodeTexts(state.h5) : null,
    };
}

/**
 * Build link URL for lexeme record
 */
function buildLink(
    element: Element,
    version: string,
    slug: string,
    state: HeadingState
): string {
    const baseLink = `/docs/${version}/${slug}`;
    const nodeName = element.nodeName.toLowerCase();

    // If h1, link to doc itself
    if (nodeName === 'h1') {
        return baseLink;
    }

    // If h2-h5, link to element's ID
    if (['h2', 'h3', 'h4', 'h5'].includes(nodeName)) {
        const id = element.getAttribute('id');
        return id ? `${baseLink}#${id}` : baseLink;
    }

    // Otherwise, link to nearest header's ID (h5 > h4 > h3 > h2 > h1)
    if (state.h5) {
        const id = state.h5.getAttribute('id');
        return id ? `${baseLink}#${id}` : baseLink;
    }
    if (state.h4) {
        const id = state.h4.getAttribute('id');
        return id ? `${baseLink}#${id}` : baseLink;
    }
    if (state.h3) {
        const id = state.h3.getAttribute('id');
        return id ? `${baseLink}#${id}` : baseLink;
    }
    if (state.h2) {
        const id = state.h2.getAttribute('id');
        return id ? `${baseLink}#${id}` : baseLink;
    }
    if (state.h1) {
        const id = state.h1.getAttribute('id');
        return id ? `${baseLink}#${id}` : baseLink;
    }

    return baseLink;
}

/**
 * Get context from element or its ancestors
 */
function getContext(element: Element): Context {
    let current: Element | null = element;

    while (current) {
        if (current.classList.contains('context-framework')) {
            return Context.Framework;
        }
        if (current.classList.contains('context-library')) {
            return Context.Library;
        }
        current = current.parentElement;
    }

    return Context.Global;
}

/**
 * Recursively extract all text content from element
 */
function getAllChildNodeTexts(node: Node): string {
    let text = '';

    node.childNodes.forEach(child => {
        if (child.nodeType === node.TEXT_NODE) {
            text += child.textContent || '';
        } else {
            text += getAllChildNodeTexts(child);
        }
    });

    return text;
}
