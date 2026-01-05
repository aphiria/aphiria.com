import { Page } from "@playwright/test";

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
            lastError = error;

            // Retry timeouts and 5xx errors
            const isRetryable =
                error.message?.includes("timeout") ||
                error.message?.includes("5") ||
                error.name === "TimeoutError";

            if (isRetryable && attempt < maxRetries) {
                console.log(`${error.message}, retrying in 10s...`);
                await new Promise((resolve) => setTimeout(resolve, 10000));
                continue;
            }

            throw error;
        }
    }

    throw lastError!;
}
