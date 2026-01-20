import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContextSelector } from "@/components/docs/ContextSelector";
import { SidebarNav } from "@/components/docs/SidebarNav";
import { DocContent } from "@/components/docs/DocContent";
import { TableOfContents } from "@/components/docs/TableOfContents";
import { TocHighlighter } from "@/components/docs/TocHighlighter";
import { readDocHtml, readDocMeta } from "@/lib/docs/artifact-reader";
import { getSidebarForVersion } from "@/lib/docs/sidebar-config";
import { generateToc } from "@/lib/docs/toc-generator";

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
 */
export default async function DocPage({ params }: PageProps) {
    const { version, slug } = await params;

    // For static export, pass default context
    // ContextSelector will resolve actual context client-side from query params/cookies
    const context = "framework";

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
            <SidebarNav
                sections={sidebarSections}
                currentSlug={slug}
                version={version}
                contextSelector={<ContextSelector initialContext={context} />}
            />
            <article>
                <div id="article-loading"></div>
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
 * Generate static params for all doc pages
 *
 * Required for static export (output: "export")
 */
export async function generateStaticParams() {
    const allDocs = readDocMeta();

    return allDocs.map((doc) => ({
        version: doc.version,
        slug: doc.slug,
    }));
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
