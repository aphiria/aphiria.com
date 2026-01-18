import { extractLexemes } from '../src/lexeme-extractor';
import { Context } from '../src/types';

describe('Lexeme Extractor', () => {
    describe('DOM walking', () => {
        it('skips nav.toc-nav elements completely', () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="title">Title</h1>
            <nav class="toc-nav">
                <h2>Table of Contents</h2>
                <p>Should be skipped</p>
            </nav>
            <p>Regular paragraph</p>
        </article>
    </main>
</body>
`;
            const lexemes = extractLexemes(html, '1.x', 'test');

            // Should have h1 and p, but NOT the h2/p inside nav.toc-nav
            expect(lexemes.length).toBe(2);
            expect(lexemes[0].html_element_type).toBe('h1');
            expect(lexemes[1].html_element_type).toBe('p');
            expect(lexemes[1].inner_text).toBe('Regular paragraph');
        });
    });

    describe('Context detection', () => {
        it('detects context-framework from ancestor', () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="title">Title</h1>
            <div class="context-framework">
                <p>Framework content</p>
            </div>
        </article>
    </main>
</body>
`;
            const lexemes = extractLexemes(html, '1.x', 'test');
            const frameworkParagraph = lexemes.find(l => l.inner_text === 'Framework content');

            expect(frameworkParagraph).toBeDefined();
            expect(frameworkParagraph?.context).toBe(Context.Framework);
        });

        it('detects context-library from ancestor', () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="title">Title</h1>
            <div class="context-library">
                <p>Library content</p>
            </div>
        </article>
    </main>
</body>
`;
            const lexemes = extractLexemes(html, '1.x', 'test');
            const libraryParagraph = lexemes.find(l => l.inner_text === 'Library content');

            expect(libraryParagraph).toBeDefined();
            expect(libraryParagraph?.context).toBe(Context.Library);
        });

        it('defaults to global when no context class found', () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="title">Title</h1>
            <p>Global content</p>
        </article>
    </main>
</body>
`;
            const lexemes = extractLexemes(html, '1.x', 'test');
            const globalParagraph = lexemes.find(l => l.inner_text === 'Global content');

            expect(globalParagraph).toBeDefined();
            expect(globalParagraph?.context).toBe(Context.Global);
        });
    });

    describe('Link generation', () => {
        it('generates link without anchor for h1', () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="installation">Installation</h1>
        </article>
    </main>
</body>
`;
            const lexemes = extractLexemes(html, '1.x', 'installation');

            expect(lexemes.length).toBe(1);
            expect(lexemes[0].link).toBe('/docs/1.x/installation');
        });

        it('generates link with anchor for h2-h5', () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="routing">Routing</h1>
            <h2 id="route-constraints">Route Constraints</h2>
            <h3 id="regex-constraints">Regex Constraints</h3>
        </article>
    </main>
</body>
`;
            const lexemes = extractLexemes(html, '1.x', 'routing');

            const h2 = lexemes.find(l => l.html_element_type === 'h2');
            const h3 = lexemes.find(l => l.html_element_type === 'h3');

            expect(h2?.link).toBe('/docs/1.x/routing#route-constraints');
            expect(h3?.link).toBe('/docs/1.x/routing#regex-constraints');
        });

        it('uses nearest parent heading for p/li/blockquote links', () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="routing">Routing</h1>
            <h2 id="basics">Basics</h2>
            <p>First paragraph under h2</p>
            <h3 id="advanced">Advanced</h3>
            <p>Second paragraph under h3</p>
        </article>
    </main>
</body>
`;
            const lexemes = extractLexemes(html, '1.x', 'routing');

            const firstP = lexemes.find(l => l.inner_text === 'First paragraph under h2');
            const secondP = lexemes.find(l => l.inner_text === 'Second paragraph under h3');

            expect(firstP?.link).toBe('/docs/1.x/routing#basics');
            expect(secondP?.link).toBe('/docs/1.x/routing#advanced');
        });
    });

    describe('Heading hierarchy tracking', () => {
        it('resets lower headings when higher heading encountered', () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="title">Title</h1>
            <h2 id="section">Section</h2>
            <h3 id="subsection">Subsection</h3>
            <p>Paragraph under h3</p>
            <h2 id="new-section">New Section</h2>
            <p>Paragraph under new h2</p>
        </article>
    </main>
</body>
`;
            const lexemes = extractLexemes(html, '1.x', 'test');

            const firstP = lexemes.find(l => l.inner_text === 'Paragraph under h3');
            const secondP = lexemes.find(l => l.inner_text === 'Paragraph under new h2');

            // First paragraph should have all headings populated
            expect(firstP?.h1_inner_text).toBe('Title');
            expect(firstP?.h2_inner_text).toBe('Section');
            expect(firstP?.h3_inner_text).toBe('Subsection');

            // Second paragraph should have h3 cleared (nulled) when new h2 was encountered
            expect(secondP?.h1_inner_text).toBe('Title');
            expect(secondP?.h2_inner_text).toBe('New Section');
            expect(secondP?.h3_inner_text).toBeNull();
        });
    });

    describe('Text extraction', () => {
        it('recursively extracts all descendant text nodes', () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="title">Title</h1>
            <p>Text with <strong>bold</strong> and <em>italic</em> content</p>
        </article>
    </main>
</body>
`;
            const lexemes = extractLexemes(html, '1.x', 'test');
            const paragraph = lexemes.find(l => l.html_element_type === 'p');

            expect(paragraph?.inner_text).toBe('Text with bold and italic content');
        });
    });

    describe('Indexable elements', () => {
        it('only creates records for h1/h2/h3/h4/h5/p/li/blockquote', () => {
            const html = `
<body>
    <main>
        <article>
            <h1 id="title">Title</h1>
            <h2 id="section">Section</h2>
            <p>Paragraph</p>
            <ul>
                <li>List item</li>
            </ul>
            <blockquote>Quote</blockquote>
            <div>Div should not be indexed</div>
            <span>Span should not be indexed</span>
        </article>
    </main>
</body>
`;
            const lexemes = extractLexemes(html, '1.x', 'test');

            const types = lexemes.map(l => l.html_element_type);
            expect(types).toContain('h1');
            expect(types).toContain('h2');
            expect(types).toContain('p');
            expect(types).toContain('li');
            expect(types).toContain('blockquote');
            expect(types).not.toContain('div');
            expect(types).not.toContain('span');
        });
    });

    describe('No article element', () => {
        it('returns empty array when article not found', () => {
            const html = `
<body>
    <main>
        <h1>No article wrapper</h1>
    </main>
</body>
`;
            const lexemes = extractLexemes(html, '1.x', 'test');

            expect(lexemes).toEqual([]);
        });
    });
});
