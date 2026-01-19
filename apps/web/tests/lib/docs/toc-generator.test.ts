import { describe, it, expect } from "vitest";
import { generateToc } from "@/lib/docs/toc-generator";

describe("toc-generator", () => {
    describe("generateToc", () => {
        it("extracts h2 and h3 headings with hierarchy", () => {
            const html = `
                <h2 id="intro">Introduction</h2>
                <p>Content</p>
                <h2 id="features">Features</h2>
                <h3 id="routing">Routing</h3>
                <h3 id="middleware">Middleware</h3>
                <h2 id="conclusion">Conclusion</h2>
            `;

            const result = generateToc(html);

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                id: "intro",
                text: "Introduction",
                level: 2,
                children: [],
            });
            expect(result[1]).toEqual({
                id: "features",
                text: "Features",
                level: 2,
                children: [
                    { id: "routing", text: "Routing", level: 3 },
                    { id: "middleware", text: "Middleware", level: 3 },
                ],
            });
            expect(result[2]).toEqual({
                id: "conclusion",
                text: "Conclusion",
                level: 2,
                children: [],
            });
        });

        it("skips headings without id", () => {
            const html = `
                <h2 id="intro">Introduction</h2>
                <h2>No ID</h2>
                <h2 id="conclusion">Conclusion</h2>
            `;

            const result = generateToc(html);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe("intro");
            expect(result[1].id).toBe("conclusion");
        });

        it("skips headings without text", () => {
            const html = `
                <h2 id="intro">Introduction</h2>
                <h2 id="empty"></h2>
                <h2 id="conclusion">Conclusion</h2>
            `;

            const result = generateToc(html);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe("intro");
            expect(result[1].id).toBe("conclusion");
        });

        it("detects context-framework class", () => {
            const html = `
                <div class="context-framework">
                    <h2 id="framework-feature">Framework Feature</h2>
                    <h3 id="framework-sub">Framework Sub</h3>
                </div>
            `;

            const result = generateToc(html);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: "framework-feature",
                text: "Framework Feature",
                level: 2,
                context: "context-framework",
                children: [
                    {
                        id: "framework-sub",
                        text: "Framework Sub",
                        level: 3,
                        context: "context-framework",
                    },
                ],
            });
        });

        it("detects context-library class", () => {
            const html = `
                <div class="context-library">
                    <h2 id="library-feature">Library Feature</h2>
                    <h3 id="library-sub">Library Sub</h3>
                </div>
            `;

            const result = generateToc(html);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: "library-feature",
                text: "Library Feature",
                level: 2,
                context: "context-library",
                children: [
                    {
                        id: "library-sub",
                        text: "Library Sub",
                        level: 3,
                        context: "context-library",
                    },
                ],
            });
        });

        it("handles mixed context and global headings", () => {
            const html = `
                <h2 id="global">Global Heading</h2>
                <div class="context-framework">
                    <h2 id="framework">Framework Heading</h2>
                </div>
                <div class="context-library">
                    <h2 id="library">Library Heading</h2>
                </div>
            `;

            const result = generateToc(html);

            expect(result).toHaveLength(3);
            expect(result[0].context).toBeUndefined();
            expect(result[1].context).toBe("context-framework");
            expect(result[2].context).toBe("context-library");
        });

        it("trims whitespace from heading text", () => {
            const html = `
                <h2 id="intro">  Introduction  </h2>
            `;

            const result = generateToc(html);

            expect(result[0].text).toBe("Introduction");
        });

        it("returns empty array for html with no headings", () => {
            const html = `<p>No headings here</p>`;

            const result = generateToc(html);

            expect(result).toEqual([]);
        });

        it("ignores h3 without a parent h2", () => {
            const html = `
                <h3 id="orphan">Orphan H3</h3>
                <h2 id="intro">Introduction</h2>
                <h3 id="nested">Nested H3</h3>
            `;

            const result = generateToc(html);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: "intro",
                text: "Introduction",
                level: 2,
                children: [{ id: "nested", text: "Nested H3", level: 3 }],
            });
        });

        it("handles nested context divs (uses closest)", () => {
            const html = `
                <div class="context-framework">
                    <div class="some-wrapper">
                        <h2 id="nested">Nested Heading</h2>
                    </div>
                </div>
            `;

            const result = generateToc(html);

            expect(result[0].context).toBe("context-framework");
        });
    });
});
