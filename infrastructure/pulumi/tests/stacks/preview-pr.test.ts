import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";

// Mock createPreviewPRProvider to prevent Pulumi config reads
const mockCreatePreviewPRProvider = jest.fn();
jest.mock("../../src/stacks/lib/preview-pr-provider", () => ({
    createPreviewPRProvider: mockCreatePreviewPRProvider,
}));

// Mock the createStack function
const mockCreateStack = jest.fn();
jest.mock("../../src/stacks/lib/stack-factory", () => ({
    createStack: mockCreateStack,
}));

describe("preview-pr stack", () => {
    beforeEach(() => {
        jest.clearAllMocks();
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

    it("should call createStack with preview environment and k8s provider", async () => {
        const mockProvider = { id: "mock-provider" } as any;
        mockCreatePreviewPRProvider.mockReturnValue(mockProvider);
        mockCreateStack.mockReturnValue({
            config: {
                app: {
                    web: { url: "https://web.pr-123.aphiria.com" },
                    api: { url: "https://api.pr-123.aphiria.com" },
                },
            },
        });

        // Import the stack file to trigger execution
        const stack = await import("../../src/stacks/preview-pr");

        // Verify createPreviewPRProvider was called
        expect(mockCreatePreviewPRProvider).toHaveBeenCalledTimes(1);

        // Verify createStack was called with correct environment and provider
        expect(mockCreateStack).toHaveBeenCalledWith("preview", mockProvider);

        // Verify exports
        expect(stack.webUrl).toBe("https://web.pr-123.aphiria.com");
        expect(stack.apiUrl).toBe("https://api.pr-123.aphiria.com");
    });
});
