"use client";

import { useEffect } from "react";

/**
 * Mobile menu toggle controller
 *
 * Handles:
 * - Toggle body.nav-open class when clicking mobile menu button
 * - Close menu when clicking gray-out overlay
 */
export function MobileMenuToggle() {
    useEffect(() => {
        const mobileMenuLink = document.querySelector("#mobile-menu a");
        const grayOut = document.getElementById("gray-out");

        function toggleMenu(e: Event) {
            e.preventDefault();
            document.body.classList.toggle("nav-open");
        }

        function closeMenu() {
            document.body.classList.remove("nav-open");
        }

        mobileMenuLink?.addEventListener("click", toggleMenu);
        grayOut?.addEventListener("click", closeMenu);

        return () => {
            mobileMenuLink?.removeEventListener("click", toggleMenu);
            grayOut?.removeEventListener("click", closeMenu);
        };
    }, []);

    return null;
}
