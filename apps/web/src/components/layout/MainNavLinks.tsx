import Link from "next/link";

/**
 * Main navigation links (Docs, Source, Community)
 * Used in header on desktop and sidebar on mobile
 */
export function MainNavLinks() {
    return (
        <>
            <li className="main-nav-link">
                <Link href="/docs" title="Read the documentation">
                    Docs
                </Link>
            </li>
            <li className="main-nav-link">
                <a
                    href="https://github.com/aphiria/aphiria"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View the source code"
                >
                    Source
                </a>
            </li>
            <li className="main-nav-link">
                <a
                    href="https://github.com/aphiria/aphiria/discussions"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Join our community"
                >
                    Community
                </a>
            </li>
        </>
    );
}
