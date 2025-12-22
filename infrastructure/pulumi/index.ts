/** Shared Pulumi components for local, preview, and production environments. See README.md for usage. */

// Execute the appropriate stack based on the stack name and load its code
// Note: Dynamic imports are used to conditionally load stack-specific code
// The exports from the loaded stack module become the stack outputs
import * as pulumi from "@pulumi/pulumi";

const stack = pulumi.getStack();

if (stack === "local") {
    require("./stacks/local");
} else if (stack === "preview-base") {
    require("./stacks/preview-base");
} else if (stack.startsWith("preview-pr-")) {
    require("./stacks/preview-pr");
} else if (stack === "production") {
    require("./stacks/production");
} else {
    throw new Error(
        `Unknown stack: ${stack}. Valid stacks: local, preview-base, preview-pr-{N}, production`
    );
}
