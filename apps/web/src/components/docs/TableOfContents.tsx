import { TocHeading } from "@/lib/docs/toc-generator";

interface TableOfContentsProps {
    /** TOC headings (h2 with nested h3) */
    headings: TocHeading[];
}

/**
 * Table of contents component with hierarchical navigation
 *
 * Server component that renders TOC with nested lists
 */
export function TableOfContents({ headings }: TableOfContentsProps) {
    if (headings.length === 0) {
        return null;
    }

    return (
        <nav className="toc-nav">
            <div className="toc-nav-contents">
                <h2 id="table-of-contents">Table of Contents</h2>
                <ol>
                    {headings.map((h2) => (
                        <li key={h2.id} className={h2.context}>
                            <a href={`#${h2.id}`}>{h2.text}</a>
                            {h2.children && h2.children.length > 0 && (
                                <ol>
                                    {h2.children.map((h3) => (
                                        <li key={h3.id} className={h3.context}>
                                            <a href={`#${h3.id}`}>{h3.text}</a>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </li>
                    ))}
                </ol>
            </div>
        </nav>
    );
}
