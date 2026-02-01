# Data Model: Dark Mode Toggle

**Feature**: Dark Mode Toggle | **Date**: 2026-01-31

## Overview

This document defines the data structures, state shape, and persistence schema for the dark mode toggle feature. The data model is minimal by design, consisting of a single theme preference value with clear validation rules and state transitions.

## Entities

### Theme (Enumeration)

Represents the available theme options for the website.

**Type**: String literal union (`"light" | "dark"`)

**Values**:
- `"light"`: Light color theme (default)
- `"dark"`: Dark color theme

**Validation Rules**:
- MUST be one of the allowed values (`"light"` or `"dark"`)
- Invalid values default to `"light"`
- Case-sensitive (lowercase only)

**Rationale**:
- String literals provide type safety in TypeScript
- Simple enum avoids unnecessary complexity
- Lowercase matches CSS convention (data-theme attribute)

---

### ThemePreference (Persistent Entity)

Represents the user's saved theme preference in browser storage.

**Storage Location**: Browser localStorage

**Storage Key**: `"theme-preference"`

**Storage Value**: Theme enum (`"light"` | `"dark"`)

**Attributes**:
| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| key | string | Yes | `"theme-preference"` | localStorage key (constant) |
| value | Theme | Yes | `"light"` | User's theme preference |

**Validation Rules**:
- Key is constant, never changes
- Value MUST be valid Theme enum
- If localStorage unavailable, preference not persisted (session-only)
- If stored value invalid, fallback to `"light"`

**State Transitions**:
```
Initial Load:
  localStorage empty → default to "light"
  localStorage = "light" → load "light"
  localStorage = "dark" → load "dark"
  localStorage = invalid → default to "light", overwrite with "light"

User Toggle:
  Current = "light" → update to "dark", save to localStorage
  Current = "dark" → update to "light", save to localStorage

Storage Unavailable:
  Toggle works → state updates in memory only
  Reload page → resets to default ("light")
```

**Persistence Rules**:
- Write on every theme toggle
- Read on initial page load (before React hydration)
- No expiration (persists indefinitely until user clears browser data)

---

### ThemeContext (Application State)

Represents the current theme state and actions available throughout the application.

**Type**: React Context value

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| theme | Theme | Yes | Currently active theme |
| toggleTheme | () => void | Yes | Function to toggle between themes |
| setTheme | (theme: Theme) => void | Yes | Function to set specific theme (for future use) |

**State Shape**:
```typescript
interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}
```

**Default Value**:
```typescript
{
  theme: 'light',
  toggleTheme: () => {
    throw new Error('ThemeProvider not mounted');
  },
  setTheme: () => {
    throw new Error('ThemeProvider not mounted');
  },
}
```

**Validation Rules**:
- Context MUST be consumed within ThemeProvider tree
- theme MUST always be valid Theme enum
- toggleTheme MUST be idempotent (safe to call multiple times)
- setTheme MUST validate input and reject invalid themes

**State Updates**:
- `toggleTheme()`: Flips theme from light→dark or dark→light
- `setTheme(newTheme)`: Sets specific theme (validates input first)
- Both trigger re-render of consuming components
- Both update localStorage (if available)
- Both update document.documentElement.dataset.theme attribute

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Initial Page Load                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Inline <head> Script  │
                    │  (Before React)        │
                    └────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │  Read localStorage              │
                │  Key: "theme-preference"        │
                └────────────────┬────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  Value exists & valid?  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  YES          │     NO  │
                    │               │         │
                    ▼               ▼         ▼
              Use stored        Default to "light"
              value             │
                    │           │
                    └───────────┴──────────────┐
                                               ▼
                              ┌─────────────────────────────┐
                              │  Set data-theme attribute   │
                              │  on <html> element          │
                              └─────────────────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────┐
                              │  React Hydrates             │
                              │  ThemeProvider reads        │
                              │  data-theme attribute       │
                              └─────────────────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────┐
                              │  ThemeContext initialized   │
                              │  with correct theme         │
                              └─────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                         User Toggles Theme                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  User clicks toggle    │
                    │  button                │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  ThemeToggle.onClick   │
                    │  calls toggleTheme()   │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  ThemeProvider         │
                    │  updates state         │
                    │  light ↔ dark          │
                    └────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                  │
                ▼                                  ▼
   ┌─────────────────────────┐      ┌─────────────────────────┐
   │  Update localStorage    │      │  Update data-theme      │
   │  Key: theme-preference  │      │  attribute on <html>    │
   │  Value: new theme       │      │                         │
   └─────────────────────────┘      └─────────────────────────┘
                │                                  │
                └────────────────┬─────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  CSS variables         │
                    │  automatically update  │
                    │  (via data-theme)      │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  React re-renders      │
                    │  ThemeContext          │
                    │  consumers             │
                    └────────────────────────┘
