/** Shared Pulumi components for dev-local, preview, and production environments. See README.md for usage. */

import * as pulumi from "@pulumi/pulumi";

// Re-export all shared components
export * from "./components/types";
export * from "./components/helm-charts";
export * from "./components/database";
export * from "./components/web-deployment";
export * from "./components/api-deployment";
export * from "./components/db-migration";
export * from "./components/http-route";
export * from "./components/gateway";

// Execute the appropriate stack based on the stack name
const stack = pulumi.getStack();

if (stack === "dev-local") {
    // Import and execute dev-local stack
    import("./stacks/dev-local");
} else {
    throw new Error(`Unknown stack: ${stack}. Valid stacks: dev-local`);
}
