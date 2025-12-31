/**
 * Jest global teardown - runs ONCE after all test files complete
 *
 * This is the proper pattern for cleaning up shared resources like Pulumi runtime.
 * Unlike setupFilesAfterEnv (which runs per test file), this runs exactly once
 * at the end of the entire test suite, preventing race conditions.
 */
import * as pulumi from "@pulumi/pulumi";

export default async function globalTeardown(): Promise<void> {
    // Disconnect Pulumi runtime to clean up pending async work
    // This runs once after all files complete, not once per file
    await pulumi.runtime.disconnect();
}
