import { Page, expect } from "@playwright/test";

/**
 * Navigate to URL and assert successful response (HTTP 2xx or 3xx->2xx).
 * Retries once on 5xx errors or timeouts with 10s delay.
 *
 * @param page - Playwright page object
 * @param url - URL to navigate to
 * @param maxRetries - Maximum number of retries (default: 1)
 */
export async function assertPageOk(page: Page, url: string, maxRetries = 1): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await page.goto(url, { waitUntil: "load" });

            if (response) {
                const status = response.status();

                // Success: 2xx or 3xx (redirect)
                if (status >= 200 && status < 400) {
                    return;
                }

                // Retry 5xx errors
                if (status >= 500 && attempt < maxRetries) {
                    console.log(`HTTP ${status} for ${url}, retrying in 10s...`);
                    await new Promise((resolve) => setTimeout(resolve, 10000));
                    continue;
                }

                throw new Error(`HTTP ${status} for ${url}`);
            }

            // No response (SPA navigation) - verify via request API
            const checkResp = await page.request.get(page.url());
            const checkStatus = checkResp.status();

            if (checkStatus < 400) {
                return;
            }

            throw new Error(`HTTP ${checkStatus} for ${page.url()} (SPA navigation)`);
        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Retry timeouts and 5xx errors
            const isRetryable =
                lastError.message?.includes("timeout") ||
                lastError.message?.includes("5") ||
                lastError.name === "TimeoutError";

            if (isRetryable && attempt < maxRetries) {
                console.log(`${lastError.message}, retrying in 10s...`);
                await new Promise((resolve) => setTimeout(resolve, 10000));
                continue;
            }

            throw lastError;
        }
    }

    throw lastError!;
}

/**
 * Assert that a context cookie exists with expected properties
 */
export async function assertContextCookie(
    page: Page,
    expectedValue: string,
    message?: string
): Promise<void> {
    const cookies = await page.context().cookies();
    const contextCookie = cookies.find((c) => c.name === "context");

    expect(contextCookie, message || `Expected context cookie to exist`).toBeDefined();
    expect(contextCookie?.value, `Expected context cookie value to be ${expectedValue}`).toBe(
        expectedValue
    );
    expect(contextCookie?.domain, "Expected context cookie domain to match").toBe(
        process.env.COOKIE_DOMAIN
    );
    expect(contextCookie?.secure, "Expected context cookie to be secure").toBe(true);
    expect(contextCookie?.httpOnly, "Expected context cookie to not be httpOnly").toBe(false);
}

/**
 * Assert that a URL contains a specific context parameter
 */
export async function assertUrlContainsContext(
    page: Page,
    context: string,
    message?: string
): Promise<void> {
    await expect(page, message || `Expected URL to contain context=${context}`).toHaveURL(
        new RegExp(`\\?context=${context}`)
    );
}
