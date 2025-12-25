import * as core from '@actions/core';
import { RetryOptions, PollOptions } from './types';

/**
 * Retry a function with configurable backoff strategy.
 * Does NOT wrap any specific tools - just provides retry logic.
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions
): Promise<T> {
    const { maxRetries, backoff = 'exponential', initialDelay = 1000, onRetry } = options;

    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt < maxRetries - 1) {
                const delay = calculateDelay(attempt, backoff, initialDelay);

                if (onRetry) {
                    onRetry(attempt + 1, lastError);
                }

                core.warning(`Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms...`);
                await sleep(delay);
            }
        }
    }

    throw new Error(`Failed after ${maxRetries} attempts: ${lastError!.message}`);
}

/**
 * Poll a function until a condition is met.
 * Does NOT wrap any specific tools - just provides polling logic.
 */
export async function poll<T>(
    fn: () => Promise<T>,
    options: PollOptions<T>
): Promise<T> {
    const { until, maxAttempts, interval, onPoll } = options;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (onPoll) {
            onPoll(attempt + 1);
        }

        const result = await fn();

        if (until(result)) {
            return result;
        }

        if (attempt < maxAttempts - 1) {
            await sleep(interval);
        }
    }

    throw new Error(`Polling failed after ${maxAttempts} attempts`);
}

function calculateDelay(attempt: number, backoff: string, initialDelay: number): number {
    switch (backoff) {
        case 'linear':
            return initialDelay;
        case 'exponential':
            return initialDelay * Math.pow(2, attempt);
        case 'progressive':
            return initialDelay * (attempt + 1);
        default:
            return initialDelay;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
