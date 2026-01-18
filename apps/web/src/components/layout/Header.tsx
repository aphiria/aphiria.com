import Image from "next/image";
import Link from "next/link";

/**
 * Main site header with navigation and search
 */
export function Header() {
    return (
        <header>
            <nav>
                <ul className="main-nav">
                    <li className="logo">
                        <Link href="/" title="Aphiria">
                            <Image
                                src="/images/aphiria-logo.svg"
                                alt="Aphiria"
                                className="logo"
                                width={141}
                                height={40}
                                priority
                            />
                        </Link>
                    </li>
                    <li className="main-nav-link">
                        <Link href="/docs/1.x/introduction" title="Read the documentation">
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
                    <li id="mobile-menu">
                        <a href="#" title="Expand menu">
                            &equiv;
                        </a>
                    </li>
                </ul>
                <div className="doc-search">
                    <input
                        type="text"
                        id="search-query"
                        placeholder="Search docs"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <ul className="search-results"></ul>
                </div>
            </nav>
        </header>
    );
}
