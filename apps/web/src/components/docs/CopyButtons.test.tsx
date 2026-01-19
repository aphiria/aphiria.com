import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CopyButtons } from "./CopyButtons";

// Mock usePathname
const mockUsePathname = vi.fn(() => "/docs/1.x/introduction");
vi.mock("next/navigation", () => ({
    usePathname: () => mockUsePathname(),
}));

// Mock navigator.clipboard
const mockWriteText = vi.fn();
Object.defineProperty(navigator, "clipboard", {
    value: {
        writeText: mockWriteText,
    },
    writable: true,
    configurable: true,
});

describe("CopyButtons", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it("renders null (no visible output)", () => {
        const { container } = render(<CopyButtons />);
        expect(container.firstChild).toBeNull();
    });

    it("adds copy buttons to code blocks", () => {
        document.body.innerHTML = `
            <pre class="language-php"><code>echo "Hello";</code></pre>
        `;

        render(<CopyButtons />);

        const button = document.querySelector(".copy-button");
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute("title", "Copy to clipboard");
    });

    it("does not add button to .no-copy blocks", () => {
        document.body.innerHTML = `
            <pre class="language-php no-copy"><code>echo "Hello";</code></pre>
        `;

        render(<CopyButtons />);

        const button = document.querySelector(".copy-button");
        expect(button).toBeNull();
    });

    it("does not add button if already exists", () => {
        document.body.innerHTML = `
            <pre class="language-php">
                <button class="copy-button">Copy</button>
                <code>echo "Hello";</code>
            </pre>
        `;

        render(<CopyButtons />);

        const buttons = document.querySelectorAll(".copy-button");
        expect(buttons).toHaveLength(1);
    });

    it("skips pre without code element", () => {
        document.body.innerHTML = `
            <pre class="language-php">Not a code block</pre>
        `;

        render(<CopyButtons />);

        const button = document.querySelector(".copy-button");
        expect(button).toBeNull();
    });

    it("copies code to clipboard when clicked", async () => {
        document.body.innerHTML = `
            <pre class="language-php"><code>echo "Hello";</code></pre>
        `;

        mockWriteText.mockResolvedValue(undefined);

        render(<CopyButtons />);

        const button = document.querySelector(".copy-button") as HTMLButtonElement;
        button.click();

        // Wait for async clipboard operation
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockWriteText).toHaveBeenCalledWith('echo "Hello";');
    });

    it("shows checkmark feedback after copying", async () => {
        document.body.innerHTML = `
            <pre class="language-php"><code>echo "Hello";</code></pre>
        `;

        mockWriteText.mockResolvedValue(undefined);

        render(<CopyButtons />);

        const button = document.querySelector(".copy-button") as HTMLButtonElement;
        const originalHTML = button.innerHTML;

        button.click();

        // Wait for async clipboard operation
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(button.innerHTML).not.toBe(originalHTML);
        expect(button.innerHTML).toContain("path");
    });

    it("handles clipboard write errors gracefully", async () => {
        document.body.innerHTML = `
            <pre class="language-php"><code>echo "Hello";</code></pre>
        `;

        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        mockWriteText.mockRejectedValue(new Error("Clipboard write failed"));

        render(<CopyButtons />);

        const button = document.querySelector(".copy-button") as HTMLButtonElement;
        button.click();

        // Wait for async clipboard operation
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(consoleError).toHaveBeenCalledWith("Failed to copy:", expect.any(Error));
        consoleError.mockRestore();
    });

    it("adds buttons to multiple code blocks", () => {
        document.body.innerHTML = `
            <pre class="language-php"><code>echo "PHP";</code></pre>
            <pre class="language-bash"><code>ls -la</code></pre>
            <pre class="language-javascript"><code>console.log("JS")</code></pre>
        `;

        render(<CopyButtons />);

        const buttons = document.querySelectorAll(".copy-button");
        expect(buttons).toHaveLength(3);
    });
});
