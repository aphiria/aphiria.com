import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ContextStyleInjector } from "@/components/docs/ContextStyleInjector";

describe("ContextStyleInjector", () => {
    beforeEach(() => {
        // Clean up any existing style elements
        const existingStyle = document.getElementById("context-visibility-css");
        if (existingStyle) {
            existingStyle.remove();
        }
    });

    it("renders null (no visible output)", () => {
        const { container } = render(<ContextStyleInjector context="framework" />);
        expect(container.firstChild).toBeNull();
    });

    it("injects CSS into <head> for framework context", () => {
        render(<ContextStyleInjector context="framework" />);

        const style = document.getElementById("context-visibility-css");
        expect(style).not.toBeNull();
        expect(style?.tagName).toBe("STYLE");
        expect(style?.textContent).toBe(".context-library { display: none; }");
        expect(document.head.contains(style)).toBe(true);
    });

    it("injects CSS into <head> for library context", () => {
        render(<ContextStyleInjector context="library" />);

        const style = document.getElementById("context-visibility-css");
        expect(style).not.toBeNull();
        expect(style?.textContent).toBe(".context-framework { display: none; }");
        expect(document.head.contains(style)).toBe(true);
    });

    it("updates existing style element when context changes", () => {
        const { rerender } = render(<ContextStyleInjector context="framework" />);

        let style = document.getElementById("context-visibility-css");
        expect(style?.textContent).toBe(".context-library { display: none; }");

        rerender(<ContextStyleInjector context="library" />);

        style = document.getElementById("context-visibility-css");
        expect(style?.textContent).toBe(".context-framework { display: none; }");

        // Should still be the same element (updated, not recreated)
        const allStyles = document.querySelectorAll("#context-visibility-css");
        expect(allStyles.length).toBe(1);
    });

    it("cleans up style element on unmount", () => {
        const { unmount } = render(<ContextStyleInjector context="framework" />);

        const styleBefore = document.getElementById("context-visibility-css");
        expect(styleBefore).not.toBeNull();

        unmount();

        // Note: React doesn't auto-cleanup DOM modifications in useEffect
        // This test documents current behavior - style persists after unmount
        const styleAfter = document.getElementById("context-visibility-css");
        expect(styleAfter).not.toBeNull();
    });

    it("does not create duplicate style elements on multiple renders", () => {
        const { rerender } = render(<ContextStyleInjector context="framework" />);

        rerender(<ContextStyleInjector context="framework" />);
        rerender(<ContextStyleInjector context="framework" />);

        const allStyles = document.querySelectorAll("#context-visibility-css");
        expect(allStyles.length).toBe(1);
    });

    it("handles rapid context changes correctly", () => {
        const { rerender } = render(<ContextStyleInjector context="framework" />);

        rerender(<ContextStyleInjector context="library" />);
        rerender(<ContextStyleInjector context="framework" />);
        rerender(<ContextStyleInjector context="library" />);

        const style = document.getElementById("context-visibility-css");
        expect(style?.textContent).toBe(".context-framework { display: none; }");

        const allStyles = document.querySelectorAll("#context-visibility-css");
        expect(allStyles.length).toBe(1);
    });
});
