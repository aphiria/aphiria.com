interface DocContentProps {
    /** Pre-sanitized HTML content from doc artifact */
    html: string;
}

/**
 * Doc content renderer
 *
 * Server component that renders pre-sanitized HTML from build artifacts
 * Note: HTML is already sanitized during the tools/build-docs pipeline
 */
export function DocContent({ html }: DocContentProps) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
