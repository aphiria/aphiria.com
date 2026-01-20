/**
 * Navigation link item with metadata
 */
export interface NavigationItem {
    /** URL slug (e.g., "installation", "routing") */
    slug: string;

    /** Page title (used in <title> tag) */
    title: string;

    /** Display text for the link (sidebar label) */
    linkText: string;

    /** Description for title attribute and meta description */
    description: string;

    /** Keywords for meta keywords tag */
    keywords: string[];
}

/**
 * Navigation section with grouped links
 */
export interface NavigationSection {
    /** Section heading (e.g., "Getting Started", "HTTP") */
    title: string;

    /** Links within this section */
    items: NavigationItem[];
}
