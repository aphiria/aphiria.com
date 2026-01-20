import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Header } from "@/components/layout/Header";

// Mock Next.js components
vi.mock("next/image", () => ({
    default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

vi.mock("next/link", () => ({
    default: ({ href, children, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

// Mock child components
vi.mock("@/components/docs/DocSearch", () => ({
    DocSearch: () => <div data-testid="doc-search">DocSearch</div>,
}));

vi.mock("@/components/layout/MainNavLinks", () => ({
    MainNavLinks: () => <div data-testid="main-nav-links">MainNavLinks</div>,
}));

describe("Header", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders header with navigation", () => {
        render(<Header />);

        expect(screen.getByRole("banner")).toBeInTheDocument();
        expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("renders Aphiria logo with link to homepage", () => {
        const { container } = render(<Header />);

        const logoLink = container.querySelector('a[href="/"]');
        expect(logoLink).toBeInTheDocument();
        expect(logoLink).toHaveAttribute("title", "Aphiria");

        const logoImg = container.querySelector('img[src="/images/aphiria-logo.svg"]');
        expect(logoImg).toBeInTheDocument();
        expect(logoImg).toHaveAttribute("alt", "Aphiria");
    });

    it("renders MainNavLinks component", () => {
        render(<Header />);
        expect(screen.getByTestId("main-nav-links")).toBeInTheDocument();
    });

    it("renders DocSearch component", () => {
        render(<Header />);
        expect(screen.getByTestId("doc-search")).toBeInTheDocument();
    });

    it("renders mobile menu toggle", () => {
        const { container } = render(<Header />);

        const mobileMenu = container.querySelector("#mobile-menu");
        expect(mobileMenu).toBeInTheDocument();

        const mobileMenuLink = mobileMenu?.querySelector('a[title="Expand menu"]');
        expect(mobileMenuLink).toBeInTheDocument();
        expect(mobileMenuLink).toHaveTextContent("≡");
    });
});
