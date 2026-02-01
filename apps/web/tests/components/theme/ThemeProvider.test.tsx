import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { useTheme } from "@/lib/theme/useTheme";
import type { ReactNode } from "react";

// Mock the cookie helpers
vi.mock("@/lib/cookies/theme-cookie.client", () => ({
    setThemeCookie: vi.fn(),
    getThemeCookie: vi.fn(() => null),
}));

describe("ThemeProvider", () => {
    beforeEach(() => {
        // Clear data-theme attribute
        document.documentElement.removeAttribute("data-theme");
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("initialization", () => {
        it("uses defaultTheme prop (light)", () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
                ),
            });

            expect(result.current.theme).toBe("light");
        });

        it("uses defaultTheme prop (dark)", () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
                ),
            });

            expect(result.current.theme).toBe("dark");
        });
    });

    describe("theme switching", () => {
        it("toggles theme from light to dark", () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
                ),
            });

            expect(result.current.theme).toBe("light");

            act(() => {
                result.current.toggleTheme();
            });

            expect(result.current.theme).toBe("dark");
        });

        it("toggles theme from dark to light", () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
                ),
            });

            expect(result.current.theme).toBe("dark");

            act(() => {
                result.current.toggleTheme();
            });

            expect(result.current.theme).toBe("light");
        });

        it("sets theme to specific value", () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
                ),
            });

            act(() => {
                result.current.setTheme("dark");
            });

            expect(result.current.theme).toBe("dark");

            act(() => {
                result.current.setTheme("light");
            });

            expect(result.current.theme).toBe("light");
        });
    });

    describe("persistence", () => {
        it("calls setThemeCookie when theme is toggled", async () => {
            const { setThemeCookie } = await import("@/lib/cookies/theme-cookie.client");

            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
                ),
            });

            act(() => {
                result.current.toggleTheme();
            });

            expect(setThemeCookie).toHaveBeenCalledWith("dark");
        });

        it("calls setThemeCookie when theme is explicitly set", async () => {
            const { setThemeCookie } = await import("@/lib/cookies/theme-cookie.client");

            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
                ),
            });

            act(() => {
                result.current.setTheme("dark");
            });

            expect(setThemeCookie).toHaveBeenCalledWith("dark");
        });
    });

    describe("DOM updates", () => {
        it("updates data-theme attribute on documentElement when theme changes", () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
                ),
            });

            act(() => {
                result.current.setTheme("dark");
            });

            expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

            act(() => {
                result.current.setTheme("light");
            });

            expect(document.documentElement.getAttribute("data-theme")).toBe("light");
        });
    });

    describe("children rendering", () => {
        it("renders children components", () => {
            render(
                <ThemeProvider defaultTheme="light">
                    <div data-testid="test-child">Test Content</div>
                </ThemeProvider>
            );

            expect(screen.getByTestId("test-child")).toBeInTheDocument();
            expect(screen.getByText("Test Content")).toBeInTheDocument();
        });
    });
});
