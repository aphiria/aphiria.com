import { Context } from "@/types/context";

/**
 * Default context value
 */
export const DEFAULT_CONTEXT: Context = "framework";

/**
 * Parse a string value into a valid Context, returning fallback if invalid
 *
 * Client-safe: Can be used in both server and client components
 *
 * @param value - Value to parse (from URL param, cookie, etc.)
 * @param fallback - Fallback context if value is invalid
 * @returns Valid context value
 */
export function parseContext(
    value: string | string[] | null | undefined,
    fallback: Context = DEFAULT_CONTEXT
): Context {
    // Handle array values (from Next.js searchParams)
    const stringValue = Array.isArray(value) ? value[0] : value;

    if (stringValue === "framework" || stringValue === "library") {
        return stringValue;
    }

    return fallback;
}
