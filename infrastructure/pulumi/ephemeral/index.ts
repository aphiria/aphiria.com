import * as pulumi from "@pulumi/pulumi";

// Determine which stack to deploy based on stack name
const stackName = pulumi.getStack();

if (stackName === "ephemeral-base") {
    // Deploy base infrastructure (persistent)
    require("./base-stack");
} else if (stackName.startsWith("ephemeral-pr-")) {
    // Deploy per-PR ephemeral resources
    require("./ephemeral-stack");
} else {
    throw new Error(`Unknown stack name: ${stackName}. Expected 'ephemeral-base' or 'ephemeral-pr-{N}'`);
}
