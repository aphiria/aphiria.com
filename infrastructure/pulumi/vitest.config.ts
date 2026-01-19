import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: [
                "**/*.d.ts",
                "**/node_modules/**",
                "**/dist/**",
                "**/index.ts", // Re-export files
                "**/types.ts", // Type definition files
            ],
            reporter: ["text", "lcov", "html"],
            thresholds: {
                branches: 99,
                functions: 100,
                lines: 100,
                statements: 100,
            },
        },
        setupFiles: ["./tests/setup.ts"],
        globalSetup: "./tests/globalTeardown.ts",
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
