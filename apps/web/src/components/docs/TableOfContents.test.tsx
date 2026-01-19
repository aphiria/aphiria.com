import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TableOfContents } from "./TableOfContents";
import { TocHeading } from "@/lib/docs/toc-generator";

describe("TableOfContents", () => {
    afterEach(() => {
        cleanup();
    });

    it("returns null when headings array is empty", () => {
        const { container } = render(<TableOfContents headings={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it("renders table of contents with h2 headings", () => {
        const headings: TocHeading[] = [
            { id: "intro", text: "Introduction", level: 2, children: [] },
            { id: "conclusion", text: "Conclusion", level: 2, children: [] },
        ];

        render(<TableOfContents headings={headings} />);

        expect(screen.getByRole("navigation")).toBeInTheDocument();
        expect(screen.getByText("Table of Contents")).toBeInTheDocument();
        expect(screen.getByText("Introduction")).toHaveAttribute("href", "#intro");
        expect(screen.getByText("Conclusion")).toHaveAttribute("href", "#conclusion");
    });

    it("renders nested h3 headings", () => {
        const headings: TocHeading[] = [
            {
                id: "features",
                text: "Features",
                level: 2,
                children: [
                    { id: "routing", text: "Routing", level: 3 },
                    { id: "middleware", text: "Middleware", level: 3 },
                ],
            },
        ];

        const { container } = render(<TableOfContents headings={headings} />);

        expect(screen.getByText("Features")).toHaveAttribute("href", "#features");
        expect(screen.getByText("Routing")).toHaveAttribute("href", "#routing");
        expect(screen.getByText("Middleware")).toHaveAttribute("href", "#middleware");

        // Check nesting structure
        const nestedLists = container.querySelectorAll("ol ol");
        expect(nestedLists).toHaveLength(1);
    });

    it("applies context classes to list items", () => {
        const headings: TocHeading[] = [
            {
                id: "framework",
                text: "Framework Feature",
                level: 2,
                context: "context-framework",
                children: [],
            },
            {
                id: "library",
                text: "Library Feature",
                level: 2,
                context: "context-library",
                children: [],
            },
        ];

        const { container } = render(<TableOfContents headings={headings} />);

        const frameworkLi = container.querySelector("li.context-framework");
        expect(frameworkLi).toBeInTheDocument();
        expect(frameworkLi).toHaveTextContent("Framework Feature");

        const libraryLi = container.querySelector("li.context-library");
        expect(libraryLi).toBeInTheDocument();
        expect(libraryLi).toHaveTextContent("Library Feature");
    });

    it("applies context classes to nested h3 items", () => {
        const headings: TocHeading[] = [
            {
                id: "features",
                text: "Features",
                level: 2,
                children: [
                    {
                        id: "framework-feature",
                        text: "Framework",
                        level: 3,
                        context: "context-framework",
                    },
                    {
                        id: "library-feature",
                        text: "Library",
                        level: 3,
                        context: "context-library",
                    },
                ],
            },
        ];

        const { container } = render(<TableOfContents headings={headings} />);

        const frameworkH3 = container.querySelector("ol ol li.context-framework");
        expect(frameworkH3).toBeInTheDocument();
        expect(frameworkH3).toHaveTextContent("Framework");

        const libraryH3 = container.querySelector("ol ol li.context-library");
        expect(libraryH3).toBeInTheDocument();
        expect(libraryH3).toHaveTextContent("Library");
    });

    it("handles h2 with no children", () => {
        const headings: TocHeading[] = [
            { id: "intro", text: "Introduction", level: 2, children: [] },
        ];

        const { container } = render(<TableOfContents headings={headings} />);

        expect(screen.getByText("Introduction")).toBeInTheDocument();
        const nestedLists = container.querySelectorAll("ol ol");
        expect(nestedLists).toHaveLength(0);
    });

    it("renders correct CSS classes", () => {
        const headings: TocHeading[] = [
            { id: "intro", text: "Introduction", level: 2, children: [] },
        ];

        const { container } = render(<TableOfContents headings={headings} />);

        expect(container.querySelector("nav.toc-nav")).toBeInTheDocument();
        expect(container.querySelector(".toc-nav-contents")).toBeInTheDocument();
    });
});
