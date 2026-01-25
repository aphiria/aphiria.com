import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ReactNode } from "react";

// Set up window.__RUNTIME_CONFIG__ AT MODULE LEVEL before component import
window.__RUNTIME_CONFIG__ = {
    apiUri: "https://api.aphiria.com",
    cookieDomain: ".aphiria.com",
    appEnv: "production",
};

// Mock Next.js components
vi.mock("next/link", () => ({
    default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

// Mock child components
vi.mock("@/components/layout/SimpleLayout", () => ({
    SimpleLayout: ({ children }: { children: ReactNode }) => (
        <div data-testid="simple-layout">{children}</div>
    ),
}));

vi.mock("@/components/layout/Sidebar", () => ({
    Sidebar: ({ children, id }: { children: ReactNode; id: string }) => (
        <nav data-testid="sidebar" id={id}>
            {children}
        </nav>
    ),
}));

vi.mock("@/components/layout/MainNavLinks", () => ({
    MainNavLinks: () => <div data-testid="main-nav-links">Nav Links</div>,
}));

// Import after mocks
import ErrorPage from "@/app/error";

describe("Error", () => {
    const mockError = new Error("Test error message");
    const mockReset = vi.fn();

    afterEach(() => {
        cleanup();
        // Reset to default config after each test
        window.__RUNTIME_CONFIG__ = {
            apiUri: "https://api.aphiria.com",
            cookieDomain: ".aphiria.com",
            appEnv: "production",
        };
        vi.clearAllMocks();
    });

    it("renders 500 error heading", () => {
        window.__RUNTIME_CONFIG__ = {
            apiUri: "https://api.aphiria.com",
            cookieDomain: ".aphiria.com",
            appEnv: "production",
        };

        render(<ErrorPage error={mockError} reset={mockReset} />);

        expect(screen.getByText("500")).toBeInTheDocument();
    });

    it("renders error message", () => {
        window.__RUNTIME_CONFIG__ = {
            apiUri: "https://api.aphiria.com",
            cookieDomain: ".aphiria.com",
            appEnv: "production",
        };

        render(<ErrorPage error={mockError} reset={mockReset} />);

        expect(screen.getByText("An error occurred while loading this page.")).toBeInTheDocument();
    });

    it("renders Try Again button", () => {
        window.__RUNTIME_CONFIG__ = {
            apiUri: "https://api.aphiria.com",
            cookieDomain: ".aphiria.com",
            appEnv: "production",
        };

        render(<ErrorPage error={mockError} reset={mockReset} />);

        const tryAgainButton = screen.getByRole("button", { name: /try again/i });
        expect(tryAgainButton).toBeInTheDocument();
    });

    it("renders Back to Documentation link", () => {
        window.__RUNTIME_CONFIG__ = {
            apiUri: "https://api.aphiria.com",
            cookieDomain: ".aphiria.com",
            appEnv: "production",
        };

        render(<ErrorPage error={mockError} reset={mockReset} />);

        const backLink = screen.getByRole("link", { name: /back to documentation/i });
        expect(backLink).toBeInTheDocument();
        expect(backLink).toHaveAttribute("href", "/docs");
    });

    it("applies error-page class to error container", () => {
        window.__RUNTIME_CONFIG__ = {
            apiUri: "https://api.aphiria.com",
            cookieDomain: ".aphiria.com",
            appEnv: "production",
        };

        const { container } = render(<ErrorPage error={mockError} reset={mockReset} />);

        const errorDiv = container.querySelector(".error-page");
        expect(errorDiv).toBeInTheDocument();
        expect(errorDiv).toHaveTextContent("500");
    });

    it("shows error details in non-production environment", () => {
        window.__RUNTIME_CONFIG__ = {
            apiUri: "http://localhost:8080",
            cookieDomain: "localhost",
            appEnv: "local",
        };

        const testError = new Error("Test error message");
        render(<ErrorPage error={testError} reset={mockReset} />);

        expect(screen.getByText(/error details/i)).toBeInTheDocument();
        expect(screen.getByText("Test error message")).toBeInTheDocument();
    });

    it("hides error details in production environment", () => {
        window.__RUNTIME_CONFIG__ = {
            apiUri: "https://api.aphiria.com",
            cookieDomain: ".aphiria.com",
            appEnv: "production",
        };

        render(<ErrorPage error={mockError} reset={mockReset} />);

        expect(screen.queryByText(/error details/i)).not.toBeInTheDocument();
        expect(screen.queryByText("Test error message")).not.toBeInTheDocument();
    });

    it("shows error details in preview environment", () => {
        window.__RUNTIME_CONFIG__ = {
            apiUri: "https://pr-123.pr-api.aphiria.com",
            cookieDomain: ".pr.aphiria.com",
            appEnv: "preview",
        };

        const testError = new Error("Test error message");
        render(<ErrorPage error={testError} reset={mockReset} />);

        expect(screen.getByText(/error details/i)).toBeInTheDocument();
        expect(screen.getByText("Test error message")).toBeInTheDocument();
    });

    it("displays error digest when available", () => {
        window.__RUNTIME_CONFIG__ = {
            apiUri: "http://localhost:8080",
            cookieDomain: "localhost",
            appEnv: "local",
        };

        const errorWithDigest = Object.assign(new Error("Test error"), { digest: "4256950027" });
        render(<ErrorPage error={errorWithDigest} reset={mockReset} />);

        expect(screen.getByText(/Digest: 4256950027/i)).toBeInTheDocument();
    });
});
