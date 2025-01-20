<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

use Aphiria\DependencyInjection\Container;
use Aphiria\DependencyInjection\ResolutionException;
use App\Documentation\Searching\Context;
use App\Documentation\Searching\IndexEntry;
use App\Documentation\Searching\IndexingFailedException;
use League\Flysystem\FilesystemException;
use League\Flysystem\FilesystemOperator;
use League\Flysystem\StorageAttributes;
use Phinx\Seed\AbstractSeed;

class LexemeSeeder extends AbstractSeed
{
    /** @var array<string, string> The mapping of HTML elements to their weights (per PostgreSQL's setweight() function) */
    private static array $htmlElementsToWeights = [
        'h1' => 'A',
        'h2' => 'B',
        'h3' => 'C',
        'h4' => 'D',
        'h5' => 'D',
        'p' => 'D',
        'li' => 'D',
        'blockquote' => 'D'
    ];

    /**
     * @inheritdoc
     * @throws FilesystemException Thrown if the documentation could not be read
     * @throws ResolutionException Thrown if a dependency could not be resolved
     */
    public function run(): void
    {
        $fileSystem = Container::$globalInstance->resolve(FilesystemOperator::class);
        $htmlPaths = $fileSystem
            ->listContents(__DIR__ . '/../../../public-web/docs/1.x')
            ->filter(fn(StorageAttributes $attributes) => $attributes->isFile() && \str_ends_with($attributes->path(), '.html'))
            ->map(fn(StorageAttributes $attributes) => $attributes->path())
            ->toArray();

        try {
            $indexEntries = [];
            $dom = new DOMDocument();

            foreach ($htmlPaths as $htmlPath) {
                $this->output->writeln("<info>Lexing $htmlPath</info>");
                \libxml_use_internal_errors(true);
                $html = $fileSystem->read($htmlPath);

                if (empty($html) || $dom->loadHTML($html) === false) {
                    throw new Exception("Failed to load HTML for $htmlPath: " . \strip_tags(\libxml_get_last_error()->message));
                }

                \libxml_clear_errors();
                $h1 = $h2 = $h3 = $h4 = $h5 = null;

                // Scan the documentation and index the elements
                $body = $dom->getElementsByTagName('body')->item(0);

                if ($body !== null) {
                    $this->processNode($body, $indexEntries, $htmlPath, $h1, $h2, $h3, $h4, $h5);
                }
            }

            foreach ($indexEntries as $indexEntry) {
                $this->insertIndexEntry($indexEntry);
            }

            $this->updateLexemes();
        } catch (Throwable $ex) {
            throw new IndexingFailedException('Failed to index document: ' . $ex->getMessage(), 0, $ex);
        }
    }

    /**
     * Creates an index entry
     *
     * @param string $filename The filename of the doc being indexed
     * @param DOMNode $currNode The current node
     * @param Context $context The context the entry is in
     * @param DOMNode $h1 The current H1 node
     * @param DOMNode|null $h2 The current H2 node
     * @param DOMNode|null $h3 The current H3 node
     * @param DOMNode|null $h4 The current H4 node
     * @param DOMNode|null $h5 The current H5 node
     * @return IndexEntry The index entry
     * @psalm-suppress NullReference This is due to the DOM stub issues - https://github.com/vimeo/psalm/issues/5665
     */
    private function createIndexEntry(
        string $filename,
        DOMNode $currNode,
        Context $context,
        DOMNode $h1,
        ?DOMNode $h2,
        ?DOMNode $h3,
        ?DOMNode $h4,
        ?DOMNode $h5
    ): IndexEntry {
        $link = '/docs/1.x/';

        /**
         * If the current node is the h1 tag, then just link to the doc itself, not a section
         * If the current node is a h2, h3, h4, or h5 tag, then link to the tag's ID
         * Otherwise, find the nearest non-null header tag and link to its ID
         */
        if ($currNode->nodeName === 'h1') {
            $link .= $filename;
        } elseif (\in_array($currNode->nodeName, ['h2', 'h3', 'h4', 'h5'])) {
            $link .= "$filename#{$currNode->attributes->getNamedItem('id')?->nodeValue}";
        } elseif ($h5 !== null) {
            $link .= "$filename#{$h5->attributes->getNamedItem('id')?->nodeValue}";
        } elseif ($h4 !== null) {
            $link .= "$filename#{$h4->attributes->getNamedItem('id')?->nodeValue}";
        } elseif ($h3 !== null) {
            $link .= "$filename#{$h3->attributes->getNamedItem('id')?->nodeValue}";
        } elseif ($h2 !== null) {
            $link .= "$filename#{$h2->attributes->getNamedItem('id')?->nodeValue}";
        } else {
            // h1 will never be null
            $link .= "$filename#{$h1->attributes->getNamedItem('id')?->nodeValue}";
        }

        return new IndexEntry(
            $currNode->nodeName,
            $this->getAllChildNodeTexts($currNode),
            $link,
            self::$htmlElementsToWeights[$currNode->nodeName],
            $context,
            $this->getAllChildNodeTexts($h1),
            $h2 === null ? null : $this->getAllChildNodeTexts($h2),
            $h3 === null ? null : $this->getAllChildNodeTexts($h3),
            $h4 === null ? null : $this->getAllChildNodeTexts($h4),
            $h5 === null ? null : $this->getAllChildNodeTexts($h5)
        );
    }

