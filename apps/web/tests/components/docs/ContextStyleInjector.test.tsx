import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ContextStyleInjector } from "@/components/docs/ContextStyleInjector";

describe("ContextStyleInjector", () => {
    it("renders wrapper with data-context attribute for framework", () => {
        const { container } = render(
            <ContextStyleInjector context="framework">
                <div>Test content</div>
            </ContextStyleInjector>
        );

        const wrapper = container.querySelector("[data-context]");
        expect(wrapper).not.toBeNull();
        expect(wrapper?.getAttribute("data-context")).toBe("framework");
    });

    it("renders wrapper with data-context attribute for library", () => {
        const { container } = render(
            <ContextStyleInjector context="library">
                <div>Test content</div>
            </ContextStyleInjector>
        );

        const wrapper = container.querySelector("[data-context]");
        expect(wrapper).not.toBeNull();
        expect(wrapper?.getAttribute("data-context")).toBe("library");
    });

    it("renders children inside the wrapper", () => {
        const { container } = render(
            <ContextStyleInjector context="framework">
                <div className="test-child">Test content</div>
            </ContextStyleInjector>
        );

        const child = container.querySelector(".test-child");
        expect(child).not.toBeNull();
        expect(child?.textContent).toBe("Test content");
    });

    it("updates data-context when context changes", () => {
        const { container, rerender } = render(
            <ContextStyleInjector context="framework">
                <div>Test content</div>
            </ContextStyleInjector>
        );

        let wrapper = container.querySelector("[data-context]");
        expect(wrapper?.getAttribute("data-context")).toBe("framework");

        rerender(
            <ContextStyleInjector context="library">
                <div>Test content</div>
            </ContextStyleInjector>
        );

        wrapper = container.querySelector("[data-context]");
        expect(wrapper?.getAttribute("data-context")).toBe("library");
    });
});
