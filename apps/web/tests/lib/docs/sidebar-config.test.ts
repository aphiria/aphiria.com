import { describe, it, expect } from "vitest";
import { getSidebarForVersion, sidebar1x } from "@/lib/docs/sidebar-config";

describe("sidebar-config", () => {
    describe("getSidebarForVersion", () => {
        it('returns sidebar1x for version "1.x"', () => {
            const result = getSidebarForVersion("1.x");

            expect(result).toBe(sidebar1x);
        });

        it("returns empty array for unknown version", () => {
            const result = getSidebarForVersion("2.x");

            expect(result).toEqual([]);
        });

        it("returns empty array for invalid version", () => {
            const result = getSidebarForVersion("invalid");

            expect(result).toEqual([]);
        });
    });

    describe("sidebar1x", () => {
        it("has expected structure", () => {
            expect(sidebar1x).toBeInstanceOf(Array);
            expect(sidebar1x.length).toBeGreaterThan(0);
        });

        it("has sections with titles and items", () => {
            sidebar1x.forEach((section) => {
                expect(section).toHaveProperty("title");
                expect(section).toHaveProperty("items");
                expect(section.title).toBeTruthy();
                expect(section.items).toBeInstanceOf(Array);
            });
        });

        it("has items with required fields", () => {
            sidebar1x.forEach((section) => {
                section.items.forEach((item) => {
                    expect(item).toHaveProperty("slug");
                    expect(item).toHaveProperty("title");
                    expect(item).toHaveProperty("linkText");
                    expect(item).toHaveProperty("description");
                    expect(item).toHaveProperty("keywords");
                    expect(item.slug).toBeTruthy();
                    expect(item.title).toBeTruthy();
                    expect(item.linkText).toBeTruthy();
                    expect(item.description).toBeTruthy();
                    expect(item.keywords).toBeInstanceOf(Array);
                });
            });
        });

        it("has Getting Started section as first", () => {
            expect(sidebar1x[0].title).toBe("Getting Started");
        });

        it("has introduction as first item in Getting Started", () => {
            const gettingStarted = sidebar1x[0];

            expect(gettingStarted.items[0].slug).toBe("introduction");
        });

        it("includes expected sections", () => {
            const sectionTitles = sidebar1x.map((s) => s.title);

            expect(sectionTitles).toContain("Getting Started");
            expect(sectionTitles).toContain("Configuration");
            expect(sectionTitles).toContain("Building Your API");
            expect(sectionTitles).toContain("Auth");
            expect(sectionTitles).toContain("Libraries");
        });

        it("has unique slugs across all items", () => {
            const slugs = sidebar1x.flatMap((section) => section.items.map((item) => item.slug));
            const uniqueSlugs = new Set(slugs);

            expect(slugs.length).toBe(uniqueSlugs.size);
        });
    });
});
