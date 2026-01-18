"use client";

import { useEffect } from "react";

/**
 * TOC scroll-based highlighting
 *
 * Client component that updates TOC active link based on scroll position
 * Listens to scroll events and highlights the current section's TOC link
 */
export function TocHighlighter() {
    useEffect(() => {
        const toc = document.querySelector(".toc-nav-contents");
        const article = document.querySelector("article");
        const footer = document.querySelector("body > footer");

        if (!toc || !article || !footer) {
            return;
        }

        function updateTocHighlight() {
            const headers = getVisibleHeaders(article!);
            const currentHeader = findCurrentHeader(headers);

            if (!currentHeader) {
                return;
            }

            // Update TOC link highlighting
            toc!.querySelectorAll("a").forEach((link) => {
                if (link.getAttribute("href") === `#${currentHeader.id}`) {
                    link.classList.add("selected");
                } else {
                    link.classList.remove("selected");
                }
            });
        }

        function updateStickyBehavior() {
            const sideNav = document.querySelector("nav.side-nav");
            const footerRect = footer!.getBoundingClientRect();
            const bottomOffset =
                footerRect.top <= window.innerHeight
                    ? `${window.innerHeight - footerRect.top}px`
                    : "0px";

            if (sideNav) {
                (sideNav as HTMLElement).style.bottom = bottomOffset;
            }
            (toc as HTMLElement).style.bottom = bottomOffset;
        }

        function handleScroll() {
            updateStickyBehavior();
            updateTocHighlight();
        }

        function handleResize() {
            updateStickyBehavior();
        }

        function handleContextToggle() {
            updateStickyBehavior();
        }

        // Attach event listeners
        window.addEventListener("scroll", handleScroll);
        window.addEventListener("resize", handleResize);
        document.addEventListener("context-toggled", handleContextToggle);

        // Initial update
        updateStickyBehavior();
        updateTocHighlight();

        // Cleanup
        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleResize);
            document.removeEventListener("context-toggled", handleContextToggle);
        };
    }, []);

    return null;
}

/**
 * Get visible headers (excluding hidden context-specific headers)
 */
function getVisibleHeaders(article: Element): Element[] {
    const selector =
        ".toc-nav ~ h2, .toc-nav ~ h3, " +
        '.toc-nav ~ div:not([style*="display: none"]):not([style*="display:none"]) h2, ' +
        '.toc-nav ~ div:not([style*="display: none"]):not([style*="display:none"]) h3';

    return Array.from(article.querySelectorAll(selector));
}

/**
 * Find the current header based on scroll position
 */
function findCurrentHeader(headers: Element[]): Element | null {
    let current = headers[0];

    for (const header of headers) {
        if (header.getBoundingClientRect().top <= 6) {
            current = header;
        } else {
            break;
        }
    }

    return current || null;
}
