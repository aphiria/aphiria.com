import Image from "next/image";
import Link from "next/link";
import { DocSearch } from "@/components/docs/DocSearch";
import { MainNavLinks } from "@/components/layout/MainNavLinks";

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
                    <MainNavLinks />
                    <li id="mobile-menu">
                        <a href="#" title="Expand menu">
                            &equiv;
                        </a>
                    </li>
                </ul>
                <DocSearch />
            </nav>
        </header>
    );
}
