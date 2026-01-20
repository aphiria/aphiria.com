import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { TocHighlighter } from "@/components/docs/TocHighlighter";

describe("TocHighlighter", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it("renders null (no visible output)", () => {
        const { container } = render(<TocHighlighter />);
        expect(container.firstChild).toBeNull();
    });

    it("does nothing when TOC is missing", () => {
        document.body.innerHTML = `
            <article><h2 id="test">Test</h2></article>
            <footer></footer>
        `;

        expect(() => render(<TocHighlighter />)).not.toThrow();
    });

    it("does nothing when article is missing", () => {
        document.body.innerHTML = `
            <div class="toc-nav-contents"></div>
            <footer></footer>
        `;

        expect(() => render(<TocHighlighter />)).not.toThrow();
    });

    it("does nothing when footer is missing", () => {
        document.body.innerHTML = `
            <div class="toc-nav-contents"></div>
            <article><h2 id="test">Test</h2></article>
        `;

        expect(() => render(<TocHighlighter />)).not.toThrow();
    });

    it("adds event listeners for scroll, resize, and context-toggled", () => {
        document.body.innerHTML = `
            <div class="toc-nav-contents">
                <a href="#intro">Intro</a>
            </div>
            <article>
                <h2 id="intro">Introduction</h2>
            </article>
            <footer></footer>
        `;

        const addEventListenerSpy = vi.spyOn(window, "addEventListener");
        const docAddEventListenerSpy = vi.spyOn(document, "addEventListener");

        render(<TocHighlighter />);

        expect(addEventListenerSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
        expect(addEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
        expect(docAddEventListenerSpy).toHaveBeenCalledWith(
            "context-toggled",
            expect.any(Function)
        );
    });

    it("initializes with required DOM elements", () => {
        document.body.innerHTML = `
            <div class="toc-nav-contents">
                <a href="#intro">Intro</a>
            </div>
            <article>
                <h2 id="intro">Introduction</h2>
            </article>
            <footer></footer>
        `;

        expect(() => render(<TocHighlighter />)).not.toThrow();

        // Verify event listeners were attached
        const addEventListenerSpy = vi.spyOn(window, "addEventListener");
        render(<TocHighlighter />);
        expect(addEventListenerSpy).toHaveBeenCalled();
    });

    it("removes event listeners on unmount", () => {
        document.body.innerHTML = `
            <div class="toc-nav-contents">
                <a href="#intro">Intro</a>
            </div>
            <article>
                <h2 id="intro">Introduction</h2>
            </article>
            <footer></footer>
        `;

        const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
        const docRemoveEventListenerSpy = vi.spyOn(document, "removeEventListener");

        const { unmount } = render(<TocHighlighter />);
        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
        expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
        expect(docRemoveEventListenerSpy).toHaveBeenCalledWith(
            "context-toggled",
            expect.any(Function)
        );
    });

    it("handles empty headers array", () => {
        document.body.innerHTML = `
            <div class="toc-nav-contents">
                <a href="#intro">Intro</a>
            </div>
            <article></article>
            <footer></footer>
        `;

        expect(() => render(<TocHighlighter />)).not.toThrow();
    });

    it("works with visible headers in article", () => {
        document.body.innerHTML = `
            <div class="toc-nav-contents">
                <a href="#visible1">Visible 1</a>
            </div>
            <article>
                <h2 id="visible1">Visible 1</h2>
                <h2 id="visible2">Visible 2</h2>
            </article>
            <footer></footer>
        `;

        expect(() => render(<TocHighlighter />)).not.toThrow();
    });
});
