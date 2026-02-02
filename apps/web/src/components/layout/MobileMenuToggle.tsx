"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Mobile menu toggle controller
 *
 * Handles:
 * - Toggle body.nav-open class when clicking mobile menu button
 * - Close menu when clicking gray-out overlay
 * - Close menu on any URL change
 */
export function MobileMenuToggle() {
    const pathname = usePathname();

    useEffect(() => {
        const mobileMenuLink = document.querySelector("#mobile-menu a");
        const grayOut = document.getElementById("gray-out");
        const sideNav = document.querySelector("nav.side-nav") as HTMLElement;

        function toggleMenu(e: Event) {
            e.preventDefault();
            document.body.classList.toggle("nav-open");
        }

        function closeMenu() {
            document.body.classList.remove("nav-open");
        }

        mobileMenuLink?.addEventListener("click", toggleMenu);
        grayOut?.addEventListener("click", closeMenu);

        // Close menu on this navigation
        document.body.classList.remove("nav-open");

        // Clear any inline styles set by TocHighlighter on docs pages
        // This ensures side nav height is correct when navigating to non-docs pages
        if (sideNav) {
            sideNav.style.bottom = "";
            sideNav.style.top = "";
        }

        return () => {
            mobileMenuLink?.removeEventListener("click", toggleMenu);
            grayOut?.removeEventListener("click", closeMenu);
        };
    }, [pathname]);

    return null;
}
