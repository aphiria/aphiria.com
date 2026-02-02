import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MobileMenuToggle } from "@/components/layout/MobileMenuToggle";

// Mock usePathname
const mockUsePathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
    usePathname: () => mockUsePathname(),
}));

describe("MobileMenuToggle", () => {
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = "";
        document.body.className = "";
        vi.clearAllMocks();
    });

    it("renders null (no visible output)", () => {
        const { container } = render(<MobileMenuToggle />);
        expect(container.firstChild).toBeNull();
    });

    it("toggles nav-open class when mobile menu is clicked", () => {
        document.body.innerHTML = `
            <div id="mobile-menu"><a href="#">Menu</a></div>
            <div id="gray-out"></div>
        `;

        render(<MobileMenuToggle />);

        const mobileMenuLink = document.querySelector("#mobile-menu a") as HTMLElement;

        expect(document.body.classList.contains("nav-open")).toBe(false);

        mobileMenuLink.click();
        expect(document.body.classList.contains("nav-open")).toBe(true);

        mobileMenuLink.click();
        expect(document.body.classList.contains("nav-open")).toBe(false);
    });

    it("closes menu when gray-out overlay is clicked", () => {
        document.body.innerHTML = `
            <div id="mobile-menu"><a href="#">Menu</a></div>
            <div id="gray-out"></div>
        `;
        document.body.classList.add("nav-open");

        render(<MobileMenuToggle />);

        const grayOut = document.getElementById("gray-out") as HTMLElement;
        grayOut.click();

        expect(document.body.classList.contains("nav-open")).toBe(false);
    });

    it("closes menu when pathname changes", () => {
        document.body.innerHTML = `
            <div id="mobile-menu"><a href="#">Menu</a></div>
            <div id="gray-out"></div>
        `;
        document.body.classList.add("nav-open");

        const { rerender } = render(<MobileMenuToggle />);

        expect(document.body.classList.contains("nav-open")).toBe(false);

        // Simulate navigation by changing pathname
        document.body.classList.add("nav-open");
        mockUsePathname.mockReturnValue("/docs");
        rerender(<MobileMenuToggle />);

        expect(document.body.classList.contains("nav-open")).toBe(false);
    });

    it("handles missing DOM elements gracefully", () => {
        // No mobile menu or gray-out in DOM
        expect(() => render(<MobileMenuToggle />)).not.toThrow();
    });

    it("cleans up event listeners on unmount", () => {
        document.body.innerHTML = `
            <div id="mobile-menu"><a href="#">Menu</a></div>
            <div id="gray-out"></div>
        `;

        const { unmount } = render(<MobileMenuToggle />);
        const mobileMenuLink = document.querySelector("#mobile-menu a") as HTMLElement;

        unmount();

        // After unmount, clicking should not toggle class
        document.body.classList.remove("nav-open");
        mobileMenuLink.click();
        expect(document.body.classList.contains("nav-open")).toBe(false);
    });

    it("clears inline styles on side nav when pathname changes", () => {
        document.body.innerHTML = `
            <div id="mobile-menu"><a href="#">Menu</a></div>
            <div id="gray-out"></div>
            <nav class="side-nav" style="bottom: 100px; top: 50px;"></nav>
        `;

        render(<MobileMenuToggle />);

        const sideNav = document.querySelector("nav.side-nav") as HTMLElement;

        // Inline styles should be cleared
        expect(sideNav.style.bottom).toBe("");
        expect(sideNav.style.top).toBe("");
    });

    it("handles missing side nav gracefully when clearing styles", () => {
        document.body.innerHTML = `
            <div id="mobile-menu"><a href="#">Menu</a></div>
            <div id="gray-out"></div>
        `;

        // No side nav in DOM - should not throw
        expect(() => render(<MobileMenuToggle />)).not.toThrow();
    });
});
