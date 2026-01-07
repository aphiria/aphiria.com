/**
 * Test data constants for E2E tests
 */
export const testDocs = {
    installation: "/docs/1.x/installation.html",
    introduction: "/docs/1.x/introduction.html",
} as const;

export const testQueries = {
    valid: "rout",
    noResults: "abcdefg123",
} as const;

export const testContexts = {
    framework: "framework",
    library: "library",
} as const;
