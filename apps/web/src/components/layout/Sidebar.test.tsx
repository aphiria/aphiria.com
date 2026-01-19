import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders children inside nav element", () => {
        render(
            <Sidebar>
                <div>Test Content</div>
            </Sidebar>
        );

        const nav = screen.getByRole("navigation");
        expect(nav).toBeInTheDocument();
        expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("applies correct CSS class", () => {
        render(
            <Sidebar>
                <div>Test</div>
            </Sidebar>
        );

        const nav = screen.getByRole("navigation");
        expect(nav).toHaveClass("side-nav");
    });

    it("applies custom id when provided", () => {
        render(
            <Sidebar id="custom-sidebar">
                <div>Test</div>
            </Sidebar>
        );

        const nav = screen.getByRole("navigation");
        expect(nav).toHaveAttribute("id", "custom-sidebar");
    });

    it("renders without id when not provided", () => {
        render(
            <Sidebar>
                <div>Test</div>
            </Sidebar>
        );

        const nav = screen.getByRole("navigation");
        expect(nav).not.toHaveAttribute("id");
    });
});
