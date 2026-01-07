import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default [
    {
        ignores: [
            ".pulumi/",
            "**/*.config.js",
            "**/*.config.mjs",
            "**/coverage/",
            "**/dist/",
            "**/playwright-report/",
            "**/test-results/",
            "apps/",
            "bin/",
            "node_modules/",
            "vendor/",
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        files: ["**/*.ts"],
        rules: {
            "@typescript-eslint/member-ordering": [
                "error",
                {
                    default: [
                        "public-static-field",
                        "protected-static-field",
                        "private-static-field",
                        "public-instance-field",
                        "protected-instance-field",
                        "private-instance-field",
                        "constructor",
                        "public-instance-method",
                        "protected-instance-method",
                        "private-instance-method",
                    ],
                },
            ],
        },
    },
    {
        files: ["infrastructure/pulumi/**/*.ts"],
        languageOptions: {
            parserOptions: {
                project: "./infrastructure/pulumi/tsconfig.json",
                ecmaVersion: 2020,
                sourceType: "module",
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/no-require-imports": "off", // Pulumi uses dynamic requires for stack loading
        },
    },
    {
        files: ["tests/e2e/**/*.ts"],
        languageOptions: {
            parserOptions: {
                project: "./tests/e2e/tsconfig.json",
                ecmaVersion: 2020,
                sourceType: "module",
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
        },
    },
    {
        files: ["infrastructure/pulumi/tests/**/*.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off", // Allow any in test files for mocking/callbacks
        },
    },
];
