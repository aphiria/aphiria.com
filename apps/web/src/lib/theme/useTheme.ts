"use client";

import { useContext } from "react";
import { ThemeContext } from "@/components/theme/ThemeProvider";
import type { ThemeContextValue } from "@/types/theme";

/**
 * Custom hook to access theme context
 *
 * @returns Theme context value with current theme and toggle/set functions
 * @throws Error if used outside ThemeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, toggleTheme } = useTheme();
 *
 *   return (
 *     <button onClick={toggleTheme}>
 *       Current theme: {theme}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }

    return context;
}
