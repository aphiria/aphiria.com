import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { DocContent } from "@/components/docs/DocContent";

// Mock HighlightedHtml to passthrough children
vi.mock("@/components/docs/HighlightedHtml", () => ({
    HighlightedHtml: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("DocContent", () => {
    it("renders sanitized HTML", () => {
        const html = "<h1>Test Heading</h1><p>Test paragraph</p>";

        const { container } = render(<DocContent html={html} />);

        const div = container.firstChild as HTMLElement;
        expect(div).toBeInTheDocument();
        expect(div.innerHTML).toBe(html);
    });

    it("renders empty content for empty string", () => {
        const { container } = render(<DocContent html="" />);

        const div = container.firstChild as HTMLElement;
        expect(div).toBeInTheDocument();
        expect(div.innerHTML).toBe("");
    });

    it("renders complex HTML with nested elements", () => {
        const html = `
            <div class="container">
                <h2 id="section">Section</h2>
                <ul>
                    <li>Item 1</li>
                    <li>Item 2</li>
                </ul>
            </div>
        `;

        const { container } = render(<DocContent html={html} />);

        const div = container.firstChild as HTMLElement;
        expect(div.innerHTML).toBe(html);
    });

    it("renders code blocks for syntax highlighting", () => {
        const html = '<pre><code class="language-php">echo "Hello";</code></pre>';

        const { container } = render(<DocContent html={html} />);

        const code = container.querySelector("code.language-php");
        expect(code).toBeInTheDocument();
        expect(code?.textContent).toBe('echo "Hello";');
    });
});
