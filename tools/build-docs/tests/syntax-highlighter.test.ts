import { highlightCode } from "../src/syntax-highlighter";

describe("Syntax Highlighter", () => {
    describe("Prism.js syntax highlighting", () => {
        it("highlights PHP code blocks", () => {
            const html = `<pre><code class="language-php">&lt;?php
function test() {
    return true;
}</code></pre>`;

            const highlighted = highlightCode(html);

            expect(highlighted).toContain('<span class="token');
            expect(highlighted).toContain('class="language-php"');
        });

        it("defaults to PHP when no language class is specified", () => {
            const html = `<pre><code>&lt;?php
function test() {
    return true;
}</code></pre>`;

            const highlighted = highlightCode(html);

            expect(highlighted).toContain('class="language-php"');
            expect(highlighted).toContain('<span class="token');
        });

        it("highlights multiple supported languages", () => {
            const languages = [
                { lang: "bash", code: "echo &quot;test&quot;" },
                { lang: "json", code: "{&quot;key&quot;: &quot;value&quot;}" },
                { lang: "yaml", code: "key: value" },
                { lang: "xml", code: "&lt;tag&gt;content&lt;/tag&gt;" },
            ];

            languages.forEach(({ lang, code }) => {
                const html = `<pre><code class="language-${lang}">${code}</code></pre>`;
                const highlighted = highlightCode(html);

                expect(highlighted).toContain(`class="language-${lang}"`);
                expect(highlighted).toContain('<span class="token');
            });
        });

        it("adds language class to parent <pre> element", () => {
            const html = `<pre><code class="language-php">&lt;?php function test() {}</code></pre>`;

            const highlighted = highlightCode(html);

            expect(highlighted).toMatch(/<pre[^>]*class="[^"]*language-php[^"]*">/);
        });
    });

    describe("Copy button injection", () => {
        it("adds copy button to highlighted code blocks", () => {
            const html = `<pre><code class="language-php">&lt;?php function test() {}</code></pre>`;

            const highlighted = highlightCode(html);

            expect(highlighted).toContain('<div class="button-wrapper">');
            expect(highlighted).toContain('<button class="copy-button"');
            expect(highlighted).toContain('title="Copy to clipboard"');
            expect(highlighted).toContain("<svg");
            expect(highlighted).toContain('class="bi bi-copy"');
        });

        it('does not add copy button when <pre> has "no-copy" class', () => {
            const html = `<pre class="no-copy"><code class="language-php">function test() {}</code></pre>`;

            const highlighted = highlightCode(html);

            expect(highlighted).not.toContain('class="button-wrapper"');
            expect(highlighted).not.toContain('class="copy-button"');
        });

        it("adds copy button before code content", () => {
            const html = `<pre><code class="language-php">&lt;?php function test() {}</code></pre>`;

            const highlighted = highlightCode(html);

            const buttonIndex = highlighted.indexOf('class="button-wrapper"');
            const codeIndex = highlighted.indexOf("<code");

            expect(buttonIndex).toBeGreaterThan(-1);
            expect(codeIndex).toBeGreaterThan(-1);
            expect(buttonIndex).toBeLessThan(codeIndex);
        });
    });

    describe("Multiple code blocks", () => {
        it("highlights all code blocks in HTML fragment", () => {
            const html = `
<h1>Documentation</h1>
<pre><code class="language-php">&lt;?php echo &quot;test&quot;;</code></pre>
<p>Some text</p>
<pre><code class="language-bash">npm install</code></pre>
<pre><code class="language-json">{&quot;key&quot;: &quot;value&quot;}</code></pre>
`;

            const highlighted = highlightCode(html);

            // All blocks should be highlighted
            expect((highlighted.match(/<span class="token/g) || []).length).toBeGreaterThan(0);

            // All blocks should have copy buttons
            expect((highlighted.match(/class="button-wrapper"/g) || []).length).toBe(3);
        });
    });

    describe("Edge cases", () => {
        it("handles empty code blocks", () => {
            const html = `<pre><code class="language-php"></code></pre>`;

            const highlighted = highlightCode(html);

            expect(highlighted).toContain("<pre");
            expect(highlighted).toContain("<code");
        });

        it("handles code blocks without <pre> wrapper", () => {
            const html = `<code class="language-php">function test() {}</code>`;

            const highlighted = highlightCode(html);

            // Should not throw error, but won't add copy button
            expect(highlighted).toContain("<code");
        });

        it("preserves HTML outside code blocks", () => {
            const html = `
<h1 id="title">Title</h1>
<p>Paragraph</p>
<pre><code class="language-php">function test() {}</code></pre>
<div class="custom">Content</div>
`;

            const highlighted = highlightCode(html);

            expect(highlighted).toContain('<h1 id="title">Title</h1>');
            expect(highlighted).toContain("<p>Paragraph</p>");
            expect(highlighted).toContain('<div class="custom">Content</div>');
        });
    });
});
