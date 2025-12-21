/** Shared Pulumi components for local, preview, and production environments. See README.md for usage. */

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

if (stack === "local") {
    // Local development environment (Minikube)
    import("./stacks/local");
} else if (stack === "preview-base") {
    // Preview base infrastructure (shared across all PRs)
    import("./stacks/preview-base");
} else if (stack.startsWith("preview-pr-")) {
    // Per-PR preview environment
    import("./stacks/preview-pr");
} else {
    throw new Error(
        `Unknown stack: ${stack}. Valid stacks: local, preview-base, preview-pr-{N}`
    );
}
