import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContextSelector } from "@/components/docs/ContextSelector";
import { SidebarNav } from "@/components/docs/SidebarNav";
import { DocContent } from "@/components/docs/DocContent";
import { TableOfContents } from "@/components/docs/TableOfContents";
import { TocHighlighter } from "@/components/docs/TocHighlighter";
import { readDocHtml } from "@/lib/docs/artifact-reader";
import { getSidebarForVersion } from "@/lib/docs/sidebar-config";
import { generateToc } from "@/lib/docs/toc-generator";

// Cache docs pages for 1 hour
export const revalidate = 3600;

interface PageProps {
    params: Promise<{
        version: string;
        slug: string;
    }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Dynamic doc page
 *
 * Renders docs with:
 * - Sidebar navigation with context selector
 * - Sanitized HTML content
 *
 * SSR: Resolves context server-side to eliminate flicker
 */
export default async function DocPage({ params, searchParams }: PageProps) {
    const { version, slug } = await params;
    const resolvedSearchParams = await searchParams;

    // Get context from URL param only (server-side, cacheable)
    // Client-side JS will sync cookie → URL on initial load
    const context = resolvedSearchParams.context === "library" ? "library" : "framework";

    // CSS to hide context-specific content based on URL param
    // This prevents flicker by applying correct visibility from first paint
    const contextCss =
        context === "framework"
            ? `.context-library { display: none; }`
            : `.context-framework { display: none; }`;

    // Load doc HTML
    const html = readDocHtml(slug);
    if (!html) {
        notFound();
    }

    // Get sidebar navigation
    const sidebarSections = getSidebarForVersion(version);

    // Generate table of contents from HTML
    const tocHeadings = generateToc(html);

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: contextCss }} />
            <SidebarNav
                sections={sidebarSections}
                currentSlug={slug}
                version={version}
                context={context}
                contextSelector={<ContextSelector initialContext={context} />}
            />
            <article>
                <TableOfContents headings={tocHeadings} />
                <DocContent html={html} />
                <footer>
                    <a
                        href={`https://github.com/aphiria/aphiria.com/blob/master/docs/${slug}.md`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Edit this document"
                    >
                        <span className="edit-icon">&#9998;</span> Edit this document
                    </a>
                </footer>
            </article>
            <TocHighlighter />
            <div id="gray-out"></div>
        </>
    );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const sidebarSections = getSidebarForVersion("1.x");

    // Find the page metadata from sidebar config
    let pageMetadata: { title: string; description: string; keywords: string[] } | undefined;

    for (const section of sidebarSections) {
        const item = section.items.find((i) => i.slug === slug);
        if (item) {
            pageMetadata = {
                title: item.title,
                description: item.description,
                keywords: item.keywords,
            };
            break;
        }
    }

    if (!pageMetadata) {
        return {
            title: "Documentation | Aphiria",
        };
    }

    return {
        title: `${pageMetadata.title} | Aphiria`,
        description: pageMetadata.description,
        keywords: pageMetadata.keywords.join(", "),
    };
}
