import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Playwright configuration for Aphiria.com smoke tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: "./specs",

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,

    /* Retry failed tests in CI (2 retries), none locally for fast feedback */
    retries: process.env.CI ? 2 : 0,

    /* Reporter to use */
    reporter: [
        ["html", { outputFolder: "playwright-report" }],
        ["json", { outputFile: "playwright-report/results.json" }],
        ["list"],
    ],

    /* Shared settings for all the projects below */
    use: {
        /* Base URL to use in actions like `await page.goto('/')` */
        baseURL: process.env.SITE_BASE_URL,

        /* Collect trace only on failure to reduce artifact size */
        trace: "retain-on-failure",

        /* Screenshot only on failure */
        screenshot: "only-on-failure",

        /* Ignore HTTPS errors for local development with self-signed certificates */
        ignoreHTTPSErrors: process.env.APP_ENV === "local",

        /* Maximum time each action can take */
        actionTimeout: 30000,

        /* Maximum time for navigation actions */
        navigationTimeout: 30000,
    },

    /* Expect timeout for assertions */
    expect: {
        timeout: 10000,
    },

    /* Configure projects for different browsers if needed */
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "webkit",
            use: {
                ...devices["Desktop Safari"],
                /* WebKit-specific: Disable video/trace on first run for better performance */
                trace: "on-first-retry",
                video: "on-first-retry",
            },
            timeout: 60000,
        },
    ],

    /* Test timeout */
    timeout: 30000,
});
