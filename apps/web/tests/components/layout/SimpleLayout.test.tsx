import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SimpleLayout } from "@/components/layout/SimpleLayout";

// Mock child components
vi.mock("@/components/layout/Header", () => ({
    Header: () => <header data-testid="header">Header</header>,
}));

vi.mock("@/components/layout/Footer", () => ({
    Footer: () => <footer data-testid="footer">Footer</footer>,
}));

describe("SimpleLayout", () => {
    it("renders header, children, and footer", () => {
        render(
            <SimpleLayout>
                <div>Page Content</div>
            </SimpleLayout>
        );

        expect(screen.getByTestId("header")).toBeInTheDocument();
        expect(screen.getByText("Page Content")).toBeInTheDocument();
        expect(screen.getByTestId("footer")).toBeInTheDocument();
    });

    it("wraps children in main element with home class", () => {
        const { container } = render(
            <SimpleLayout>
                <div>Content</div>
            </SimpleLayout>
        );

        const main = container.querySelector("main.home");
        expect(main).toBeInTheDocument();
        expect(main).toHaveTextContent("Content");
    });

    it("includes gray-out div for mobile overlay", () => {
        const { container } = render(
            <SimpleLayout>
                <div>Content</div>
            </SimpleLayout>
        );

        const grayOut = container.querySelector("#gray-out");
        expect(grayOut).toBeInTheDocument();
    });
});
