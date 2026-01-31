# Theme Contracts

This directory contains TypeScript type definitions and interfaces for the dark mode toggle feature.

## Files

### theme.types.ts

Core type definitions for theme management:

- **`Theme`**: String literal union type (`"light" | "dark"`)
- **`ThemeContextValue`**: Shape of theme context (theme + toggle/set functions)
- **`ThemeProviderProps`**: Props for ThemeProvider component
- **`UseLocalStorageReturn<T>`**: Return type for useLocalStorage hook
- **`UseLocalStorageOptions<T>`**: Options for useLocalStorage hook
- **`THEME_CONSTANTS`**: Constant values (keys, defaults, attribute names)
- **`isValidTheme(value)`**: Type guard for theme validation
- **`validateTheme(value)`**: Validation function with fallback to default

## Usage

### In Component Files

```typescript
import type { Theme, ThemeContextValue } from "@/types/theme";
import { THEME_CONSTANTS, validateTheme } from "@/types/theme";

// Use types for type safety
const currentTheme: Theme = "dark";

// Use constants to avoid magic strings
const storageKey = THEME_CONSTANTS.STORAGE_KEY;

// Use validation for runtime checks
const theme = validateTheme(unknownValue);
```

### In Hook Files

```typescript
import type { ThemeContextValue, UseLocalStorageReturn } from "@/types/theme";

// Hook return type
export function useTheme(): ThemeContextValue {
  // Implementation
}

// Generic hook with options
export function useLocalStorage<T>(
  key: string,
  options: UseLocalStorageOptions<T>
): UseLocalStorageReturn<T> {
  // Implementation
}
```

### In Provider Component

```typescript
import type { ThemeProviderProps } from "@/types/theme";

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "theme-preference",
}: ThemeProviderProps) {
  // Implementation
}
```

## Design Principles

1. **Type Safety**: All theme-related code uses TypeScript for compile-time safety
2. **Runtime Validation**: Type guards and validators handle untrusted data (localStorage)
3. **Constants**: Centralized constants prevent magic strings and typos
4. **Extensibility**: Interfaces designed to accommodate future enhancements (e.g., "auto" theme)
5. **Documentation**: JSDoc comments provide inline documentation for all exported types

## Testing

All type definitions include:
- JSDoc examples showing usage patterns
- Type guards for runtime validation
- Default values for graceful degradation

Types themselves don't require unit tests, but validator functions (isValidTheme, validateTheme) should be tested:

```typescript
describe("validateTheme", () => {
  it("returns valid themes unchanged", () => {
    expect(validateTheme("light")).toBe("light");
    expect(validateTheme("dark")).toBe("dark");
  });

  it("defaults to light for invalid values", () => {
    expect(validateTheme("invalid")).toBe("light");
    expect(validateTheme(null)).toBe("light");
    expect(validateTheme(undefined)).toBe("light");
  });
});
```

## Integration with Existing Code

These types will be located at `apps/web/src/types/theme.ts` in the actual implementation.

Import paths in the main codebase will use path aliases:

```typescript
// ✅ Correct (using Next.js path alias)
import type { Theme } from "@/types/theme";

// ❌ Incorrect (relative path)
import type { Theme } from "../../types/theme";
```
