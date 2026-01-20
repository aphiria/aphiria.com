import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { DocSearch } from "@/components/docs/DocSearch";

// Mock fetch
global.fetch = vi.fn() as ReturnType<typeof vi.fn>;

// Mock runtime config
vi.mock("@/lib/runtime-config", () => ({
    getRuntimeConfig: vi.fn(() => ({
        apiUri: "http://localhost:8080",
    })),
}));

describe("DocSearch", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        Object.defineProperty(window, "location", {
            value: { hash: "", href: "" },
            writable: true,
        });
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("renders search input", () => {
        render(<DocSearch />);
        expect(screen.getByPlaceholderText("Search docs")).toBeInTheDocument();
    });

    it("debounces search input", async () => {
        vi.mocked(global.fetch).mockResolvedValue({
            json: async () => [],
        } as Response);

        render(<DocSearch />);
        const input = screen.getByPlaceholderText("Search docs");

        fireEvent.change(input, { target: { value: "test" } });
        expect(global.fetch).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(250);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("shows no results message when search returns empty", async () => {
        vi.mocked(global.fetch).mockResolvedValue({
            json: async () => [],
        } as Response);

        render(<DocSearch />);
        const input = screen.getByPlaceholderText("Search docs");

        fireEvent.change(input, { target: { value: "test" } });
        await vi.advanceTimersByTimeAsync(250);

        expect(screen.getByText(/No results for "test"/)).toBeInTheDocument();
    });

    it("displays search results", async () => {
        vi.useRealTimers(); // Switch to real timers for this test

        const mockResults = [
            {
                htmlElementType: "p",
                highlightedInnerText: "Test result",
                link: "/docs/1.x/test",
                highlightedH1: null,
                highlightedH2: "Section",
                highlightedH3: null,
                highlightedH4: null,
                highlightedH5: null,
            },
        ];

        vi.mocked(global.fetch).mockResolvedValue({
            json: async () => mockResults,
        } as Response);

        render(<DocSearch />);
        const input = screen.getByPlaceholderText("Search docs");

        fireEvent.change(input, { target: { value: "test" } });

        await waitFor(
            () => {
                expect(screen.getByText("Test result")).toBeInTheDocument();
            },
            { timeout: 500 }
        );

        vi.useFakeTimers(); // Switch back
    });

    it("shows error message on fetch failure", async () => {
        vi.useRealTimers();

        vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        render(<DocSearch />);
        const input = screen.getByPlaceholderText("Search docs");

        fireEvent.change(input, { target: { value: "test" } });

        await waitFor(
            () => {
                expect(screen.getByText("There was an error")).toBeInTheDocument();
            },
            { timeout: 500 }
        );

        consoleSpy.mockRestore();
        vi.useFakeTimers();
    });

    it("hides results when input is cleared", async () => {
        vi.useRealTimers();

        vi.mocked(global.fetch).mockResolvedValue({
            json: async () => [
                {
                    htmlElementType: "p",
                    highlightedInnerText: "Test",
                    link: "/test",
                    highlightedH1: null,
                    highlightedH2: null,
                    highlightedH3: null,
                    highlightedH4: null,
                    highlightedH5: null,
                },
            ],
        });

        const { container } = render(<DocSearch />);
        const input = screen.getByPlaceholderText("Search docs") as HTMLInputElement;

        fireEvent.change(input, { target: { value: "test" } });

        await waitFor(
            () => {
                expect(screen.getByText("Test")).toBeInTheDocument();
            },
            { timeout: 500 }
        );

        fireEvent.change(input, { target: { value: "" } });

        // Verify results list is hidden (display: none)
        const resultsList = container.querySelector(".search-results") as HTMLElement;
        await waitFor(
            () => {
                expect(resultsList).toHaveStyle({ display: "none" });
            },
            { timeout: 500 }
        );

        vi.useFakeTimers();
    });

    it("focuses input on mount when no hash", () => {
        render(<DocSearch />);
        const input = screen.getByPlaceholderText("Search docs");
        expect(input).toHaveFocus();
    });

    it("does not focus input when hash present", () => {
        Object.defineProperty(window, "location", {
            value: { hash: "#section" },
            writable: true,
        });

        render(<DocSearch />);
        const input = screen.getByPlaceholderText("Search docs");
        expect(input).not.toHaveFocus();
    });

    it("shows results on focus when query exists", async () => {
        vi.useRealTimers();

        vi.mocked(global.fetch).mockResolvedValue({
            json: async () => [
                {
                    htmlElementType: "p",
                    highlightedInnerText: "Test",
                    link: "/test",
                    highlightedH1: null,
                    highlightedH2: null,
                    highlightedH3: null,
                    highlightedH4: null,
                    highlightedH5: null,
                },
            ],
        });

        render(<DocSearch />);
        const input = screen.getByPlaceholderText("Search docs");

        fireEvent.change(input, { target: { value: "test" } });

        await waitFor(
            () => {
                expect(screen.getByText("Test")).toBeInTheDocument();
            },
            { timeout: 500 }
        );

        // Click outside to hide
        fireEvent.click(document.body);

        // Focus back to show results
        fireEvent.focus(input);

        const resultsList = screen.getByRole("list");
        expect(resultsList).toHaveStyle({ display: "block" });

        vi.useFakeTimers();
    });

    it("uses NEXT_PUBLIC_API_URI env var when available", async () => {
        const { getRuntimeConfig } = await import("@/lib/runtime-config");
        vi.mocked(getRuntimeConfig).mockReturnValue({
            apiUri: "https://api.example.com",
        });

        vi.mocked(global.fetch).mockResolvedValue({
            json: async () => [],
        } as Response);

        render(<DocSearch />);
        const input = screen.getByPlaceholderText("Search docs");

        fireEvent.change(input, { target: { value: "test" } });
        await vi.advanceTimersByTimeAsync(250);

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("https://api.example.com"),
            expect.any(Object)
        );
    });

    it("applies correct CSS classes", () => {
        const { container } = render(<DocSearch />);

        expect(container.querySelector(".doc-search")).toBeInTheDocument();
        expect(container.querySelector(".search-results")).toBeInTheDocument();
    });
});
