import { describe, it, expect } from "vitest";
import { extractDocTitle, generateDocMeta, generateMetaJson } from "../src/meta-generator";

describe("Meta Generator", () => {
    describe("extractDocTitle", () => {
        it("extracts title from h1#doc-title element", () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="doc-title">Installation Guide</h1>
            <p>Content here</p>
        </article>
    </main>
</body>
`;
            const title = extractDocTitle(html);
            expect(title).toBe("Installation Guide");
        });

        it("trims whitespace from title", () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="doc-title">
                Installation Guide
            </h1>
        </article>
    </main>
</body>
`;
            const title = extractDocTitle(html);
            expect(title).toBe("Installation Guide");
        });

        it("throws error when h1#doc-title is missing", () => {
            const html = `
<body>
    <main>
        <article>
            <h1>No ID on this heading</h1>
        </article>
    </main>
</body>
`;
            expect(() => extractDocTitle(html)).toThrow("Document missing h1#doc-title element");
        });
    });

    describe("generateDocMeta", () => {
        it("generates metadata with version, slug, and title", () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="doc-title">Routing</h1>
        </article>
    </main>
</body>
`;
            const meta = generateDocMeta(html, "1.x", "routing");

            expect(meta).toEqual({
                version: "1.x",
                slug: "routing",
                title: "Routing",
            });
        });
    });

    describe("generateMetaJson", () => {
        it("generates metadata for all documents", () => {
            const documents = [
                {
                    html: '<h1 id="doc-title">Installation</h1>',
                    version: "1.x",
                    slug: "installation",
                },
                {
                    html: '<h1 id="doc-title">Routing</h1>',
                    version: "1.x",
                    slug: "routing",
                },
                {
                    html: '<h1 id="doc-title">Configuration</h1>',
                    version: "2.x",
                    slug: "configuration",
                },
            ];

            const meta = generateMetaJson(documents);

            expect(meta).toEqual([
                { version: "1.x", slug: "installation", title: "Installation" },
                { version: "1.x", slug: "routing", title: "Routing" },
                { version: "2.x", slug: "configuration", title: "Configuration" },
            ]);
        });

        it("handles empty document list", () => {
            const meta = generateMetaJson([]);
            expect(meta).toEqual([]);
        });
    });
});
