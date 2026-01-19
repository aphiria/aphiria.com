"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Copy-to-clipboard buttons for code samples
 *
 * Adds copy button to all <pre> elements (except .no-copy)
 * Shows checkmark feedback for 3 seconds after copying
 */
export function CopyButtons() {
    const pathname = usePathname();

    useEffect(() => {
        console.log("[CopyButtons] useEffect running, pathname:", pathname);
        const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"></path></svg>`;
        const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/></svg>`;

        const preElements = document.querySelectorAll("pre[class*='language-']");
        console.log("[CopyButtons] Found", preElements.length, "pre elements");

        preElements.forEach((pre, index) => {
            // Skip if already has button or is marked no-copy
            if (pre.classList.contains("no-copy") || pre.querySelector(".copy-button")) {
                console.log("[CopyButtons] Skipping pre", index, "(already has button or no-copy)");
                return;
            }
            console.log("[CopyButtons] Adding button to pre", index);

            const code = pre.querySelector("code");
            if (!code) {
                return;
            }

            // Create button wrapper and button
            const wrapper = document.createElement("div");
            wrapper.className = "button-wrapper";

            const button = document.createElement("button");
            button.className = "copy-button";
            button.innerHTML = copyIcon;
            button.title = "Copy to clipboard";

            wrapper.appendChild(button);
            pre.insertBefore(wrapper, pre.firstChild);

            // Handle copy
            button.addEventListener("click", async () => {
                try {
                    const text = code.textContent?.trim() || "";
                    await navigator.clipboard.writeText(text);

                    // Show feedback
                    button.innerHTML = checkIcon;
                    setTimeout(() => {
                        button.innerHTML = copyIcon;
                    }, 3000);
                } catch (error) {
                    console.error("Failed to copy:", error);
                }
            });
        });
    }, [pathname]);

    return null;
}
