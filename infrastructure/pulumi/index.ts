/** Shared Pulumi components for local, preview, and production environments. See README.md for usage. */

import * as pulumi from "@pulumi/pulumi";

const stack = pulumi.getStack();

// Execute the appropriate stack based on the stack name and load its code
if (stack === "local") {
    module.exports = require("./stacks/local");
} else if (stack === "preview-base") {
    module.exports = require("./stacks/preview-base");
} else if (stack.startsWith("preview-pr-")) {
    module.exports = require("./stacks/preview-pr");
} else if (stack === "production") {
    module.exports = require("./stacks/production");
} else {
    throw new Error(
        `Unknown stack: ${stack}. Valid stacks: local, preview-base, preview-pr-{N}, production`
    );
}
