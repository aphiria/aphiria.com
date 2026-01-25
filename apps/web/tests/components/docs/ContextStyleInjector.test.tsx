import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ContextStyleInjector } from "@/components/docs/ContextStyleInjector";

describe("ContextStyleInjector", () => {
    it("renders a style element for framework context", () => {
        const { container } = render(<ContextStyleInjector context="framework" />);

        const style = container.querySelector("style");
        expect(style).not.toBeNull();
        expect(style?.textContent).toBe(".context-library { display: none; }");
    });

    it("renders a style element for library context", () => {
        const { container } = render(<ContextStyleInjector context="library" />);

        const style = container.querySelector("style");
        expect(style).not.toBeNull();
        expect(style?.textContent).toBe(".context-framework { display: none; }");
    });

    it("updates style content when context changes", () => {
        const { container, rerender } = render(<ContextStyleInjector context="framework" />);

        let style = container.querySelector("style");
        expect(style?.textContent).toBe(".context-library { display: none; }");

        rerender(<ContextStyleInjector context="library" />);

        style = container.querySelector("style");
        expect(style?.textContent).toBe(".context-framework { display: none; }");
    });
});
