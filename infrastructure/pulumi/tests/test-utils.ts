/**
 * Test utilities for Pulumi unit tests
 */
import * as pulumi from "@pulumi/pulumi";

/**
 * Convert a Pulumi Output to a Promise for use in async/await tests
 *
 * This is the recommended pattern from Pulumi's official testing documentation.
 * It allows you to properly await Output values in Jest tests, ensuring all
 * async work completes before the test finishes.
 *
 * @example
 * ```typescript
 * it("should have correct name", async () => {
 *   const name = await promiseOf(resource.name);
 *   expect(name).toBe("expected-name");
 * });
 * ```
 *
 * @see https://www.pulumi.com/blog/testing-pulumi-programs-with-jest/
 */
export function promiseOf<T>(output: pulumi.Output<T>): Promise<T> {
    return new Promise((resolve) => output.apply(resolve));
}
