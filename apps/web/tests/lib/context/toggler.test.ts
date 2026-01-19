import { describe, it, expect, beforeEach, vi } from "vitest";
import { toggleContextVisibility } from "@/lib/context/toggler";

describe("context toggler", () => {
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = "";
    });

    describe("toggleContextVisibility", () => {
        it("shows framework elements and hides library elements when framework selected", () => {
            document.body.innerHTML = `
                <div class="context-framework" style="display: none;">Framework</div>
                <div class="context-library" style="display: revert;">Library</div>
            `;

            const frameworkEl = document.querySelector(".context-framework") as HTMLElement;
            const libraryEl = document.querySelector(".context-library") as HTMLElement;

            toggleContextVisibility("framework");

            expect(frameworkEl.style.display).toBe("revert");
            expect(libraryEl.style.display).toBe("none");
        });

        it("shows library elements and hides framework elements when library selected", () => {
            document.body.innerHTML = `
                <div class="context-framework" style="display: revert;">Framework</div>
                <div class="context-library" style="display: none;">Library</div>
            `;

            const frameworkEl = document.querySelector(".context-framework") as HTMLElement;
            const libraryEl = document.querySelector(".context-library") as HTMLElement;

            toggleContextVisibility("library");

            expect(frameworkEl.style.display).toBe("none");
            expect(libraryEl.style.display).toBe("revert");
        });

        it("handles multiple framework elements", () => {
            document.body.innerHTML = `
                <div class="context-framework">Framework 1</div>
                <div class="context-framework">Framework 2</div>
                <div class="context-library">Library</div>
            `;

            toggleContextVisibility("framework");

            const frameworkEls = document.querySelectorAll(".context-framework");
            frameworkEls.forEach((el) => {
                expect((el as HTMLElement).style.display).toBe("revert");
            });
        });

        it("handles multiple library elements", () => {
            document.body.innerHTML = `
                <div class="context-framework">Framework</div>
                <div class="context-library">Library 1</div>
                <div class="context-library">Library 2</div>
            `;

            toggleContextVisibility("library");

            const libraryEls = document.querySelectorAll(".context-library");
            libraryEls.forEach((el) => {
                expect((el as HTMLElement).style.display).toBe("revert");
            });
        });

        it("hides loading indicator when context is set", () => {
            document.body.innerHTML = `
                <div id="article-loading" style="display: block;">Loading...</div>
                <div class="context-framework">Framework</div>
            `;

            const loadingEl = document.getElementById("article-loading")!;

            toggleContextVisibility("framework");

            expect(loadingEl.style.display).toBe("none");
        });

        it("handles missing loading indicator gracefully", () => {
            document.body.innerHTML = `
                <div class="context-framework">Framework</div>
            `;

            expect(() => toggleContextVisibility("framework")).not.toThrow();
        });

        it("dispatches context-toggled custom event", () => {
            const eventListener = vi.fn();
            document.addEventListener("context-toggled", eventListener);

            document.body.innerHTML = '<div class="context-framework">Framework</div>';

            toggleContextVisibility("framework");

            expect(eventListener).toHaveBeenCalledTimes(1);
            expect(eventListener).toHaveBeenCalledWith(expect.any(CustomEvent));

            document.removeEventListener("context-toggled", eventListener);
        });

        it("works with no context elements present", () => {
            document.body.innerHTML = "<p>No context elements</p>";

            expect(() => toggleContextVisibility("framework")).not.toThrow();
        });

        it("toggles from framework to library", () => {
            document.body.innerHTML = `
                <div class="context-framework">Framework</div>
                <div class="context-library">Library</div>
            `;

            const frameworkEl = document.querySelector(".context-framework") as HTMLElement;
            const libraryEl = document.querySelector(".context-library") as HTMLElement;

            // First set to framework
            toggleContextVisibility("framework");
            expect(frameworkEl.style.display).toBe("revert");
            expect(libraryEl.style.display).toBe("none");

            // Then toggle to library
            toggleContextVisibility("library");
            expect(frameworkEl.style.display).toBe("none");
            expect(libraryEl.style.display).toBe("revert");
        });
    });
});
