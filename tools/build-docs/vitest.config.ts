import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["**/*.d.ts", "**/node_modules/**", "**/dist/**"],
            reporter: ["text", "lcov", "html"],
            thresholds: {
                statements: 100,
                branches: 91,
                functions: 100,
                lines: 100,
            },
        },
    },
});
