import { describe, it, expect, beforeEach, vi } from "vitest";
import * as pulumi from "@pulumi/pulumi";

// Mock the createStack function before importing the stack file
const mockCreateStack = vi.fn();
vi.mock("../../src/stacks/lib/stack-factory", () => ({
    createStack: mockCreateStack,
}));

describe("production stack", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        pulumi.runtime.setMocks({
            newResource: function (args: pulumi.runtime.MockResourceArgs): {
                id: string;
                state: any;
            } {
                return {
                    id: args.inputs.name ? `${args.inputs.name}_id` : args.name + "_id",
                    state: args.inputs,
                };
            },
            call: function (args: pulumi.runtime.MockCallArgs) {
                return args.inputs;
            },
        });
    });

    it("should call createStack with production environment", async () => {
        mockCreateStack.mockReturnValue({
            config: {},
        });

        // Import the stack file to trigger execution
        await import("../../src/stacks/production");

        // Verify createStack was called with correct environment
        expect(mockCreateStack).toHaveBeenCalledWith("production");
        expect(mockCreateStack).toHaveBeenCalledTimes(1);
    });
});
