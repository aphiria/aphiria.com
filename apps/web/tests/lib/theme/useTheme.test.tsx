import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTheme } from "@/lib/theme/useTheme";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import type { ReactNode } from "react";

describe("useTheme", () => {
    beforeEach(() => {
        // Clear DOM attribute before each test
        document.documentElement.removeAttribute("data-theme");
    });

    describe("when used inside ThemeProvider", () => {
        it("returns theme context value", () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider>{children}</ThemeProvider>
                ),
            });

            expect(result.current).toHaveProperty("theme");
            expect(result.current).toHaveProperty("setTheme");
            expect(result.current).toHaveProperty("toggleTheme");
        });

        it("returns correct theme value", () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
                ),
            });

            expect(result.current.theme).toBe("dark");
        });

        it("returns setTheme function", () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider>{children}</ThemeProvider>
                ),
            });

            expect(typeof result.current.setTheme).toBe("function");
        });

        it("returns toggleTheme function", () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider>{children}</ThemeProvider>
                ),
            });

            expect(typeof result.current.toggleTheme).toBe("function");
        });
    });

    describe("when used outside ThemeProvider", () => {
        it("throws error with helpful message", () => {
            // Suppress console.error for this test
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            // Should throw when used outside provider
            expect(() => {
                renderHook(() => useTheme());
            }).toThrow("useTheme must be used within ThemeProvider");

            consoleSpy.mockRestore();
        });

        it("error message includes context about ThemeProvider", () => {
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            // Should throw when used outside provider
            expect(() => {
                renderHook(() => useTheme());
            }).toThrow(/ThemeProvider/);

            consoleSpy.mockRestore();
        });
    });

    describe("type safety", () => {
        it("returns Theme type ('light' | 'dark')", () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <ThemeProvider>{children}</ThemeProvider>
                ),
            });

            // TypeScript should enforce that theme is only 'light' or 'dark'
            const theme = result.current.theme;
            expect(theme === "light" || theme === "dark").toBe(true);
        });
    });
});
