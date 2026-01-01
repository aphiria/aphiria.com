module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    testMatch: ["**/__tests__/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],
    collectCoverageFrom: ["src/**/*.ts", "!**/*.d.ts", "!**/node_modules/**", "!**/dist/**"],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    coverageThreshold: {
        global: {
            branches: 97,
            functions: 100,
            lines: 100,
            statements: 100,
        },
    },
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                tsconfig: {
                    esModuleInterop: true,
                    allowSyntheticDefaultImports: true,
                },
            },
        ],
    },
    // Run Pulumi setup before each test file
    setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
    // Run Pulumi cleanup once after all tests complete (not per-file)
    globalTeardown: "<rootDir>/tests/globalTeardown.ts",
};
