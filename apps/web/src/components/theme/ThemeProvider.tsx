"use client";

import { createContext, useEffect, useState } from "react";
import type { Theme, ThemeContextValue, ThemeProviderProps } from "@/types/theme";
import { setThemeCookie } from "@/lib/cookies/theme-cookie.client";
import { DATA_ATTRIBUTE } from "@/lib/theme/constants";

/**
 * Theme context for providing theme state throughout the app
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * ThemeProvider component
 *
 * Provides theme context to the entire application with cookie persistence
 * and SSR support. Theme is set server-side to prevent flash of wrong theme.
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="light">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
    // Initialize with server-provided theme to avoid hydration mismatch
    const [theme, setTheme] = useState<Theme>(defaultTheme);

    // Update document attribute and cookie when theme changes
    useEffect(() => {
        document.documentElement.setAttribute(DATA_ATTRIBUTE, theme);
        setThemeCookie(theme);
    }, [theme]);

    /**
     * Toggle between light and dark themes
     */
    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
    };

    /**
     * Set a specific theme
     */
    const setThemeValue = (newTheme: Theme) => {
        setTheme(newTheme);
    };

    const value: ThemeContextValue = {
        theme,
        toggleTheme,
        setTheme: setThemeValue,
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
