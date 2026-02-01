import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Mock the cookie helpers
vi.mock("@/lib/cookies/theme-cookie.client", () => ({
    setThemeCookie: vi.fn(),
    getThemeCookie: vi.fn(() => null),
}));

describe("Footer", () => {
    it("renders footer with creator link", () => {
        render(
            <ThemeProvider defaultTheme="light">
                <Footer />
            </ThemeProvider>
        );

        expect(screen.getByRole("contentinfo")).toBeInTheDocument();
        expect(screen.getByText(/Aphiria/)).toBeInTheDocument();
    });

    it("links to David Young's GitHub", () => {
        const { container } = render(
            <ThemeProvider defaultTheme="light">
                <Footer />
            </ThemeProvider>
        );

        const link = container.querySelector('a[href="https://github.com/davidbyoung"]');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
        expect(link).toHaveAttribute("title", "David Young's GitHub");
        expect(link).toHaveTextContent("David Young");
    });
});
