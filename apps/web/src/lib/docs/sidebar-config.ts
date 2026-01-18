import { NavigationSection } from "@/types/navigation";

/**
 * Sidebar navigation configuration for version 1.x
 *
 * Mirrors the structure from apps/api/src/Documentation/Binders/DocumentationBinder.php
 */
export const sidebar1x: NavigationSection[] = [
    {
        title: "Getting Started",
        items: [
            {
                slug: "introduction",
                title: "Introduction",
                linkText: "Introduction",
                description: "Get introduced to Aphiria",
                keywords: ["aphiria", "introduction", "php"],
            },
            {
                slug: "installation",
                title: "Installing",
                linkText: "Installing",
                description: "Learn how to install Aphiria",
                keywords: ["aphiria", "install", "php"],
            },
            {
                slug: "contributing",
                title: "Contributing",
                linkText: "Contributing",
                description: "Learn how to contribute to Aphiria",
                keywords: ["aphiria", "contributing", "php"],
            },
            {
                slug: "framework-comparisons",
                title: "Framework Comparisons",
                linkText: "Framework Comparisons",
                description: "Learn how Aphiria stacks up against other popular PHP frameworks",
                keywords: ["aphiria", "frameworks", "laravel", "symfony"],
            },
        ],
    },
    {
        title: "Configuration",
        items: [
            {
                slug: "application-builders",
                title: "Application Builders",
                linkText: "Application Builders",
                description: "Learn how to build an Aphiria application",
                keywords: ["aphiria", "application builder", "modules", "components", "php"],
            },
            {
                slug: "config-files",
                title: "Config Files",
                linkText: "Config Files",
                description: "Learn how to read configuration settings",
                keywords: ["aphiria", "configure", "config", "json", "yaml", "php"],
            },
            {
                slug: "dependency-injection",
                title: "Dependency Injection",
                linkText: "Dependency Injection",
                description: "Learn about injecting your dependencies in Aphiria",
                keywords: ["aphiria", "dependencies", "dependency injection", "container", "binders", "php"],
            },
            {
                slug: "exception-handling",
                title: "Exception Handling",
                linkText: "Exception Handling",
                description: "Learn how to handle unhandled exceptions in Aphiria",
                keywords: ["aphiria", "exceptions", "errors", "global exception handler"],
            },
        ],
    },
    {
        title: "Building Your API",
        items: [
            {
                slug: "routing",
                title: "Routing",
                linkText: "Routing",
                description: "Learn about creating an Aphiria router",
                keywords: ["aphiria", "routing", "router", "http", "php"],
            },
            {
                slug: "http-requests",
                title: "HTTP Requests",
                linkText: "Requests",
                description: "Learn the basics of HTTP requests in Aphiria",
                keywords: ["aphiria", "http", "requests", "php"],
            },
            {
                slug: "http-responses",
                title: "HTTP Responses",
                linkText: "Responses",
                description: "Learn the basics of HTTP responses in Aphiria",
                keywords: ["aphiria", "http", "responses", "php"],
            },
            {
                slug: "controllers",
                title: "Controllers",
                linkText: "Controllers",
                description: "Learn about setting up controllers for your endpoints in Aphiria",
                keywords: ["aphiria", "http", "controllers", "endpoints", "php"],
            },
            {
                slug: "middleware",
                title: "Middleware",
                linkText: "Middleware",
                description: "Learn about HTTP middleware in Aphiria",
                keywords: ["aphiria", "middleware", "http", "requests", "responses", "php"],
            },
            {
                slug: "content-negotiation",
                title: "Content Negotiation",
                linkText: "Content Negotiation",
                description: "Learn about how content negotiation works in Aphiria",
                keywords: ["aphiria", "content negotiation", "http", "php"],
            },
            {
                slug: "sessions",
                title: "Sessions",
                linkText: "Sessions",
                description: "Learn about server-side sessions in Aphiria",
                keywords: ["aphiria", "sessions", "http", "php"],
            },
            {
                slug: "testing-apis",
                title: "Testing APIs",
                linkText: "Testing APIs",
                description: "Learn how to test your Aphiria applications",
                keywords: ["aphiria", "integration tests", "testing", "php"],
            },
        ],
    },
    {
        title: "Auth",
        items: [
            {
                slug: "authentication",
                title: "Authentication",
                linkText: "Authentication",
                description: "Learn about authentication in Aphiria",
                keywords: ["aphiria", "authentication"],
            },
            {
                slug: "authorization",
                title: "Authorization",
                linkText: "Authorization",
                description: "Learn about authorization in Aphiria",
                keywords: ["aphiria", "authorization", "pbac"],
            },
        ],
    },
    {
        title: "Libraries",
        items: [
            {
                slug: "collections",
                title: "Collections",
                linkText: "Collections",
                description: "Learn about collections in Aphiria",
                keywords: ["aphiria", "collections", "hash tables", "array lists", "stacks", "queues"],
            },
            {
                slug: "console",
                title: "Console",
                linkText: "Console",
                description: "Learn how to use console commands in Aphiria",
                keywords: ["aphiria", "console", "command prompt", "php"],
            },
            {
                slug: "io",
                title: "Input/Output",
                linkText: "Input/Output",
                description: "Learn about working with IO in Aphiria",
                keywords: ["aphiria", "io", "stream", "php"],
            },
            {
                slug: "reflection",
                title: "Reflection",
                linkText: "Reflection",
                description: "Learn about added reflection functionality in Aphiria",
                keywords: ["aphiria", "reflection", "class finder", "php"],
            },
            {
                slug: "psr-adapters",
                title: "PSR Adapters",
                linkText: "PSR Adapters",
                description: "Learn how to map to-and-from some PSRs",
                keywords: ["aphiria", "psrs", "fig", "psr-7", "psr-11", "php"],
            },
            {
                slug: "validation",
                title: "Validation",
                linkText: "Validation",
                description: "Learn about to validate data in Aphiria",
                keywords: ["aphiria", "validation", "constraints", "php"],
            },
        ],
    },
];

/**
 * Get sidebar navigation for a specific version
 *
 * @param version - Version identifier (e.g., "1.x")
 * @returns Navigation sections for the sidebar
 */
export function getSidebarForVersion(version: string): NavigationSection[] {
    switch (version) {
        case "1.x":
            return sidebar1x;
        default:
            return [];
    }
}
