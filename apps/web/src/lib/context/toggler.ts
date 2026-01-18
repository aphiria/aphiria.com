import { Context } from "@/types/context";

/**
 * Toggle DOM visibility for context-specific elements
 *
 * Shows elements matching the selected context, hides others
 *
 * @param context - The context to display ("framework" or "library")
 */
export function toggleContextVisibility(context: Context): void {
    const frameworkElements = document.querySelectorAll(".context-framework");
    const libraryElements = document.querySelectorAll(".context-library");

    if (context === "framework") {
        frameworkElements.forEach((el) => {
            (el as HTMLElement).style.display = "revert";
        });
        libraryElements.forEach((el) => {
            (el as HTMLElement).style.display = "none";
        });
    } else if (context === "library") {
        frameworkElements.forEach((el) => {
            (el as HTMLElement).style.display = "none";
        });
        libraryElements.forEach((el) => {
            (el as HTMLElement).style.display = "revert";
        });
    }

    // Dispatch custom event for side effects (e.g., sticky nav recalculation)
    document.dispatchEvent(new CustomEvent("context-toggled"));
}
