/**
 * Create a redirect URL by removing .html extension and preserving query/anchor
 *
 * @param url - Original URL with .html extension
 * @returns Clean URL without .html extension, with preserved query params and anchor
 */
export function createRedirectUrl(url: URL): string {
    const pathname = url.pathname.replace(/\.html$/, "");
    const search = url.search;
    const hash = url.hash;

    return `${pathname}${search}${hash}`;
}
