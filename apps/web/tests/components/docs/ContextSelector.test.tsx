import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ContextSelector } from "@/components/docs/ContextSelector";
import { ReadonlyURLSearchParams } from "next/navigation";

// Mock dependencies
const mockSetContextCookie = vi.fn();
const mockToggleContextVisibility = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("@/lib/cookies/context-cookie.client", () => ({
    setContextCookie: (ctx: string) => mockSetContextCookie(ctx),
}));

vi.mock("@/lib/context/toggler", () => ({
    toggleContextVisibility: (ctx: string) => mockToggleContextVisibility(ctx),
}));

vi.mock("next/navigation", () => ({
    useSearchParams: () => mockSearchParams as ReadonlyURLSearchParams,
}));

describe("ContextSelector", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSearchParams.delete("context");
        // Mock history.replaceState
        vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("renders context selector with label and dropdown", () => {
        render(<ContextSelector initialContext="framework" />);

        expect(screen.getByLabelText(/Context:/)).toBeInTheDocument();
        expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("shows framework and library options", () => {
        render(<ContextSelector initialContext="framework" />);

        const select = screen.getByRole("combobox");
        const options = select.querySelectorAll("option");

        expect(options).toHaveLength(2);
        expect(options[0]).toHaveValue("framework");
        expect(options[0]).toHaveTextContent("Framework");
        expect(options[1]).toHaveValue("library");
        expect(options[1]).toHaveTextContent("Library");
    });

    it("defaults to initialContext", () => {
        render(<ContextSelector initialContext="library" />);

        const select = screen.getByRole("combobox") as HTMLSelectElement;
        expect(select.value).toBe("library");
    });

    it("calls toggleContextVisibility on mount with initialContext", () => {
        render(<ContextSelector initialContext="framework" />);

        expect(mockToggleContextVisibility).toHaveBeenCalledWith("framework");
    });

    it("updates cookie, visibility, and URL when user changes selection", () => {
        render(<ContextSelector initialContext="framework" />);

        const select = screen.getByRole("combobox");
        fireEvent.change(select, { target: { value: "library" } });

        expect(mockSetContextCookie).toHaveBeenCalledWith("library");
        expect(mockToggleContextVisibility).toHaveBeenCalledWith("library");
        expect(window.history.replaceState).toHaveBeenCalled();
    });

    it("updates select value when user changes selection", () => {
        render(<ContextSelector initialContext="framework" />);

        const select = screen.getByRole("combobox") as HTMLSelectElement;
        expect(select.value).toBe("framework");

        fireEvent.change(select, { target: { value: "library" } });

        expect(select.value).toBe("library");
    });

    it("applies correct title to label", () => {
        const { container } = render(<ContextSelector initialContext="framework" />);

        const label = container.querySelector(
            'label[title="Choose the context to view the documentation with"]'
        );
        expect(label).toBeInTheDocument();
    });
});
