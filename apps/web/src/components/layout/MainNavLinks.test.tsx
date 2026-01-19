import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainNavLinks } from "./MainNavLinks";

describe("MainNavLinks", () => {
    it("renders all three navigation links", () => {
        render(<MainNavLinks />);

        expect(screen.getByRole("link", { name: /Docs/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Source/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Community/i })).toBeInTheDocument();
    });

    it("links to docs page", () => {
        const { container } = render(<MainNavLinks />);

        const docsLink = container.querySelector('a[href="/docs"]');
        expect(docsLink).toBeInTheDocument();
        expect(docsLink).toHaveAttribute("title", "Read the documentation");
        expect(docsLink).toHaveTextContent("Docs");
    });

    it("links to GitHub source with correct attributes", () => {
        const { container } = render(<MainNavLinks />);

        const sourceLink = container.querySelector('a[href="https://github.com/aphiria/aphiria"]');
        expect(sourceLink).toBeInTheDocument();
        expect(sourceLink).toHaveAttribute("target", "_blank");
        expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
        expect(sourceLink).toHaveAttribute("title", "View the source code");
        expect(sourceLink).toHaveTextContent("Source");
    });

    it("links to GitHub discussions with correct attributes", () => {
        const { container } = render(<MainNavLinks />);

        const communityLink = container.querySelector(
            'a[href="https://github.com/aphiria/aphiria/discussions"]'
        );
        expect(communityLink).toBeInTheDocument();
        expect(communityLink).toHaveAttribute("target", "_blank");
        expect(communityLink).toHaveAttribute("rel", "noopener noreferrer");
        expect(communityLink).toHaveAttribute("title", "Join our community");
        expect(communityLink).toHaveTextContent("Community");
    });

    it("applies correct CSS classes", () => {
        const { container } = render(<MainNavLinks />);

        const items = container.querySelectorAll("li.main-nav-link");
        expect(items).toHaveLength(3);
    });
});
