import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SidebarNav } from "@/components/docs/SidebarNav";
import { NavigationSection } from "@/types/navigation";

// Mock Next.js Link
vi.mock("next/link", () => ({
    default: ({ href, children, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

describe("SidebarNav", () => {
    afterEach(() => {
        cleanup();
    });

    const mockSections: NavigationSection[] = [
        {
            title: "Getting Started",
            items: [
                {
                    slug: "introduction",
                    linkText: "Introduction",
                    description: "Getting started with Aphiria",
                },
                {
                    slug: "installation",
                    linkText: "Installation",
                    description: "Installing Aphiria",
                },
            ],
        },
        {
            title: "Core Concepts",
            items: [{ slug: "routing", linkText: "Routing", description: "Route configuration" }],
        },
    ];

    it("renders all navigation sections", () => {
        render(<SidebarNav sections={mockSections} version="1.x" contextSelector={null} />);

        expect(screen.getByText("Getting Started")).toBeInTheDocument();
        expect(screen.getByText("Core Concepts")).toBeInTheDocument();
    });

    it("renders all navigation items with correct hrefs", () => {
        const { container } = render(
            <SidebarNav sections={mockSections} version="1.x" contextSelector={null} />
        );

        const introLink = container.querySelector('a[href="/docs/1.x/introduction"]');
        expect(introLink).toBeInTheDocument();
        expect(introLink).toHaveTextContent("Introduction");
        expect(introLink).toHaveAttribute("title", "Getting started with Aphiria");

        const installLink = container.querySelector('a[href="/docs/1.x/installation"]');
        expect(installLink).toBeInTheDocument();
        expect(installLink).toHaveTextContent("Installation");

        const routingLink = container.querySelector('a[href="/docs/1.x/routing"]');
        expect(routingLink).toBeInTheDocument();
        expect(routingLink).toHaveTextContent("Routing");
    });

    it("highlights active link based on currentSlug", () => {
        const { container } = render(
            <SidebarNav
                sections={mockSections}
                version="1.x"
                currentSlug="routing"
                contextSelector={null}
            />
        );

        const routingLink = container.querySelector('a[href="/docs/1.x/routing"]');
        expect(routingLink).toHaveClass("selected");

        const introLink = container.querySelector('a[href="/docs/1.x/introduction"]');
        expect(introLink).not.toHaveClass("selected");
    });

    it("renders context selector", () => {
        render(
            <SidebarNav
                sections={mockSections}
                version="1.x"
                contextSelector={<div data-testid="context-selector">Context Selector</div>}
            />
        );

        expect(screen.getByTestId("context-selector")).toBeInTheDocument();
    });

    it("applies correct CSS class to nav", () => {
        const { container } = render(
            <SidebarNav sections={mockSections} version="1.x" contextSelector={null} />
        );

        const nav = screen.getByRole("navigation");
        expect(nav).toHaveClass("side-nav");
    });

    it("handles different versions", () => {
        const { container } = render(
            <SidebarNav sections={mockSections} version="2.x" contextSelector={null} />
        );

        const introLink = container.querySelector('a[href="/docs/2.x/introduction"]');
        expect(introLink).toBeInTheDocument();
    });

    it("renders without currentSlug (no active link)", () => {
        const { container } = render(
            <SidebarNav sections={mockSections} version="1.x" contextSelector={null} />
        );

        const links = container.querySelectorAll("a.selected");
        expect(links).toHaveLength(0);
    });
});