```

---

## Storage Schema

### localStorage

**Format**: Key-value string pairs (native localStorage format)

**Schema**:
```typescript
{
  "theme-preference": "light" | "dark"
}
```

**Example Stored Data**:
```json
{
  "theme-preference": "dark"
}
```

**Size**: ~25 bytes (negligible storage usage)

**Expiration**: None (persists until user clears browser data)

**Scope**: Per-origin (https://aphiria.com or relevant domain)

**Fallback Behavior**:
- If localStorage.getItem() throws (disabled storage): return null, use default
- If localStorage.setItem() throws (quota exceeded, disabled): silently fail, log warning
- If value is corrupted: validate, default to "light", overwrite with valid value

---

## DOM State

### data-theme Attribute

The theme state is reflected in the DOM via a `data-theme` attribute on the root `<html>` element.

**Location**: `document.documentElement` (the `<html>` element)

**Attribute**: `data-theme`

**Values**: `"light"` | `"dark"`

**Purpose**:
- CSS custom properties use this attribute for theme scoping
- Allows CSS-only theme switching (no JavaScript in stylesheets)
- Visible in DevTools for debugging

**CSS Selector Usage**:
```css
:root[data-theme="light"] {
  --color-background: #ffffff;
  --color-text-primary: #1a1a1a;
}

:root[data-theme="dark"] {
  --color-background: #1a1a1a;
  --color-text-primary: #f0f0f0;
}
```

**JavaScript Access**:
```typescript
// Read current theme from DOM
const currentTheme = document.documentElement.dataset.theme;

// Set theme on DOM
document.documentElement.dataset.theme = 'dark';
```

---

## Validation & Error Handling

### Input Validation

**Theme Value Validation**:
```typescript
function isValidTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function validateTheme(value: unknown): Theme {
  if (isValidTheme(value)) {
    return value;
  }
  console.warn(`Invalid theme value: ${value}. Defaulting to "light".`);
  return 'light';
}
```

### Error Scenarios

| Scenario | Detection | Handling | User Impact |
|----------|-----------|----------|-------------|
| localStorage disabled | Try/catch on getItem/setItem | Use session state only | Theme resets on reload |
| Invalid stored value | Validate on read | Default to "light", overwrite | User sees light theme |
| localStorage quota exceeded | Try/catch on setItem | Log warning, continue | Theme works but won't persist |
| Context used outside Provider | Runtime error (throw) | Error boundary (dev), clear error message | Developer error (not user-facing) |
| Rapid toggle clicks | Debounce unnecessary (React batching) | N/A - handles naturally | No impact |

---

## Testing Considerations

### Unit Tests

**ThemeContext State**:
- Initial state is "light"
- toggleTheme() switches light→dark→light
- setTheme() accepts valid themes, rejects invalid
- localStorage updates on state change

**Validation Functions**:
- isValidTheme() correctly identifies valid/invalid themes
- validateTheme() returns valid themes unchanged, defaults invalid to "light"

### Integration Tests

**localStorage Persistence**:
- Theme persists across component remounts
- Invalid stored values are corrected
- Storage errors are handled gracefully

**SSR/Hydration**:
- Inline script sets correct data-theme before React
- ThemeProvider matches server/client initial state (no hydration mismatch)

### E2E Tests

**End-to-End Flows**:
- Toggle theme → reload page → theme persists
- Private mode → toggle works → reload → resets to default
- Keyboard toggle → theme changes → screen reader announces

---

## Migration & Backwards Compatibility

**Initial Deployment**:
- All users start with no stored preference → default to "light" (current behavior)
- No data migration required (new feature)

**Future Enhancements** (Out of Scope):
- Add "auto" theme (follows OS preference): Extend Theme enum to `"light" | "dark" | "auto"`
- Add custom themes: Change storage format to object `{ mode: "light", custom: {...} }`
- Sync across devices: Requires backend storage, user accounts

**Deprecation Strategy** (if needed in future):
- localStorage key is versioned implicitly (changing key migrates users)
- Example: `theme-preference` → `theme-preference-v2` with new schema

---

## Summary

The dark mode toggle data model is intentionally minimal:

- **Single State Value**: Theme enum (`"light"` | `"dark"`)
- **Single Storage Key**: `theme-preference` in localStorage
- **Single DOM Attribute**: `data-theme` on `<html>`
- **Single Context**: ThemeContext providing theme + toggle function

This simplicity ensures:
- ✅ Easy to understand and maintain
- ✅ Minimal performance overhead
- ✅ Testable at all layers (unit, integration, E2E)
- ✅ Extensible for future enhancements
