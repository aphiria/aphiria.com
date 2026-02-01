import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Mock the cookie helpers
vi.mock("@/lib/cookies/theme-cookie.client", () => ({
    setThemeCookie: vi.fn(),
    getThemeCookie: vi.fn(() => null),
}));

describe("ThemeToggle", () => {
    beforeEach(() => {
        // Clear data-theme attribute
        document.documentElement.removeAttribute("data-theme");
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    describe("rendering", () => {
        it("renders a button element", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            expect(button).toBeInTheDocument();
        });

        it("is centered in a container div", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            const container = button.parentElement;

            expect(container?.style.textAlign).toBe("center");
        });
    });

    describe("icon display", () => {
        it("shows moon icon when theme is light", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            const svg = button.querySelector("svg");

            expect(svg).toBeInTheDocument();
            // Moon icon has a path with the characteristic crescent shape
            expect(svg?.querySelector('path[d*="12.79"]')).toBeInTheDocument();
        });

        it("shows sun icon when theme is dark", () => {
            document.documentElement.setAttribute("data-theme", "dark");

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            const svg = button.querySelector("svg");

            expect(svg).toBeInTheDocument();
            // Sun icon has a circle and multiple lines
            expect(svg?.querySelector("circle")).toBeInTheDocument();
            expect(svg?.querySelectorAll("line").length).toBeGreaterThan(0);
        });
    });

    describe("accessibility", () => {
        it("has aria-label when theme is light", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
        });

        it("has aria-label when theme is dark", () => {
            document.documentElement.setAttribute("data-theme", "dark");

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            expect(button).toHaveAttribute("aria-label", "Switch to light mode");
        });

        it("has type='button' attribute", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            expect(button).toHaveAttribute("type", "button");
        });

        it("has aria-hidden on SVG icon", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const svg = screen.getByRole("button", { name: /switch to/i }).querySelector("svg");
            expect(svg).toHaveAttribute("aria-hidden", "true");
        });
    });

    describe("user interaction", () => {
        it("toggles theme from light to dark on click", async () => {
            const user = userEvent.setup();

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });

            // Initially shows "Switch to dark mode"
            expect(button).toHaveAttribute("aria-label", "Switch to dark mode");

            // Click the button
            await user.click(button);

            // Should now show "Switch to light mode"
            expect(button).toHaveAttribute("aria-label", "Switch to light mode");
        });

        it("toggles theme from dark to light on click", async () => {
            const user = userEvent.setup();
            document.documentElement.setAttribute("data-theme", "dark");

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });

            // Initially shows "Switch to light mode"
            expect(button).toHaveAttribute("aria-label", "Switch to light mode");

            // Click the button
            await user.click(button);

            // Should now show "Switch to dark mode"
            expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
        });

        it("changes icon when toggled", async () => {
            const user = userEvent.setup();

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            let svg = button.querySelector("svg");

            // Initially shows moon icon (light mode)
            expect(svg?.querySelector('path[d*="12.79"]')).toBeInTheDocument();
            expect(svg?.querySelector("circle")).not.toBeInTheDocument();

            // Click to switch to dark mode
            await user.click(button);

            svg = button.querySelector("svg");

            // Now shows sun icon (dark mode)
            expect(svg?.querySelector("circle")).toBeInTheDocument();
            expect(svg?.querySelector('path[d*="12.79"]')).not.toBeInTheDocument();
        });

        it("is keyboard accessible with Enter key", async () => {
            const user = userEvent.setup();

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            button.focus();

            expect(button).toHaveAttribute("aria-label", "Switch to dark mode");

            // Press Enter key
            await user.keyboard("{Enter}");

            expect(button).toHaveAttribute("aria-label", "Switch to light mode");
        });

        it("is keyboard accessible with Space key", async () => {
            const user = userEvent.setup();

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            button.focus();

            expect(button).toHaveAttribute("aria-label", "Switch to dark mode");

            // Press Space key
            await user.keyboard(" ");

            expect(button).toHaveAttribute("aria-label", "Switch to light mode");
        });
    });

    describe("styling", () => {
        it("has cursor pointer", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            expect(button.style.cursor).toBe("pointer");
        });

        it("has no border", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            expect(button.style.border).toContain("none");
        });

        it("has transparent background", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            expect(button.style.background).toContain("none");
        });

        it("has no transition to prevent flicker", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            expect(button.style.transition).toBe("none");
        });

        it("uses theme color for icon", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            expect(button.style.color).toBe("var(--color-text-primary)");
        });
    });

    describe("integration with ThemeProvider", () => {
        it("updates DOM data-theme attribute when clicked", async () => {
            const user = userEvent.setup();

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            expect(document.documentElement.getAttribute("data-theme")).toBe("light");

            const button = screen.getByRole("button", { name: /switch to/i });
            await user.click(button);

            expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
        });

        it("calls setThemeCookie when clicked", async () => {
            const user = userEvent.setup();
            const { setThemeCookie } = await import("@/lib/cookies/theme-cookie.client");

            render(
                <ThemeProvider defaultTheme="light">
                    <ThemeToggle />
                </ThemeProvider>
            );

            const button = screen.getByRole("button", { name: /switch to/i });
            await user.click(button);

            expect(setThemeCookie).toHaveBeenCalledWith("dark");
        });
    });
});
