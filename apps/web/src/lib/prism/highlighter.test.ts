import { describe, it, expect, vi } from "vitest";
import { highlightCode } from "./highlighter";

describe("prism highlighter", () => {
    describe("highlightCode", () => {
        it("highlights PHP code block", () => {
            const html = '<code class="language-php">echo "Hello";</code>';

            const result = highlightCode(html);

            expect(result).toContain("token"); // Prism adds token spans
            expect(result).toContain("Hello");
        });

        it("highlights bash code block", () => {
            const html = '<code class="language-bash">ls -la</code>';

            const result = highlightCode(html);

            expect(result).toContain("token");
            expect(result).toContain("ls");
        });

        it("adds language class to parent pre element", () => {
            const html = '<pre><code class="language-php">echo "test";</code></pre>';

            const result = highlightCode(html);

            expect(result).toContain('class="language-php"');
        });

        it("skips code blocks without language class", () => {
            const html = "<code>plain text</code>";

            const result = highlightCode(html);

            expect(result).toBe("<html><head></head><body><code>plain text</code></body></html>");
        });

        it("skips code blocks with invalid language match", () => {
            const html = '<code class="some-other-class">text</code>';

            const result = highlightCode(html);

            expect(result).toContain("text");
            expect(result).not.toContain("token");
        });

        it("warns for unknown language", () => {
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const html = '<code class="language-unknown">text</code>';

            highlightCode(html);

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                "Prism grammar not found for language: unknown"
            );
            consoleWarnSpy.mockRestore();
        });

        it("handles multiple code blocks", () => {
            const html = `
                <code class="language-php">echo "PHP";</code>
                <code class="language-bash">echo "Bash"</code>
            `;

            const result = highlightCode(html);

            expect(result).toContain("token");
            expect(result).toContain("PHP");
            expect(result).toContain("Bash");
        });

        it("preserves HTML entities by not decoding them", () => {
            const html = '<code class="language-php">&lt;?php echo "test"; ?&gt;</code>';

            const result = highlightCode(html);

            // cheerio with decodeEntities: false preserves entities
            expect(result).toContain("&lt;");
            expect(result).toContain("&gt;");
        });

        it("handles code with special characters", () => {
            const html = '<code class="language-bash">echo $PATH</code>';

            const result = highlightCode(html);

            expect(result).toContain("$PATH");
            expect(result).toContain("token");
        });

        it("logs error when highlighting fails", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            // Mock Prism.highlight to throw error
            const Prism = await import("prismjs");
            const originalHighlight = Prism.default.highlight;
            Prism.default.highlight = vi.fn().mockImplementation(() => {
                throw new Error("Highlight error");
            });

            const html = '<code class="language-php">echo "test";</code>';
            highlightCode(html);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Failed to highlight code for language php:",
                expect.any(Error)
            );

            // Restore
            Prism.default.highlight = originalHighlight;
            consoleErrorSpy.mockRestore();
        });
    });
});
