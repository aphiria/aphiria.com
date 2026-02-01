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
   * - Updates localStorage (if available)
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
   * - Updates localStorage (if available)
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
   * Default theme to use if no preference is stored
   *
   * @default "light"
   */
  defaultTheme?: Theme;

  /**
   * localStorage key for storing theme preference
   *
   * @default "theme-preference"
   */
  storageKey?: string;
}

/**
 * Return type for useLocalStorage hook
 *
 * @template T - Type of stored value
 */
export type UseLocalStorageReturn<T> = [
  /**
   * Current value from localStorage (or default if unavailable)
   */
  value: T,

  /**
   * Update stored value
   *
   * @param newValue - New value to store
   *
   * @remarks
   * - Handles storage errors gracefully (logs warning)
   * - Accepts value or updater function (like useState)
   */
  setValue: (newValue: T | ((prev: T) => T)) => void
];

/**
 * Options for useLocalStorage hook
 *
 * @template T - Type of stored value
 */
export interface UseLocalStorageOptions<T> {
  /**
   * Default value if localStorage is unavailable or empty
   */
  defaultValue: T;

  /**
   * Custom serializer (default: JSON.stringify)
   */
  serialize?: (value: T) => string;

  /**
   * Custom deserializer (default: JSON.parse)
   */
  deserialize?: (value: string) => T;

  /**
   * Validator function to check if stored value is valid
   *
   * @param value - Value read from localStorage
   * @returns true if valid, false if should use defaultValue
   */
  validate?: (value: unknown) => value is T;
}

/**
 * Constants for theme management
 */
export const THEME_CONSTANTS = {
  /**
   * Available theme values
   */
  THEMES: {
    LIGHT: "light" as const,
    DARK: "dark" as const,
  },

  /**
   * Default localStorage key for theme preference
   */
  STORAGE_KEY: "theme-preference",

  /**
   * Default theme (fallback when no preference stored)
   */
  DEFAULT_THEME: "light" as const,

  /**
   * HTML attribute used to apply theme
   */
  DATA_ATTRIBUTE: "data-theme",
} as const;

/**
 * Type guard to check if a value is a valid Theme
 *
 * @param value - Value to check
 * @returns true if value is "light" or "dark"
 *
 * @example
 * ```tsx
 * const stored = localStorage.getItem("theme-preference");
 * if (isValidTheme(stored)) {
 *   setTheme(stored);
 * }
 * ```
 */
export function isValidTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Validate and normalize a theme value
 *
 * @param value - Value to validate
 * @returns Valid theme (defaults to "light" if invalid)
 *
 * @example
 * ```tsx
 * const stored = localStorage.getItem("theme-preference");
 * const theme = validateTheme(stored); // Always returns valid theme
 * ```
 */
export function validateTheme(value: unknown): Theme {
  if (isValidTheme(value)) {
    return value;
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `Invalid theme value: ${JSON.stringify(value)}. Defaulting to "${THEME_CONSTANTS.DEFAULT_THEME}".`
    );
  }

  return THEME_CONSTANTS.DEFAULT_THEME;
}
