import Link from "next/link";
import { ReactNode } from "react";
import { NavigationSection } from "@/types/navigation";

interface SidebarNavProps {
    /** Navigation sections to display */
    sections: NavigationSection[];

    /** Current page slug for active link highlighting */
    currentSlug?: string;

    /** Version for building hrefs */
    version: string;

    /** Context selector component (client component) */
    contextSelector: ReactNode;
}

/**
 * Sidebar navigation component
 *
 * Server component that renders navigation sections with active link highlighting
 */
export function SidebarNav({ sections, currentSlug, version, contextSelector }: SidebarNavProps) {
    return (
        <nav className="side-nav">
            <label title="Choose the context to view the documentation with">
                Context:
                {contextSelector}
            </label>
            {sections.map((section) => (
                <section key={section.title}>
                    <h3>{section.title}</h3>
                    <ul>
                        {section.items.map((item) => {
                            const href = `/docs/${version}/${item.slug}`;
                            const isActive = item.slug === currentSlug;

                            return (
                                <li key={item.slug}>
                                    <Link
                                        href={href}
                                        title={item.description}
                                        className={isActive ? "selected" : ""}
                                    >
                                        {item.linkText}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}
        </nav>
    );
}
