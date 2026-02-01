/**
 * Theme type definitions for dark mode toggle feature
 *
 * This file defines the TypeScript contracts for theme management,
 * including theme values, context shape, and hook return types.
 */

/**
 * Available theme options
 *
 * @remarks
 * - "light": Light color theme (default)
 * - "dark": Dark color theme
 *
 * Future enhancements may add "auto" for OS preference detection
 */
export type Theme = "light" | "dark";

/**
 * Theme context value provided by ThemeProvider
 *
 * @remarks
 * Consumed via useTheme() custom hook
 *
 * @example
 * ```tsx
 * const { theme, toggleTheme } = useTheme();
 *
 * return (
 *   <button onClick={toggleTheme}>
 *     Current theme: {theme}
 *   </button>
 * );
 * ```
 */
export interface ThemeContextValue {
    /**
     * Currently active theme
     */
    theme: Theme;

    /**
     * Toggle between light and dark themes
     *
     * @remarks
     * - Idempotent: safe to call multiple times
     * - Updates theme cookie
     * - Updates document.documentElement.dataset.theme
     * - Triggers re-render of consuming components
     */
    toggleTheme: () => void;

    /**
     * Set a specific theme
     *
     * @param theme - Theme to activate ("light" or "dark")
     *
     * @remarks
     * - Validates input (defaults to "light" if invalid)
     * - Updates theme cookie
     * - Updates document.documentElement.dataset.theme
     * - Triggers re-render of consuming components
     *
     * @example
     * ```tsx
     * setTheme("dark"); // Switch to dark mode
     * ```
     */
    setTheme: (theme: Theme) => void;
}

/**
 * Props for ThemeProvider component
 */
export interface ThemeProviderProps {
    /**
     * Child components to wrap with theme context
     */
    children: React.ReactNode;

    /**
     * Theme resolved from cookie (server-side)
     *
     * @remarks
     * This is always provided by the server after reading the theme cookie.
     * Prevents flash of wrong theme on initial page load.
     */
    defaultTheme: Theme;
}
