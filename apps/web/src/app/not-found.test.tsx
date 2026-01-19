import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import NotFound from "./not-found";

// Mock Next.js components
vi.mock("next/link", () => ({
    default: ({ href, children, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

// Mock child components
vi.mock("@/components/layout/SimpleLayout", () => ({
    SimpleLayout: ({ children }: any) => <div data-testid="simple-layout">{children}</div>,
}));

vi.mock("@/components/layout/Sidebar", () => ({
    Sidebar: ({ children, id }: any) => (
        <nav data-testid="sidebar" id={id}>
            {children}
        </nav>
    ),
}));

vi.mock("@/components/layout/MainNavLinks", () => ({
    MainNavLinks: () => <div data-testid="main-nav-links">Nav Links</div>,
}));

describe("NotFound", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders 404 heading", () => {
        render(<NotFound />);
        expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
    });

    it("renders error message", () => {
        render(<NotFound />);
        expect(
            screen.getByText("The page you are looking for could not be found.")
        ).toBeInTheDocument();
    });

    it("renders link back to documentation", () => {
        const { container } = render(<NotFound />);

        const link = container.querySelector('a[href="/docs"]');
        expect(link).toBeInTheDocument();
        expect(link).toHaveClass("button");
        expect(link).toHaveAttribute("title", "Go back to documentation");
        expect(link).toHaveTextContent("Back to Documentation");
    });

    it("uses SimpleLayout", () => {
        render(<NotFound />);
        expect(screen.getByTestId("simple-layout")).toBeInTheDocument();
    });

    it("renders sidebar with navigation", () => {
        render(<NotFound />);

        const sidebar = screen.getByTestId("sidebar");
        expect(sidebar).toBeInTheDocument();
        expect(sidebar).toHaveAttribute("id", "sidebar-main-nav");
        expect(screen.getByTestId("main-nav-links")).toBeInTheDocument();
    });

    it("applies error-404 class to error container", () => {
        const { container } = render(<NotFound />);

        const errorDiv = container.querySelector(".error-404");
        expect(errorDiv).toBeInTheDocument();
        expect(errorDiv).toHaveTextContent("404");
    });
});
