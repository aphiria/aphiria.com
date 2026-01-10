/**
 * Test data constants for E2E tests
 */
export const TEST_DOCS = {
    installation: "/docs/1.x/installation.html",
    introduction: "/docs/1.x/introduction.html",
} as const;

export const TEST_QUERIES = {
    valid: "rout",
    validHighlightPattern: /^rout(e|es|ing)?$/i,
    noResults: "abcdefg123",
} as const;

export const TEST_CONTEXTS = {
    framework: "framework",
    library: "library",
} as const;
