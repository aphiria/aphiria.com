<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Searching;

use Exception;
use Opulence\Databases\IConnection;
use PDO;
use PHPHtmlParser\Dom;
use PHPHtmlParser\Dom\HtmlNode;

/**
 * Defines the documentation search index
 */
final class SearchIndex
{
    /** @var int The maximum number of search results we'll return */
    private const MAX_NUM_SEARCH_RESULTS = 5;
    /** @var array The mapping of HTML elements to their weights (per PostgreSQL's setweight() function) */
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
    /** @var IConnection The DB connection to use */
    private IConnection $connection;

    /**
     * @param IConnection $connection The DB connection to use
     */
    public function __construct(IConnection $connection)
    {
        $this->connection = $connection;
    }

    /**
     * Builds up a search index for a document
     *
     * @param string $filename The name of the file that is being indexed
     * @param string $text The text to index
     * @throws IndexingFailedException Thrown when there was a failure to index the document
     */
    public function buildSearchIndex(string $filename, string $text): void
    {
        try {
            $indexEntries = [];
            $dom = (new Dom)->load($text);
            $h1 = $h2 = $h3 = $h4 = $h5 = null;

            /** @var HtmlNode $currNode */
            foreach ($dom->root->getChildren() as $currNode) {
                // Check if we need to reset the nearest headers
                switch ($currNode->getTag()->name()) {
                    case 'h1':
                        $h1 = $currNode;
                        $h2 = $h3 = $h4 = $h5 = null;
                        break;
                    case 'h2':
                        $h2 = $currNode;
                        $h3 = $h4 = $h5 = null;
                        break;
                    case 'h3':
                        $h3 = $currNode;
                        $h4 = $h5 = null;
                        break;
                    case 'h4':
                        $h4 = $currNode;
                        $h5 = null;
                        break;
                    case 'h5':
                        $h5 = $currNode;
                        break;
                }

                // Only index specific elements
                if (isset(self::$htmlElementsToWeights[$currNode->getTag()->name()])) {
                    $indexEntries[] = self::createIndexEntry($filename, $currNode, $h1, $h2, $h3, $h4, $h5);
                }
            }

            $this->saveIndexEntries($indexEntries);
        } catch (Exception $ex) {
            error_log($ex->getMessage());
            throw new IndexingFailedException('Failed to index document', 0, $ex);
        }
    }

    /**
     * Queries the documentation and returns any matches
     *
     * @param string $query The raw search query
     * @return SearchResult[] The list of search results
     */
    public function query(string $query): array
    {
        $statement = $this->connection->prepare(<<<EOF
SELECT link, html_element_type, rank, ts_headline('english', h1_inner_text, query, 'StartSel = <em>, StopSel = </em>') as h1_highlights, ts_headline('english', h2_inner_text, query, 'StartSel = <em>, StopSel = </em>') as h2_highlights, ts_headline('english', h3_inner_text, query, 'StartSel = <em>, StopSel = </em>') as h3_highlights, ts_headline('english', h4_inner_text, query, 'StartSel = <em>, StopSel = </em>') as h4_highlights, ts_headline('english', h5_inner_text, query, 'StartSel = <em>, StopSel = </em>') as h5_highlights, ts_headline('english', inner_text, query, 'StartSel = <em>, StopSel = </em>') as inner_text_highlights
FROM (SELECT link, html_element_type, h1_inner_text, h2_inner_text, h3_inner_text, h4_inner_text, h5_inner_text, inner_text, ts_rank_cd(tokens, query) AS rank, query
    FROM tokens, plainto_tsquery('english', :query) AS query
    WHERE tokens @@ query
    ORDER BY rank DESC
    LIMIT :maxResults) AS query_results;
EOF);
        $statement->bindValues([
            'query' => $query,
            'maxResults' => self::MAX_NUM_SEARCH_RESULTS
        ]);
        $statement->execute();
        $searchResults = [];

        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $searchResults[] = new SearchResult(
                $row['link'],
                $row['html_element_type'],
                $row['h1_highlights'],
                $row['h2_highlights'],
                $row['h3_highlights'],
                $row['h4_highlights'],
                $row['h5_highlights'],
                $row['inner_text_highlights']
            );
        }

