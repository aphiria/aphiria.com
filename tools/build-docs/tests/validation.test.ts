import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { LexemeRecord, Context } from "../src/types";
import { buildDocs, validateLexemes } from "../src/index";

describe("Lexeme Validation", () => {
    const testSourceDir = join(__dirname, "validation-test-docs");
    const testOutputDir = join(__dirname, "validation-test-output");

    beforeEach(() => {
        mkdirSync(testSourceDir, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(testSourceDir)) {
            rmSync(testSourceDir, { recursive: true, force: true });
        }
        if (existsSync(testOutputDir)) {
            rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    it("throws error when lexeme has null h1_inner_text", async () => {
        // Create markdown that will produce a lexeme without h1
        // This happens when there's content but no h1#doc-title
        writeFileSync(
            join(testSourceDir, "test.md"),
            `
<p>Content without h1</p>
`
        );

        await expect(
            buildDocs({
                docsSourceDir: testSourceDir,
                outputDir: testOutputDir,
                version: "1.x",
            })
        ).rejects.toThrow("Document missing h1#doc-title element");
    });

    it("throws error when h1_inner_text is null", () => {
        const invalidLexeme: LexemeRecord = {
            version: "1.x",
            context: Context.Global,
            link: "/docs/1.x/test",
            html_element_type: "p",
            inner_text: "Test",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            h1_inner_text: null as any,
            h2_inner_text: null,
            h3_inner_text: null,
            h4_inner_text: null,
            h5_inner_text: null,
        };

        expect(() => validateLexemes([invalidLexeme])).toThrow(
            "Lexeme validation failed:\nLexeme 0: Missing h1_inner_text (link: /docs/1.x/test)"
        );
    });

    it("throws error when link does not start with /docs/", () => {
        const invalidLexeme: LexemeRecord = {
            version: "1.x",
            context: Context.Global,
            link: "/invalid/path",
            html_element_type: "p",
            inner_text: "Test",
            h1_inner_text: "Title",
            h2_inner_text: null,
            h3_inner_text: null,
            h4_inner_text: null,
            h5_inner_text: null,
        };

        expect(() => validateLexemes([invalidLexeme])).toThrow(
            "Lexeme validation failed:\nLexeme 0: Link must start with /docs/ (got: /invalid/path)"
        );
    });

    it("throws error when context enum value is invalid", () => {
        const invalidLexeme: LexemeRecord = {
            version: "1.x",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            context: "invalid-context" as any,
            link: "/docs/1.x/test",
            html_element_type: "p",
            inner_text: "Test",
            h1_inner_text: "Title",
            h2_inner_text: null,
            h3_inner_text: null,
            h4_inner_text: null,
            h5_inner_text: null,
        };

        expect(() => validateLexemes([invalidLexeme])).toThrow(
            "Lexeme validation failed:\nLexeme 0: Invalid context value (got: invalid-context, expected one of: framework, library, global)"
        );
    });

    it("throws error with multiple validation failures", () => {
        const invalidLexemes: LexemeRecord[] = [
            {
                version: "1.x",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                context: "invalid" as any,
                link: "/bad/link",
                html_element_type: "p",
                inner_text: "Test 1",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                h1_inner_text: null as any,
                h2_inner_text: null,
                h3_inner_text: null,
                h4_inner_text: null,
                h5_inner_text: null,
            },
            {
                version: "1.x",
                context: Context.Global,
                link: "/docs/1.x/valid",
                html_element_type: "p",
                inner_text: "Test 2",
                h1_inner_text: "Title",
                h2_inner_text: null,
                h3_inner_text: null,
                h4_inner_text: null,
                h5_inner_text: null,
            },
        ];

        expect(() => validateLexemes(invalidLexemes)).toThrow(/Lexeme validation failed/);
        expect(() => validateLexemes(invalidLexemes)).toThrow(/Missing h1_inner_text/);
        expect(() => validateLexemes(invalidLexemes)).toThrow(/Link must start with \/docs\//);
        expect(() => validateLexemes(invalidLexemes)).toThrow(/Invalid context value/);
    });

    it("does not throw for valid lexemes", () => {
        const validLexemes: LexemeRecord[] = [
            {
                version: "1.x",
                context: Context.Framework,
                link: "/docs/1.x/test",
                html_element_type: "h1",
                inner_text: "Title",
                h1_inner_text: "Title",
                h2_inner_text: null,
                h3_inner_text: null,
                h4_inner_text: null,
                h5_inner_text: null,
            },
            {
                version: "1.x",
                context: Context.Library,
                link: "/docs/1.x/test#section",
                html_element_type: "p",
                inner_text: "Content",
                h1_inner_text: "Title",
                h2_inner_text: "Section",
                h3_inner_text: null,
                h4_inner_text: null,
                h5_inner_text: null,
            },
        ];

        expect(() => validateLexemes(validLexemes)).not.toThrow();
    });
});
