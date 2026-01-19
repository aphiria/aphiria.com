import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ContextSelector } from "@/components/docs/ContextSelector";

// Mock dependencies
const mockRouter = { push: vi.fn(), replace: vi.fn() };
const mockSearchParams = new URLSearchParams();
const mockSetContextCookie = vi.fn();
const mockToggleContextVisibility = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => mockRouter,
    useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/cookies/context-cookie.client", () => ({
    setContextCookie: (ctx: string) => mockSetContextCookie(ctx),
}));

vi.mock("@/lib/context/toggler", () => ({
    toggleContextVisibility: (ctx: string) => mockToggleContextVisibility(ctx),
}));

describe("ContextSelector", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.history methods
        Object.defineProperty(window, "history", {
            value: {
                replaceState: vi.fn(),
                state: {},
            },
            writable: true,
        });
        Object.defineProperty(window, "location", {
            value: {
                pathname: "/docs/1.x/introduction",
            },
            writable: true,
        });
    });

    afterEach(() => {
        cleanup();
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

    it("calls toggleContextVisibility on mount", () => {
        render(<ContextSelector initialContext="framework" />);

        expect(mockToggleContextVisibility).toHaveBeenCalledWith("framework");
    });

    it("updates cookie, visibility, and URL when changed", () => {
        render(<ContextSelector initialContext="framework" />);

        const select = screen.getByRole("combobox");
        fireEvent.change(select, { target: { value: "library" } });

        expect(mockSetContextCookie).toHaveBeenCalledWith("library");
        expect(mockToggleContextVisibility).toHaveBeenCalledWith("library");
        expect(window.history.replaceState).toHaveBeenCalled();
    });

    it("updates select value when changed", () => {
        render(<ContextSelector initialContext="framework" />);

        const select = screen.getByRole("combobox") as HTMLSelectElement;
        expect(select.value).toBe("framework");

        fireEvent.change(select, { target: { value: "library" } });

        expect(select.value).toBe("library");
    });

    it("preserves existing search params when updating URL", () => {
        mockSearchParams.set("foo", "bar");

        render(<ContextSelector initialContext="framework" />);

        const select = screen.getByRole("combobox");
        fireEvent.change(select, { target: { value: "library" } });

        const callArgs = (window.history.replaceState as any).mock.calls[1];
        const newUrl = callArgs[2];
        expect(newUrl).toContain("context=library");
        expect(newUrl).toContain("foo=bar");
    });

    it("adds context param to URL on mount if missing", () => {
        mockSearchParams.delete("context");

        render(<ContextSelector initialContext="framework" />);

        expect(window.history.replaceState).toHaveBeenCalled();
        const callArgs = (window.history.replaceState as any).mock.calls[0];
        const newUrl = callArgs[2];
        expect(newUrl).toContain("context=framework");
    });

    it("applies correct title to label", () => {
        const { container } = render(<ContextSelector initialContext="framework" />);

        const label = container.querySelector(
            'label[title="Choose the context to view the documentation with"]'
        );
        expect(label).toBeInTheDocument();
    });
});