    /**
     * Recursively searches a node for all of its children's texts
     *
     * @param DOMNode $node The node to search
     * @return string The children nodes' texts
     */
    private function getAllChildNodeTexts(DOMNode $node): string
    {
        $text = '';

        foreach ($node->childNodes as $childNode) {
            if ($childNode->nodeType === \XML_TEXT_NODE) {
                $text .= $childNode->textContent;
            } else {
                $text .= $this->getAllChildNodeTexts($childNode);
            }
        }

        return $text;
    }

    /**
     * Inserts an index entry into the database
     *
     * @param IndexEntry $indexEntry The entry to insert
     */
    private function insertIndexEntry(IndexEntry $indexEntry): void
    {
        $this->execute(<<<EOF
INSERT INTO lexemes (h1_inner_text, h2_inner_text, h3_inner_text, h4_inner_text, h5_inner_text, link, html_element_type, inner_text, html_element_weight, context)
VALUES (:h1InnerText, :h2InnerText, :h3InnerText, :h4InnerText, :h5InnerText, :link, :htmlElementType, :innerText, :htmlElementWeight, :context)
EOF,
            [
                'h1InnerText' => $indexEntry->h1InnerText,
                'h2InnerText' => $indexEntry->h2InnerText,
                'h3InnerText' => $indexEntry->h3InnerText,
                'h4InnerText' => $indexEntry->h4InnerText,
                'h5InnerText' => $indexEntry->h5InnerText,
                'link' => $indexEntry->link,
                'htmlElementType' => $indexEntry->htmlElementType,
                'innerText' => $indexEntry->innerText,
                'htmlElementWeight' => $indexEntry->htmlElementWeight,
                'context' => $indexEntry->context->value
            ]
        );
    }

    /**
     * Processes a node and its children recursively, creating index entries for valid elements
     *
     * @param DOMNode $node The node to process
     * @param list<IndexEntry> $indexEntries The list of index entries to update
     * @param string $htmlPath The path to the current HTML file
     * @param DOMNode|null $h1 The current H1 node
     * @param DOMNode|null $h2 The current H2 node
     * @param DOMNode|null $h3 The current H3 node
     * @param DOMNode|null $h4 The current H4 node
     * @param DOMNode|null $h5 The current H5 node
     */
    private function processNode(
        DOMNode $node,
        array &$indexEntries,
        string $htmlPath,
        ?DOMNode &$h1,
        ?DOMNode &$h2,
        ?DOMNode &$h3,
        ?DOMNode &$h4,
        ?DOMNode &$h5
    ): void {
        if ($this->shouldSkipProcessingNode($node)) {
            return;
        }

        // Update headers based on the node type
        switch ($node->nodeName) {
            case 'h1':
                $h1 = $node;
                $h2 = $h3 = $h4 = $h5 = null;
                break;
            case 'h2':
                $h2 = $node;
                $h3 = $h4 = $h5 = null;
                break;
            case 'h3':
                $h3 = $node;
                $h4 = $h5 = null;
                break;
            case 'h4':
                $h4 = $node;
                $h5 = null;
                break;
            case 'h5':
                $h5 = $node;
                break;
        }

        // Only create an index entry for valid elements
        if (isset(self::$htmlElementsToWeights[$node->nodeName])) {
            $filename = \basename($htmlPath);
            $indexEntries[] = $this->createIndexEntry(
                $filename,
                $node,
                $this->getContext($node),
                $h1,
                $h2,
                $h3,
                $h4,
                $h5
            );
        }

        // Recursively process child nodes
        foreach ($node->childNodes as $childNode) {
            $this->processNode($childNode, $indexEntries, $htmlPath, $h1, $h2, $h3, $h4, $h5);
        }
    }

    /**
     * Gets the context for a node
     *
     * @param DOMNode $node The node whose context we want
     * @return Context The current context
     */
    private function getContext(DOMNode $node): Context
    {
        while ($node !== null) {
            if ($node instanceof DOMElement && $node->hasAttribute('class')) {
                $classes = \explode(' ', $node->getAttribute('class'));

                if (\in_array('context-framework', $classes, true)) {
                    return Context::Framework;
                }

                if (\in_array('context-library', $classes, true)) {
                    return Context::Library;
                }
            }

            $node = $node->parentElement;
        }

        return Context::Global;
    }

    /**
     * Returns whether or not we should skip processing a node and its children for lexemes
     *
     * @param DOMNode $node The node to check
     * @return bool True if we should skip processing the node for lexemes, otherwise false
     */
    private function shouldSkipProcessingNode(DOMNode $node): bool
    {
        // We do not want to index the table-of-contents nav because its contents simply reflect those in the <h*> tags
        return $node instanceof DOMElement
            && $node->nodeName === 'nav'
            && \str_contains($node->getAttribute('class'), 'toc-nav');
    }

    /**
     * Updates the lexemes in all our rows
     */
    private function updateLexemes(): void
    {
        $this->execute(<<<EOF
UPDATE lexemes SET english_lexemes = setweight(to_tsvector('english', COALESCE(inner_text, '')), html_element_weight::"char"), simple_lexemes = setweight(to_tsvector(COALESCE(inner_text, '')), html_element_weight::"char")
EOF
        );
    }
}
