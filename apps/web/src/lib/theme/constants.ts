/**
 * Theme-related constants
 *
 * Centralized constant values for theme management to avoid magic strings
 */

import type { Theme } from "@/types/theme";

/**
 * Available theme values
 */
export const THEMES = {
    LIGHT: "light" as const,
    DARK: "dark" as const,
} as const;

/**
 * Cookie name for theme preference
 */
export const COOKIE_NAME = "theme-preference";

/**
 * Default theme (fallback when no preference stored)
 */
export const DEFAULT_THEME: Theme = "light";

/**
 * HTML attribute used to apply theme on document element
 */
export const DATA_ATTRIBUTE = "data-theme";
