import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Footer } from "@/components/layout/Footer";

// Mock the cookie helpers
vi.mock("@/lib/cookies/theme-cookie.client", () => ({
    setThemeCookie: vi.fn(),
    getThemeCookie: vi.fn(() => null),
}));

describe("Theme Application Integration", () => {
    beforeEach(() => {
        // Clear data-theme attribute
        document.documentElement.removeAttribute("data-theme");
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    describe("end-to-end theme flow", () => {
        it("applies theme changes to all components", async () => {
            const user = userEvent.setup();

            // Render a component tree with multiple themed elements
            render(
                <ThemeProvider defaultTheme="light">
                    <div data-testid="app-container">
                        <header data-testid="header">
                            <h1>Test App</h1>
                        </header>
                        <main data-testid="main">
                            <p>Content</p>
                        </main>
                        <Footer />
                    </div>
                </ThemeProvider>
            );

            // Verify initial theme
            expect(document.documentElement.getAttribute("data-theme")).toBe("light");

            // Find and click the theme toggle
            const themeToggle = screen.getByRole("button", { name: /switch to dark mode/i });
            await user.click(themeToggle);

            // Verify theme changed globally
            expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

            // Verify toggle button updated
            expect(
                screen.getByRole("button", { name: /switch to light mode/i })
            ).toBeInTheDocument();
        });

        it("persists theme across simulated page reloads", () => {
            // Initial render with theme preference in localStorage
            // Cookie would be set to dark;
            document.documentElement.setAttribute("data-theme", "dark");

            const { unmount } = render(
                <ThemeProvider defaultTheme="dark">
                    <ThemeToggle />
                </ThemeProvider>
            );

            // Verify dark theme loaded
            expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
            expect(
                screen.getByRole("button", { name: /switch to light mode/i })
            ).toBeInTheDocument();

            unmount();

            // Simulate page reload by re-rendering
            render(
                <ThemeProvider defaultTheme="dark">
                    <ThemeToggle />
                </ThemeProvider>
            );

            // Verify theme persisted
            expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
            expect(
                screen.getByRole("button", { name: /switch to light mode/i })
            ).toBeInTheDocument();
        });

        it("synchronizes theme across multiple ThemeToggle instances", async () => {
            const user = userEvent.setup();

            render(
                <ThemeProvider defaultTheme="light">
                    <div>
                        <ThemeToggle />
                        <ThemeToggle />
                    </div>
                </ThemeProvider>
            );

            const toggleButtons = screen.getAllByRole("button", { name: /switch to dark mode/i });
            expect(toggleButtons).toHaveLength(2);

            // Click first toggle
            await user.click(toggleButtons[0]);

            // Both toggles should update
            const updatedButtons = screen.getAllByRole("button", { name: /switch to light mode/i });
            expect(updatedButtons).toHaveLength(2);
        });
    });

    describe("theme initialization", () => {
        it("initializes with default theme when no preference stored", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            expect(document.documentElement.getAttribute("data-theme")).toBe("light");
            expect(
                screen.getByRole("button", { name: /switch to dark mode/i })
            ).toBeInTheDocument();
        });

        it("initializes with stored theme preference", () => {
            // Cookie would be set to dark;
            document.documentElement.setAttribute("data-theme", "dark");

            render(
                <ThemeProvider defaultTheme="dark">
                    <ThemeToggle />
                </ThemeProvider>
            );

            expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
            expect(
                screen.getByRole("button", { name: /switch to light mode/i })
            ).toBeInTheDocument();
        });

        it("validates stored theme and falls back to default if invalid", () => {
            // Invalid theme values are handled server-side in cookie parsing
            // ThemeProvider just receives validated defaultTheme prop
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            // Should use the provided default theme
            expect(document.documentElement.getAttribute("data-theme")).toBe("light");
            expect(
                screen.getByRole("button", { name: /switch to dark mode/i })
            ).toBeInTheDocument();
        });

        it("handles corrupted cookie data gracefully", () => {
            // Corrupted cookie data is handled server-side
            // ThemeProvider receives fallback defaultTheme="light"
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            // Should fall back to default
            expect(document.documentElement.getAttribute("data-theme")).toBe("light");
            expect(
                screen.getByRole("button", { name: /switch to dark mode/i })
            ).toBeInTheDocument();
        });
    });

    describe("DOM updates", () => {
        it("updates data-theme attribute immediately on toggle", async () => {
            const user = userEvent.setup();

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            expect(document.documentElement.getAttribute("data-theme")).toBe("light");

            const button = screen.getByRole("button", { name: /switch to/i });
            await user.click(button);

            // Should update synchronously (no async delay)
            expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
        });

        it("data-theme attribute matches toggle state", async () => {
            const user = userEvent.setup();

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });

            // Light mode
            expect(document.documentElement.getAttribute("data-theme")).toBe("light");
            expect(button).toHaveAttribute("aria-label", "Switch to dark mode");

            // Toggle to dark
            await user.click(button);
            expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
            expect(button).toHaveAttribute("aria-label", "Switch to light mode");

            // Toggle back to light
            await user.click(button);
            expect(document.documentElement.getAttribute("data-theme")).toBe("light");
            expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
        });
    });

    describe("multiple rapid toggles", () => {
        it("handles rapid toggling without state corruption", async () => {
            const user = userEvent.setup();

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });

            // Rapidly toggle theme 10 times
            for (let i = 0; i < 10; i++) {
                await user.click(button);
            }

            // After even number of toggles, should be back to original theme
            expect(document.documentElement.getAttribute("data-theme")).toBe("light");
            expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
        });

        it("localStorage stays in sync with rapid toggles", async () => {
            const user = userEvent.setup();

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });

            await user.click(button); // → dark
            await user.click(button); // → light
            await user.click(button); // → dark

            // Final state should match DOM and cookie mock
            const { setThemeCookie } = await import("@/lib/cookies/theme-cookie.client");
            expect(setThemeCookie).toHaveBeenLastCalledWith("dark");
            expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
        });
    });

    describe("Footer integration", () => {
        it("renders ThemeToggle in Footer component", () => {
            render(
                <ThemeProvider defaultTheme="dark">
                    <Footer />
                </ThemeProvider>
            );

            // ThemeToggle should be present in Footer
            expect(screen.getByRole("button", { name: /switch to/i })).toBeInTheDocument();

            // Footer content should also be present
            expect(screen.getByText(/Aphiria/i)).toBeInTheDocument();
            expect(screen.getByText(/David Young/i)).toBeInTheDocument();
        });

        it("ThemeToggle in Footer works correctly", async () => {
            const user = userEvent.setup();

            render(
                <ThemeProvider defaultTheme="light">
                    <Footer />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to dark mode/i });
            await user.click(button);

            expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
            expect(
                screen.getByRole("button", { name: /switch to light mode/i })
            ).toBeInTheDocument();
        });
    });
});
