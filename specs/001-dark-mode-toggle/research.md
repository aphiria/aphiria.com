# Research: Dark Mode Toggle Implementation

**Feature**: Dark Mode Toggle | **Date**: 2026-01-31

## Overview

This document consolidates research findings for implementing a dark mode toggle in the Aphiria.com Next.js application. The research focuses on React/Next.js best practices, accessibility standards, SSR considerations, and theme management patterns.

## Key Decisions

### 1. Theme Management Approach

**Decision**: Use CSS custom properties (CSS variables) with React Context API

**Rationale**:
- **CSS Custom Properties**: Native browser support, no JavaScript required for style application, excellent performance
- **React Context API**: Built-in React feature, no additional dependencies, provides clean state management across component tree
- **Combined approach**: Context manages theme state, CSS variables handle actual styling (separation of concerns)

**Alternatives Considered**:
- **CSS-in-JS libraries (styled-components, emotion)**: Rejected due to added bundle size, runtime performance cost, and unnecessary complexity for this use case
- **Tailwind CSS dark mode**: Rejected because project uses PostCSS with custom CSS (not Tailwind-based)
- **Class-based theme switching**: Considered but CSS variables provide cleaner separation and easier maintenance
- **State management libraries (Redux, Zustand)**: Overkill for single piece of state (theme preference)

