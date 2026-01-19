interface DocumentContentProps {
    /** Pre-sanitized HTML content from documentation artifact */
    html: string;
}

/**
 * Documentation content renderer
 *
 * Server component that renders pre-sanitized HTML from build artifacts
 * Note: HTML is already sanitized during the tools/build-docs pipeline
 */
export function DocumentContent({ html }: DocumentContentProps) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
