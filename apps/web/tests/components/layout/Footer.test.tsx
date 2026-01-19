import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/Footer";

describe("Footer", () => {
    it("renders footer with creator link", () => {
        render(<Footer />);

        expect(screen.getByRole("contentinfo")).toBeInTheDocument();
        expect(screen.getByText(/Aphiria/)).toBeInTheDocument();
    });

    it("links to David Young's GitHub", () => {
        const { container } = render(<Footer />);

        const link = container.querySelector('a[href="https://github.com/davidbyoung"]');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
        expect(link).toHaveAttribute("title", "David Young's GitHub");
        expect(link).toHaveTextContent("David Young");
    });
});
