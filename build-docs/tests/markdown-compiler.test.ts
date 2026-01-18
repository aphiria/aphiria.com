import { compileMarkdown, configureMarked } from "../src/markdown-compiler";
import * as fs from "fs";
import * as path from "path";

describe("Markdown Compiler", () => {
    beforeAll(() => {
        configureMarked();
    });

    describe("Markdown with embedded HTML", () => {
        it("preserves embedded HTML elements (div, h1, etc.)", async () => {
            const markdown = `# Test Heading

<div class="custom-container">
<h1 id="custom-heading">Custom HTML Heading</h1>
<p>Paragraph inside div</p>
</div>

Regular markdown paragraph.`;

            const html = await compileMarkdown(createTempMarkdownFile(markdown));

            expect(html).toContain('<div class="custom-container">');
            expect(html).toContain('<h1 id="custom-heading">Custom HTML Heading</h1>');
            expect(html).toContain("<p>Paragraph inside div</p>");
            expect(html).toContain("</div>");
        });

        it("preserves HTML attributes", async () => {
            const markdown = `<div class="alert alert-info" data-test="value">
Test content
</div>`;

            const html = await compileMarkdown(createTempMarkdownFile(markdown));

            expect(html).toContain('class="alert alert-info"');
            expect(html).toContain('data-test="value"');
        });
    });

    describe("GFM tables", () => {
        it("compiles GFM tables to <table> elements", async () => {
            const markdown = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |`;

            const html = await compileMarkdown(createTempMarkdownFile(markdown));

            expect(html).toContain("<table>");
            expect(html).toContain("<thead>");
            expect(html).toContain("<tbody>");
            expect(html).toContain("<th>Header 1</th>");
            expect(html).toContain("<th>Header 2</th>");
            expect(html).toContain("<th>Header 3</th>");
            expect(html).toContain("<td>Cell 1</td>");
            expect(html).toContain("<td>Cell 6</td>");
            expect(html).toContain("</table>");
        });

        it("handles table alignment", async () => {
            const markdown = `| Left | Center | Right |
|:-----|:------:|------:|
| L1   | C1     | R1    |`;

            const html = await compileMarkdown(createTempMarkdownFile(markdown));

            expect(html).toContain("<table>");
            expect(html).toMatch(/align="left"/);
            expect(html).toMatch(/align="center"/);
            expect(html).toMatch(/align="right"/);
        });
    });

    describe("Heading ID generation", () => {
        it("generates stable heading IDs using gfm-heading-id", async () => {
            const markdown = `# Installation Guide

## Getting Started

### System Requirements`;

            const html = await compileMarkdown(createTempMarkdownFile(markdown));

            expect(html).toContain('id="installation-guide"');
            expect(html).toContain('id="getting-started"');
            expect(html).toContain('id="system-requirements"');
        });

        it("does not add prefix to heading IDs", async () => {
            const markdown = `# Test Heading`;

            const html = await compileMarkdown(createTempMarkdownFile(markdown));

            expect(html).toContain('id="test-heading"');
            expect(html).not.toContain('id="heading-test-heading"');
        });
    });
});

/**
 * Helper: Create temporary markdown file for testing
 */
function createTempMarkdownFile(content: string): string {
    const tmpDir = path.join(__dirname, ".tmp");
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    const tmpFile = path.join(tmpDir, `test-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, content, "utf-8");

    return tmpFile;
}

// Cleanup temp files after all tests
afterAll(() => {
    const tmpDir = path.join(__dirname, ".tmp");
    if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});
