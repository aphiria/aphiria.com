# Developer Quickstart: Dark Mode Toggle

**Feature**: Dark Mode Toggle | **Date**: 2026-01-31

## Overview

This guide explains how to use and extend the dark mode toggle feature in the Aphiria.com codebase. It covers the architecture, usage patterns, and common development tasks.

## Architecture Overview

The dark mode implementation consists of three main layers:

1. **Theme State Management**: React Context API + custom hooks
2. **Theme Styling**: CSS custom properties (CSS variables)
3. **Theme Persistence**: localStorage with SSR handling

```
┌─────────────────────────────────────────────────────────┐
│                     ThemeProvider                        │
│  (Wraps entire app, provides theme context)             │
└─────────────────────────────────────────────────────────┘
                           │
                           ├─── Provides ───┐
                           │                 │
                           ▼                 ▼
              ┌──────────────────┐   ┌──────────────────┐
              │   useTheme()     │   │  ThemeToggle     │
              │  Custom Hook     │   │   Component      │
              └──────────────────┘   └──────────────────┘
                           │                 │
                           └────── Uses ─────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │  useLocalStorage()     │
                        │  Persistence Hook      │
                        └────────────────────────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │  Browser localStorage  │
                        │  Key: theme-preference │
                        └────────────────────────┘
```

## Quick Start

### Using the Theme in Components

```typescript
import { useTheme } from "@/lib/theme/useTheme";

export function MyComponent() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### Accessing Theme in Client Components

```typescript
"use client"; // Next.js client component

import { useTheme } from "@/lib/theme/useTheme";