        return $searchResults;
    }

    /**
     * Creates an index entry
     *
     * @param string $filename The filename of the doc being indexed
     * @param HtmlNode $currNode The current node
     * @param HtmlNode $h1 The current H1 node
     * @param HtmlNode|null $h2 The current H2 node
     * @param HtmlNode|null $h3 The current H3 node
     * @param HtmlNode|null $h4 The current H4 node
     * @param HtmlNode|null $h5 The current H5 node
     * @return IndexEntry The index entry
     */
    private static function createIndexEntry(
        string $filename,
        HtmlNode $currNode,
        HtmlNode $h1,
        ?HtmlNode $h2,
        ?HtmlNode $h3,
        ?HtmlNode $h4,
        ?HtmlNode $h5
    ): IndexEntry {
        /**
         * If the current node is the h1 tag, then just link to the doc itself, not a section
         * If the current node is a h2, h3, h4, or h5 tag, then link to the tag's ID
         * Otherwise, find the nearest non-null header tag and link to its ID
         */
        if ($currNode->getTag()->name() === 'h1') {
            $link = $filename;
        } elseif (\in_array($currNode->getTag()->name(), ['h2', 'h3', 'h4', 'h5'])) {
            $link = "$filename#{$currNode->getAttribute('id')}";
        } elseif ($h5 !== null) {
            $link = "$filename#{$h5->getAttribute('id')}";
        } elseif ($h4 !== null) {
            $link = "$filename#{$h4->getAttribute('id')}";
        } elseif ($h3 !== null) {
            $link = "$filename#{$h3->getAttribute('id')}";
        } elseif ($h2 !== null) {
            $link = "$filename#{$h2->getAttribute('id')}";
        } else {
            // h1 will never be null
            $link = "$filename#{$h1->getAttribute('id')}";
        }

        return new IndexEntry(
            $currNode->getTag()->name(),
            $currNode->text(true),
            $link,
            self::$htmlElementsToWeights[$currNode->getTag()->name()],
            $h1->text(true),
            $h2 === null ? null : $h2->text(true),
            $h3 === null ? null : $h3->text(true),
            $h4 === null ? null : $h4->text(true),
            $h5 === null ? null : $h5->text(true)
        );
    }

    /**
     * Saves index entries to the database
     *
     * @param IndexEntry[] $indexEntries The index entries to save
     */
    private function saveIndexEntries(array $indexEntries): void
    {
        $this->connection->beginTransaction();
        // To speed up inserts, drop the index, and recreate it afterwards
        $this->connection->prepare('DROP INDEX token_idx')->execute();

        foreach ($indexEntries as $indexEntry) {
            $statement = $this->connection->prepare(<<<EOF
INSERT INTO tokens (h1_inner_text, h2_inner_text, h3_inner_text, h4_inner_text, h5_inner_text, link, html_element_type, inner_text, html_element_weight) 
VALUES (:h1InnerText, :h2InnerText, :h3InnerText, :h4InnerText, :h5InnerText, :link, :htmlElementType, :innerText, :htmlElementWeight)
EOF
);
            $statement->bindValues([
                'h1InnerText' => $indexEntry->h1InnerText,
                'h2InnerText' => $indexEntry->h2InnerText,
                'h3InnerText' => $indexEntry->h3InnerText,
                'h4InnerText' => $indexEntry->h4InnerText,
                'h5InnerText' => $indexEntry->h5InnerText,
                'link' => $indexEntry->link,
                'htmlElementType' => $indexEntry->htmlElementType,
                'innerText' => $indexEntry->innerText,
                'htmlElementWeight' => $indexEntry->htmlElementWeight
            ]);
            $statement->execute();
        }

        // Set up our weighted tokens
        $statement = $this->connection->prepare(<<<EOF
UPDATE tokens SET tokens = setweight(to_tsvector('english', COALESCE(inner_text, '')), html_element_weight::"char")
EOF
);
        $statement->execute();

        // Recreate our index
        $this->connection->prepare('CREATE INDEX token_idx ON tokens USING gin(tokens)')->execute();

        $this->connection->commit();
    }
}
