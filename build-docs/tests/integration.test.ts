import { buildDocs } from "../src/index";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";

describe("Integration Tests", () => {
    const testSourceDir = join(__dirname, "test-docs");
    const testOutputDir = join(__dirname, "test-output");

    beforeAll(() => {
        // Create test docs directory with sample markdown
        mkdirSync(testSourceDir, { recursive: true });

        // Sample installation.md
        writeFileSync(
            join(testSourceDir, "installation.md"),
            `
<h1 id="doc-title">Installation</h1>

## System Requirements

You need PHP 8.4+.

## Installing via Composer

\`\`\`bash
composer require aphiria/aphiria
\`\`\`

## Verifying Installation

Run this command:

\`\`\`php
<?php
echo "Hello, Aphiria!";
\`\`\`
`
        );

        // Sample routing.md
        writeFileSync(
            join(testSourceDir, "routing.md"),
            `
<h1 id="doc-title">Routing</h1>

## Route Basics

Create routes using the router:

\`\`\`php
<?php
$router->get('/users', UsersController::class);
\`\`\`

### Route Parameters

Use route parameters like this:

\`\`\`php
<?php
$router->get('/users/:id', UserController::class);
\`\`\`
`
        );
    });

    afterAll(() => {
        // Clean up test directories
        if (existsSync(testSourceDir)) {
            rmSync(testSourceDir, { recursive: true, force: true });
        }
        if (existsSync(testOutputDir)) {
            rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    it("T039: compiles full docs directory and verifies output structure", async () => {
        const result = await buildDocs({
            docsSourceDir: testSourceDir,
            outputDir: testOutputDir,
            version: "1.x",
        });

        // Verify result metadata
        expect(result.documentsProcessed).toBe(2);
        expect(result.lexemesGenerated).toBeGreaterThan(0);

        // Verify directory structure
        expect(existsSync(join(testOutputDir, "rendered"))).toBe(true);
        expect(existsSync(join(testOutputDir, "search"))).toBe(true);

        // Verify rendered HTML files
        expect(existsSync(join(testOutputDir, "rendered", "installation.html"))).toBe(true);
        expect(existsSync(join(testOutputDir, "rendered", "routing.html"))).toBe(true);

        // Verify search index (NDJSON)
        expect(existsSync(join(testOutputDir, "search", "lexemes.ndjson"))).toBe(true);
        const lexemesContent = readFileSync(
            join(testOutputDir, "search", "lexemes.ndjson"),
            "utf8"
        );
        const lexemeLines = lexemesContent.trim().split("\n");
        expect(lexemeLines.length).toBeGreaterThan(0);

        // Each line should be valid JSON
        lexemeLines.forEach((line) => {
            expect(() => JSON.parse(line)).not.toThrow();
        });

        // Verify meta.json
        expect(existsSync(join(testOutputDir, "meta.json"))).toBe(true);
        const metaContent = readFileSync(join(testOutputDir, "meta.json"), "utf8");
        const meta = JSON.parse(metaContent);
        expect(meta).toHaveLength(2);
        expect(meta[0]).toMatchObject({
            version: "1.x",
            slug: "installation",
            title: "Installation",
        });
        expect(meta[1]).toMatchObject({
            version: "1.x",
            slug: "routing",
            title: "Routing",
        });
    });

    it("T040: validates lexeme records match expected schema", async () => {
        const result = await buildDocs({
            docsSourceDir: testSourceDir,
            outputDir: testOutputDir,
            version: "1.x",
        });

        const lexemesContent = readFileSync(result.outputFiles.lexemes, "utf8");
        const lexemeLines = lexemesContent.trim().split("\n");
        const lexemes = lexemeLines.map((line) => JSON.parse(line));

        // Verify each lexeme has required fields
        lexemes.forEach((lexeme) => {
            expect(lexeme).toHaveProperty("version");
            expect(lexeme).toHaveProperty("context");
            expect(lexeme).toHaveProperty("link");
            expect(lexeme).toHaveProperty("html_element_type");
            expect(lexeme).toHaveProperty("inner_text");
            expect(lexeme).toHaveProperty("h1_inner_text");
            expect(lexeme).toHaveProperty("h2_inner_text");
            expect(lexeme).toHaveProperty("h3_inner_text");
            expect(lexeme).toHaveProperty("h4_inner_text");
            expect(lexeme).toHaveProperty("h5_inner_text");

            // T036: Verify h1_inner_text is non-null
            expect(lexeme.h1_inner_text).not.toBeNull();
            expect(lexeme.h1_inner_text).toBeTruthy();

            // T037: Verify link format
            expect(lexeme.link).toMatch(/^\/docs\/1\.x\/(installation|routing)(#[a-z-]+)?$/);

            // T038: Verify context enum
            expect(["framework", "library", "global"]).toContain(lexeme.context);

            // Verify html_element_type
            expect(["h1", "h2", "h3", "h4", "h5", "p", "li", "blockquote"]).toContain(
                lexeme.html_element_type
            );
        });
    });

    it("validates rendered HTML contains syntax highlighting", async () => {
        await buildDocs({
            docsSourceDir: testSourceDir,
            outputDir: testOutputDir,
            version: "1.x",
        });

        const html = readFileSync(join(testOutputDir, "rendered", "installation.html"), "utf8");

        // Should contain Prism syntax highlighting classes
        expect(html).toContain('class="language-php"');
        expect(html).toContain('class="language-bash"');
    });

    it("throws error when markdown files lack h1#doc-title", async () => {
        // Create invalid markdown file without h1#doc-title
        const invalidDir = join(__dirname, "invalid-docs");
        mkdirSync(invalidDir, { recursive: true });
        writeFileSync(
            join(invalidDir, "invalid.md"),
            '<h1 id="wrong-id">Wrong ID</h1>\n\nContent without proper title.'
        );

        await expect(
            buildDocs({
                docsSourceDir: invalidDir,
                outputDir: testOutputDir,
                version: "1.x",
            })
        ).rejects.toThrow("Document missing h1#doc-title element");

        // Clean up
        rmSync(invalidDir, { recursive: true, force: true });
    });
});
