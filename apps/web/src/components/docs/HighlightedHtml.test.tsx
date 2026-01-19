import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { HighlightedHtml } from "./HighlightedHtml";

// Mock highlightCode
const mockHighlightCode = vi.fn((html: string) => `highlighted:${html}`);
vi.mock("@/lib/prism/highlighter", () => ({
    highlightCode: (html: string) => mockHighlightCode(html),
}));

describe("HighlightedHtml", () => {
    it("renders children as highlighted HTML", async () => {
        const Component = await HighlightedHtml({
            children: (
                <div>
                    <h1>Test</h1>
                    <code>const x = 1;</code>
                </div>
            ),
        });

        const { container } = render(Component);

        expect(mockHighlightCode).toHaveBeenCalled();
        const div = container.firstChild as HTMLElement;
        expect(div.innerHTML).toContain("highlighted:");
    });

    it("handles text children", async () => {
        const Component = await HighlightedHtml({
            children: "Plain text content",
        });

        const { container } = render(Component);

        expect(mockHighlightCode).toHaveBeenCalled();
        expect(container.firstChild).toBeInTheDocument();
    });

    it("handles nested React elements", async () => {
        const Component = await HighlightedHtml({
            children: (
                <>
                    <p>First paragraph</p>
                    <p>Second paragraph</p>
                </>
            ),
        });

        const { container } = render(Component);

        expect(mockHighlightCode).toHaveBeenCalled();
        expect(container.firstChild).toBeInTheDocument();
    });
});