**Supporting Research**:
- [MDN: Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [React Context API documentation](https://react.dev/learn/passing-data-deeply-with-context)
- Browser support for CSS variables: 97%+ global coverage (caniuse.com)

---

### 2. Server-Side Rendering (SSR) Strategy

**Decision**: Implement theme detection script in HTML `<head>` before React hydration

**Rationale**:
- **Problem**: Next.js SSR renders initial HTML on server, but theme preference is client-side (localStorage)
- **Solution**: Inject blocking script in `<head>` that reads localStorage and applies theme class before first paint
- **Benefit**: Eliminates flash of incorrect theme (FOUC - Flash of Unstyled Content)
- **Trade-off**: Small blocking script (~500 bytes), but prevents visible theme flash

**Alternatives Considered**:
- **Accept FOUC**: Rejected due to poor user experience (FR-006 requires instant feedback)
- **Server-side cookie**: Considered but adds unnecessary backend complexity for frontend-only feature
- **next-themes library**: Third-party solution that implements this pattern, but we'll implement directly for full control

**Implementation Pattern**:
```html
<script>
  // Inline script in <head> (before React)
  (function() {
    const theme = localStorage.getItem('theme-preference') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

**Supporting Research**:
- [Next.js documentation: Script optimization](https://nextjs.org/docs/app/building-your-application/optimizing/scripts)
- [Josh Comeau: The Quest for the Perfect Dark Mode](https://www.joshwcomeau.com/react/dark-mode/)
- Common pattern used by GitHub, Twitter, and other major sites

---

### 3. Theme Preference Persistence

**Decision**: Use localStorage with fallback to session-only state

**Rationale**:
- **localStorage**: Persists across browser sessions (FR-004)
- **Fallback**: Graceful degradation for private/incognible mode or disabled storage (FR-010)
- **Key name**: `theme-preference` (namespaced to avoid conflicts)
- **Values**: `"light"` | `"dark"` (string values, JSON unnecessary for simple enum)

**Alternatives Considered**:
- **sessionStorage**: Rejected because requirement specifies cross-session persistence
- **IndexedDB**: Overkill for single key-value pair
- **Cookies**: Considered but localStorage is simpler for client-only data (no server interaction needed)

**Edge Case Handling**:
- Storage disabled: Allow theme toggle during session, don't persist
- Storage quota exceeded: Unlikely for single value, but fallback to session state
- Invalid stored value: Validate and default to "light"

**Supporting Research**:
- [MDN: Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Web Storage API compatibility](https://caniuse.com/namevalue-storage): 98%+ browser support

---

### 4. Color Palette & Contrast

**Decision**: Define theme colors as CSS custom properties with WCAG AA compliant contrast ratios

**Rationale**:
- **WCAG AA**: Minimum 4.5:1 for normal text, 3:1 for large text (FR-007)
- **CSS Variables**: Centralized color definitions, easy to maintain and test
- **Naming Convention**: Semantic names (--color-background, --color-text-primary) not theme-specific (--color-light-bg)

**Color Strategy**:
- Light theme: Existing light colors (baseline)
- Dark theme: Invert background/text, adjust accent colors for contrast
- Test all combinations with WebAIM Contrast Checker

**CSS Custom Property Structure**:
```css
:root[data-theme="light"] {
  --color-background: #ffffff;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #4a4a4a;
  --color-border: #e0e0e0;
  --color-accent: #0066cc;
}

:root[data-theme="dark"] {
  --color-background: #1a1a1a;
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #b0b0b0;
  --color-border: #404040;
  --color-accent: #4d9fff;
}
```

**Alternatives Considered**:
- **Automatic color inversion**: Rejected due to poor results (some colors don't invert well)
- **prefers-color-scheme media query only**: Considered but spec requires manual toggle (out of scope for auto-detection)

**Supporting Research**:
- [WCAG 2.1 Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Material Design Dark Theme Guidelines](https://m3.material.io/styles/color/dark-theme/overview)

---

### 5. Accessibility (A11y)

**Decision**: Implement ARIA labels, keyboard navigation, and screen reader announcements

**Rationale**:
- **FR-008**: Keyboard accessibility required (Tab, Enter/Space)
- **FR-009**: Screen reader support required
- **WCAG compliance**: Meets WCAG 2.1 Level AA

**Implementation Details**:
- **Button element**: Use semantic `<button>` (not `<div>` with click handler)
- **ARIA label**: `aria-label="Switch to dark mode"` (dynamic based on current theme)
- **ARIA live region**: Announce theme changes to screen readers
- **Focus visible**: Ensure focus indicator meets 3:1 contrast ratio
- **Keyboard support**: Default button behavior (Enter/Space) works automatically

**ARIA Pattern**:
```tsx
<button
  type="button"
  aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
  onClick={toggleTheme}
>
  {/* Icon */}
</button>

<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {`Theme switched to ${theme} mode`}
</div>
```

**Alternatives Considered**:
- **Toggle switch**: Considered but button is more universally understood
- **Checkbox**: Semantic but less clear for theme switching

**Supporting Research**:
- [WAI-ARIA Authoring Practices: Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
- [WebAIM: ARIA Live Regions](https://webaim.org/techniques/aria/#liveregions)
- [a11y Project: Dark Mode](https://www.a11yproject.com/posts/operating-system-and-browser-accessibility-display-modes/)

---

### 6. Component Architecture

**Decision**: Separate theme provider, custom hooks, and UI component

**Rationale**:
- **Single Responsibility**: Each module has one clear purpose
- **Testability**: Pure functions and hooks can be tested independently
- **Reusability**: Hook-based design allows theme access anywhere in component tree

**Component Breakdown**:
1. **ThemeProvider.tsx**: Context provider wrapping app root (app/layout.tsx)
2. **useTheme.ts**: Custom hook exposing theme state and toggle function
3. **useLocalStorage.ts**: Reusable hook for localStorage persistence
4. **ThemeToggle.tsx**: UI component (button with icon)
5. **constants.ts**: Theme constants (THEME_LIGHT, THEME_DARK, STORAGE_KEY)

**Data Flow**:
```
User clicks toggle
  → ThemeToggle calls toggleTheme from useTheme
  → ThemeProvider updates context state
  → useLocalStorage saves to localStorage
  → React re-renders with new theme
  → CSS variables applied via data-theme attribute
```

**Alternatives Considered**:
- **All-in-one component**: Rejected for poor separation of concerns
- **Redux/Zustand**: Overkill for single state value

**Supporting Research**:
- [React Docs: Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)
- [Kent C. Dodds: Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react)

---

### 7. Testing Strategy

**Decision**: Multi-layered testing with unit, integration, and E2E tests

**Test Coverage**:
1. **Unit Tests** (Vitest + Testing Library):
   - `ThemeProvider`: Context value provides correct theme and toggle function
   - `useTheme`: Hook returns current theme and updates on toggle
   - `useLocalStorage`: Hook reads/writes localStorage correctly
   - `ThemeToggle`: Component renders correct ARIA labels and handles clicks

2. **Integration Tests** (Vitest + Testing Library):
   - Theme application across multiple components
   - localStorage persistence across component remounts
   - SSR hydration without FOUC (simulate initial load)

3. **E2E Tests** (Playwright):
   - Theme toggle interaction (click button, verify UI changes)
   - Theme persistence (toggle, reload page, verify theme persists)
   - Keyboard navigation (Tab to button, Enter/Space to toggle)
   - Screen reader announcements (verify ARIA labels)
   - Contrast validation (automated color contrast testing)

**Test Data Constants**:
```typescript
// fixtures/test-data.ts
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export const STORAGE_KEYS = {
  THEME_PREFERENCE: 'theme-preference',
} as const;
```

**Supporting Research**:
- [Testing Library: React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright: Accessibility Testing](https://playwright.dev/docs/accessibility-testing)

---

### 8. Performance Optimization

**Decision**: Minimize runtime overhead, leverage native CSS for theme application

**Optimizations**:
1. **CSS Variables**: Zero JavaScript cost after initial theme set (CSS handles all styling)
2. **Inline Script**: Blocking script is ~500 bytes, prevents FOUC (worth the cost)
3. **No Re-renders**: Only ThemeToggle component re-renders on toggle (via Context optimization)
4. **Lazy Loading**: Theme toggle component can be client-side only (use 'use client' directive)

**Bundle Size Impact**:
- ThemeProvider + hooks: ~2KB minified
- CSS variables: ~1KB additional CSS
- Total impact: <5KB (well under 20KB constraint)

**Performance Targets** (from plan.md):
- ✅ Toggle response < 100ms (CSS variables provide instant visual feedback)
- ✅ No FOUC (inline script prevents flash)
- ✅ Minimal CSS increase (<5KB vs. <20KB target)

**Supporting Research**:
- [Web.dev: CSS Custom Properties Performance](https://web.dev/articles/css-variables)
- [Next.js: Optimizing Performance](https://nextjs.org/docs/app/building-your-application/optimizing)

---

## Technology Stack Summary

| Category | Technology | Justification |
|----------|-----------|---------------|
| State Management | React Context API | Built-in, zero dependencies, sufficient for single state value |
| Styling | CSS Custom Properties | Native browser feature, excellent performance, wide support |
| Persistence | localStorage API | Standard API, cross-session persistence, 98%+ browser support |
| SSR Handling | Inline `<head>` script | Prevents FOUC, industry-standard pattern |
| Accessibility | ARIA + Semantic HTML | WCAG 2.1 AA compliance, screen reader support |
| Testing | Vitest + Playwright | Existing project stack, comprehensive coverage |

---

## Next Steps (Phase 1)

1. **data-model.md**: Define theme state shape, localStorage schema
2. **contracts/**: Define TypeScript interfaces for theme context, hooks
3. **quickstart.md**: Developer guide for using theme system
4. **Update agent context**: Add theme management patterns to .claude-code-context.md

---

## References

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [React Context API](https://react.dev/reference/react/createContext)
- [MDN: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Josh Comeau: Dark Mode Implementation](https://www.joshwcomeau.com/react/dark-mode/)
- [Material Design: Dark Theme](https://m3.material.io/styles/color/dark-theme/overview)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
