import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "happy-dom",
        setupFiles: ["./vitest.setup.ts"],
        include: ["src/**/*.{test,spec}.{ts,tsx}"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "**/*.d.ts",
                "**/node_modules/**",
                "**/.next/**",
                "**/app/**/layout.tsx",
                "**/app/**/page.tsx",
            ],
            reporter: ["text", "lcov", "html"],
            thresholds: {
                // Middleware
                "src/middleware.ts": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                // Context utilities
                "src/lib/context/resolver.ts": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/lib/context/toggler.ts": {
                    statements: 100,
                    branches: 83,
                    functions: 100,
                    lines: 100,
                },
                // Cookie utilities
                "src/lib/cookies/context-cookie.client.ts": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/lib/cookies/context-cookie.server.ts": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                // Docs utilities
                "src/lib/docs/artifact-reader.ts": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/lib/docs/sidebar-config.ts": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/lib/docs/toc-generator.ts": {
                    statements: 100,
                    branches: 93,
                    functions: 100,
                    lines: 100,
                },
                // Prism utilities
                "src/lib/prism/highlighter.ts": {
                    statements: 95,
                    branches: 75,
                    functions: 100,
                    lines: 95,
                },
                // Routing utilities
                "src/lib/routing/redirects.ts": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                // Layout components
                "src/components/layout/Footer.tsx": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/components/layout/Header.tsx": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/components/layout/MainNavLinks.tsx": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/components/layout/MobileMenuToggle.tsx": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/components/layout/Sidebar.tsx": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/components/layout/SimpleLayout.tsx": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                // Docs components
                "src/components/docs/ContextSelector.tsx": {
                    statements: 100,
                    branches: 50,
                    functions: 100,
                    lines: 100,
                },
                "src/components/docs/CopyButtons.tsx": {
                    statements: 96,
                    branches: 87,
                    functions: 80,
                    lines: 96,
                },
                "src/components/docs/DocContent.tsx": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/components/docs/HighlightedHtml.tsx": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/components/docs/SidebarNav.tsx": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/components/docs/TableOfContents.tsx": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/components/docs/TocHighlighter.tsx": {
                    statements: 71,
                    branches: 58,
                    functions: 63,
                    lines: 71,
                },
                "src/app/not-found.tsx": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
            },
        },
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
        },
    },
});