export function ClientFeature() {
  const { theme } = useTheme();

  // Use theme state for conditional rendering or logic
  const iconName = theme === "dark" ? "moon" : "sun";

  return <div>Theme icon: {iconName}</div>;
}
```

### Using Theme in CSS

```css
/* Component styles */
.my-component {
  background-color: var(--color-background);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.my-button {
  background-color: var(--color-accent);
  color: var(--color-background);
}
```

Available CSS custom properties (defined in `apps/web/src/app/globals.css`):

```css
:root[data-theme="light"] {
  --color-background: #ffffff;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #4a4a4a;
  --color-border: #e0e0e0;
  --color-accent: #0066cc;
  /* ... more variables */
}

:root[data-theme="dark"] {
  --color-background: #1a1a1a;
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #b0b0b0;
  --color-border: #404040;
  --color-accent: #4d9fff;
  /* ... more variables */
}
```

## Core Components

### ThemeProvider

**Location**: `apps/web/src/components/theme/ThemeProvider.tsx`

**Purpose**: Provides theme context to entire application

**Usage**: Already integrated in `apps/web/src/app/layout.tsx`

```typescript
// apps/web/src/app/layout.tsx
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* SSR theme script - prevents FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme-preference') || 'light';
                document.documentElement.setAttribute('data-theme', theme);
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

**Props**:

- `children`: React components to wrap
- `defaultTheme?`: Default theme if no preference stored (default: `"light"`)
- `storageKey?`: localStorage key (default: `"theme-preference"`)

### ThemeToggle

**Location**: `apps/web/src/components/theme/ThemeToggle.tsx`

**Purpose**: UI button for toggling theme

**Usage**:

```typescript
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Header() {
  return (
    <header>
      <nav>{/* Navigation items */}</nav>
      <ThemeToggle />
    </header>
  );
}
```

**Features**:

- Accessible (keyboard navigation, ARIA labels)
- Icon changes based on theme (sun/moon)
- Screen reader announcements

## Core Hooks

### useTheme

**Location**: `apps/web/src/lib/theme/useTheme.ts`

**Purpose**: Access theme state and toggle function

**Usage**:

```typescript
import { useTheme } from "@/lib/theme/useTheme";

export function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();

  // Toggle between light/dark
  const handleToggle = () => {
    toggleTheme();
  };

  // Set specific theme
  const forceDarkMode = () => {
    setTheme("dark");
  };

  return <button onClick={handleToggle}>Toggle</button>;
}
```

**Return Type**:

```typescript
interface ThemeContextValue {
  theme: Theme; // "light" | "dark"
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}
```

### useLocalStorage

**Location**: `apps/web/src/lib/theme/useLocalStorage.ts`

**Purpose**: Reusable hook for localStorage persistence (used internally by ThemeProvider)

**Usage** (if you need custom localStorage):

```typescript
import { useLocalStorage } from "@/lib/theme/useLocalStorage";

export function MyComponent() {
  const [value, setValue] = useLocalStorage("my-key", {
    defaultValue: "default",
    validate: (val): val is string => typeof val === "string",
  });

  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

## Common Tasks

### Adding a New Color Variable

1. **Define in both themes** (`apps/web/src/app/globals.css`):

```css
:root[data-theme="light"] {
  --color-my-new-color: #123456;
}

:root[data-theme="dark"] {
  --color-my-new-color: #abcdef;
}
```

2. **Use in component styles**:

```css
.my-element {
  color: var(--color-my-new-color);
}
```

3. **Test contrast ratio**: Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) to ensure WCAG AA compliance (4.5:1 for text, 3:1 for UI)

### Conditionally Rendering Based on Theme

```typescript
import { useTheme } from "@/lib/theme/useTheme";

export function ThemedIcon() {
  const { theme } = useTheme();

  return (
    <div>
      {theme === "dark" ? (
        <MoonIcon className="icon" />
      ) : (
        <SunIcon className="icon" />
      )}
    </div>
  );
}
```

### Testing Theme Changes

**Unit Test** (Vitest + Testing Library):

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { MyComponent } from "./MyComponent";

test("component responds to theme changes", async () => {
  const user = userEvent.setup();

  render(
    <ThemeProvider>
      <MyComponent />
    </ThemeProvider>
  );

  // Find toggle button
  const toggleButton = screen.getByRole("button", { name: /toggle theme/i });

  // Click to toggle theme
  await user.click(toggleButton);

  // Assert theme changed
  expect(document.documentElement.dataset.theme).toBe("dark");
});
```

**E2E Test** (Playwright):

```typescript
import { test, expect } from "@playwright/test";

test("theme toggle persists across page loads", async ({ page }) => {
  await page.goto("/");

  // Toggle to dark mode
  await page.getByRole("button", { name: /switch to dark mode/i }).click();

  // Verify dark mode active
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "dark");

  // Reload page
  await page.reload();

  // Verify theme persisted
  await expect(html).toHaveAttribute("data-theme", "dark");
});
```

### Handling SSR Edge Cases

**Problem**: Theme flickers on page load (FOUC)

**Solution**: Ensure inline script in `<head>` runs before React hydration:

```tsx
<head>
  <script
    dangerouslySetInnerHTML={{
      __html: `
        (function() {
          try {
            const theme = localStorage.getItem('theme-preference') || 'light';
            document.documentElement.setAttribute('data-theme', theme);
          } catch (e) {
            // Storage unavailable, use default
          }
        })();
      `,
    }}
  />
</head>
```

**Key Points**:

- Must be blocking (synchronous)
- Must run before any CSS/content renders
- Must handle localStorage errors gracefully

## Troubleshooting

### Theme Not Persisting

**Symptom**: Theme resets to light on page reload

**Causes**:

1. **localStorage disabled**: Check browser privacy settings, incognito mode
2. **Storage quota exceeded**: Clear localStorage or fix quota issue
3. **Inline script error**: Check browser console for errors in `<head>` script

**Debug**:

```javascript
// In browser console
localStorage.getItem("theme-preference"); // Should return "dark" or "light"
document.documentElement.dataset.theme; // Should match localStorage
```

### Theme Flicker on Load (FOUC)

**Symptom**: Brief flash of wrong theme before correct theme applies

**Causes**:

1. **Inline script not running**: Check `<head>` placement
2. **Script runs after CSS load**: Move script higher in `<head>`
3. **CSS transitions on theme change**: Remove transitions on initial load

**Fix**:

```typescript
// Add suppressHydrationWarning to <html> element
<html lang="en" suppressHydrationWarning>
```

### WCAG Contrast Failures

**Symptom**: Automated tests or audits report contrast ratio failures

**Causes**:

1. **Insufficient contrast**: Color combinations don't meet 4.5:1 (text) or 3:1 (UI)
2. **Missing dark mode color**: Component uses hardcoded color instead of CSS variable

**Fix**:

1. **Test colors**: Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
2. **Adjust colors**: Darken/lighten until ratios meet WCAG AA
3. **Replace hardcoded colors**: Use CSS variables instead

```css
/* ❌ BAD: Hardcoded color */
.button {
  background-color: #0066cc;
}

/* ✅ GOOD: CSS variable */
.button {
  background-color: var(--color-accent);
}
```

## Best Practices

### DO

✅ Use CSS custom properties for all theme-aware colors
✅ Test theme toggle on every new component
✅ Verify WCAG AA contrast ratios for both themes
✅ Use semantic CSS variable names (`--color-text-primary`, not `--color-black`)
✅ Handle localStorage errors gracefully (private mode, quota)
✅ Keep inline SSR script minimal and error-free

### DON'T

❌ Don't use hardcoded colors in component styles
❌ Don't forget to test keyboard navigation on theme toggle
❌ Don't skip ARIA labels on toggle button
❌ Don't use CSS transitions on initial page load (causes FOUC)
❌ Don't assume localStorage is always available
❌ Don't add theme-specific logic outside of theme components

## Performance Considerations

### Bundle Size

- ThemeProvider + hooks: ~2KB minified
- CSS variables: ~1KB additional CSS
- Total impact: <5KB

### Runtime Performance

- Theme toggle: <100ms (instant CSS variable update)
- No re-renders except consuming components
- localStorage write is async (non-blocking)

### Optimization Tips

1. **Memoize theme-dependent calculations**:

```typescript
import { useMemo } from "react";
import { useTheme } from "@/lib/theme/useTheme";

export function MyComponent() {
  const { theme } = useTheme();

  const expensiveValue = useMemo(() => {
    return computeSomethingBasedOn(theme);
  }, [theme]);

  return <div>{expensiveValue}</div>;
}
```

2. **Avoid inline styles** (prefer CSS variables):

```typescript
// ❌ BAD: Re-renders on every theme change
<div style={{ color: theme === 'dark' ? '#fff' : '#000' }}>

// ✅ GOOD: CSS handles theme change
<div className="text-primary">
```

## Extending the Feature

### Adding "Auto" Theme (OS Preference)

**Out of scope for initial implementation**, but here's the approach:

1. **Extend Theme type**:

```typescript
export type Theme = "light" | "dark" | "auto";
```

2. **Add media query listener**:

```typescript
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
prefersDark.addEventListener("change", handleOSThemeChange);
```

3. **Resolve "auto" to actual theme**:

```typescript
function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}
```

### Adding Custom Theme Colors

**Out of scope for initial implementation**, but extensible via:

1. Additional CSS variable sets
2. Extended theme type (`Theme = "light" | "dark" | "custom"`)
3. User-provided color overrides in localStorage

## Resources

- [Feature Specification](./spec.md)
- [Data Model](./data-model.md)
- [Type Contracts](./contracts/theme.types.ts)
- [Research & Decisions](./research.md)
- [MDN: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [React Context API](https://react.dev/reference/react/createContext)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

## Support

For questions or issues:

1. Check this quickstart guide
2. Review feature specification and data model
3. Check existing component implementations
4. Open GitHub issue with `theme` label
