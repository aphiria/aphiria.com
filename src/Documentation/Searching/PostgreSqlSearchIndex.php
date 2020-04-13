<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Searching;

use Aphiria\IO\FileSystem;
use Aphiria\IO\FileSystemException;
use Exception;
use Opulence\Databases\IConnection;
use PDO;
use PHPHtmlParser\Dom;
use PHPHtmlParser\Dom\HtmlNode;

/**
 * Defines the documentation search index backed by PostgreSQL
 */
final class PostgreSqlSearchIndex implements ISearchIndex
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
    /** @var string The name of the table to point to (MUST BE SECURE BECAUSE IT'S USED DIRECTLY IN QUERIES) */
    private string $lexemeTableName;
    /** @var IConnection The DB connection to use */
    private IConnection $connection;
    /** @var string The prefix to use for al links that are generated */
    private string $linkPrefix;
    /** @var string The path to the .env file to update whenever we build the search index */
    private string $envPath;
    /** @var FileSystem The file helpers */
    private FileSystem $files;

    /**
     * @param string $lexemeTableName The name of the table to point to (MUST BE SECURE BECAUSE IT'S USED DIRECTLY IN QUERIES)
     * @param IConnection $connection The DB connection to use
     * @param string $linkPrefix The prefix to use for all links that are generated
     * @param string $envPath The path to the .env file to update whenever we build the search index
     */
    public function __construct(string $lexemeTableName, IConnection $connection, string $linkPrefix, string $envPath)
    {
        $this->lexemeTableName = $lexemeTableName;
        $this->connection = $connection;
        $this->linkPrefix = $linkPrefix;
        $this->envPath = $envPath;
        $this->files = new FileSystem();
    }

    /**
     * Builds up a search index for a list of document paths
     *
     * @param string[] $htmlPaths The paths to the HTML docs
     * @throws IndexingFailedException Thrown when there was a failure to index the documents
     */
    public function buildSearchIndex(array $htmlPaths): void
    {
        try {
            $indexEntries = [];

            foreach ($htmlPaths as $htmlPath) {
                $dom = (new Dom())->loadFromFile($htmlPath);
                $h1 = $h2 = $h3 = $h4 = $h5 = null;

                // Scan the documentation and index the elements as well as their nearest previous <h*> siblings
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
                        $filename = \basename($htmlPath);
                        $indexEntries[] = $this->createIndexEntry($filename, $currNode, $h1, $h2, $h3, $h4, $h5);
                    }
                }
            }

            $this->createAndSeedTable($indexEntries);
        } catch (Exception $ex) {
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
        /**
         * This query is doing two things - using natural English language processing to match on prefixes of words, eg
         * 'route' matches 'routes' as well as 'routing'.  The second part of the query is a fallback to simple,
         * non-prefix matching.  In other words, 'rou' will be matched by 'routes' and 'routing' even though they don't
         * share a common English prefix ('rout' is the prefix, not 'rou').  So, we query up to maxResults from both
         * search methods, then order the entire set and limit it to maxResults.  Technically, we might over-query, but
         * that's not a big penalty.
         *
         * The goofy array_to_string(string_to_array(...)) stuff is splitting a query by spaces, adding ':*' after
         * each term, and joining them with '&' so that it forms a valid tsquery.
         */
        $tsHeadlineOptions = 'StartSel=<em>, StopSel=</em>';
        $statement = $this->connection->prepare(
            <<<EOF
(SELECT link, html_element_type, rank, ts_headline('english', h1_inner_text, query, '{$tsHeadlineOptions}') as h1_highlights, ts_headline('english', h2_inner_text, query, '{$tsHeadlineOptions}') as h2_highlights, ts_headline('english', h3_inner_text, query, '{$tsHeadlineOptions}') as h3_highlights, ts_headline('english', h4_inner_text, query, '{$tsHeadlineOptions}') as h4_highlights, ts_headline('english', h5_inner_text, query, '{$tsHeadlineOptions}') as h5_highlights, ts_headline('english', inner_text, query, '{$tsHeadlineOptions}') as inner_text_highlights
FROM (SELECT link, html_element_type, h1_inner_text, h2_inner_text, h3_inner_text, h4_inner_text, h5_inner_text, inner_text, ts_rank_cd(english_lexemes, query) AS rank, query
        FROM {$this->lexemeTableName}, plainto_tsquery('english', :query) AS query
        WHERE english_lexemes @@ query
        ORDER BY rank DESC
        LIMIT :maxResults) AS english_matching_query)
UNION
(SELECT link, html_element_type, rank, ts_headline(h1_inner_text, query, '{$tsHeadlineOptions}') as h1_highlights, ts_headline(h2_inner_text, query, '{$tsHeadlineOptions}') as h2_highlights, ts_headline(h3_inner_text, query, '{$tsHeadlineOptions}') as h3_highlights, ts_headline(h4_inner_text, query, '{$tsHeadlineOptions}') as h4_highlights, ts_headline(h5_inner_text, query, '{$tsHeadlineOptions}') as h5_highlights, ts_headline(inner_text, query, '{$tsHeadlineOptions}') as inner_text_highlights
    FROM (SELECT link, html_element_type, h1_inner_text, h2_inner_text, h3_inner_text, h4_inner_text, h5_inner_text, inner_text, ts_rank_cd(simple_lexemes, query) AS rank, query
          FROM {$this->lexemeTableName}, (SELECT (SELECT (array_to_string(string_to_array(:query, ' '), ':* & ') || ':*'))::tsquery AS query) AS query
          WHERE simple_lexemes @@ query
          ORDER BY rank DESC
          LIMIT :maxResults) AS non_english_matching_query)
ORDER BY rank DESC
LIMIT :maxResults
EOF
        );
        // The query must be lower cased for our full text search to work appropriately
        $statement->bindValues([
            'query' => \mb_strtolower(trim($query)),
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
     * Creates and seeds the doc table
     *
     * @param IndexEntry[] $indexEntries The index entries to save
     * @throws FileSystemException Thrown if there was an error updating the .env file
     */
    private function createAndSeedTable(array $indexEntries): void
    {
        /**
         * Update the current lexeme table name (limited to 8 chars so we don't go over PostgreSQL name length limits).
         * This is done so that reindexing the website only impacts this instance of the site.
         */
        $this->lexemeTableName = 'lexemes_' . substr(hash('sha256', \random_bytes(32)), 0, 8);
        $this->connection->beginTransaction();
        $this->createTable();

        foreach ($indexEntries as $indexEntry) {
            $this->insertIndexEntry($indexEntry);
        }

        $this->updateLexemes();
        $this->createTableIndices();
        $this->connection->commit();
        $this->updateEnvFile();
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
    private function createIndexEntry(
        string $filename,
        HtmlNode $currNode,
        HtmlNode $h1,
        ?HtmlNode $h2,
        ?HtmlNode $h3,
        ?HtmlNode $h4,
        ?HtmlNode $h5
    ): IndexEntry {
        $link = $this->linkPrefix;

        /**
         * If the current node is the h1 tag, then just link to the doc itself, not a section
         * If the current node is a h2, h3, h4, or h5 tag, then link to the tag's ID
         * Otherwise, find the nearest non-null header tag and link to its ID
         */
        if ($currNode->getTag()->name() === 'h1') {
            $link .= $filename;
        } elseif (\in_array($currNode->getTag()->name(), ['h2', 'h3', 'h4', 'h5'])) {
            $link .= "$filename#{$currNode->getAttribute('id')}";
        } elseif ($h5 !== null) {
            $link .= "$filename#{$h5->getAttribute('id')}";
        } elseif ($h4 !== null) {
            $link .= "$filename#{$h4->getAttribute('id')}";
        } elseif ($h3 !== null) {
            $link .= "$filename#{$h3->getAttribute('id')}";
        } elseif ($h2 !== null) {
            $link .= "$filename#{$h2->getAttribute('id')}";
        } else {
            // h1 will never be null
            $link .= "$filename#{$h1->getAttribute('id')}";
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
     * Creates the table that will hold our docs
     */
    private function createTable(): void
    {
        $statement = $this->connection->prepare(
            <<<EOF
CREATE TABLE {$this->lexemeTableName} (
    id serial primary key,
    h1_inner_text TEXT,
    h2_inner_text TEXT,
    h3_inner_text TEXT,
    h4_inner_text TEXT,
    h5_inner_text TEXT,
    link TEXT NOT NULL,
    html_element_type TEXT NOT NULL,
    inner_text TEXT NOT NULL,
    html_element_weight CHAR NOT NULL,
    english_lexemes tsvector,
    simple_lexemes tsvector
)
EOF
        );
        $statement->execute();
    }

    /**
     * Creates the indices on the table for faster querying
     */
    private function createTableIndices(): void
    {
        $statement = $this->connection->prepare(
            <<<EOF
CREATE INDEX {$this->lexemeTableName}_english_lexeme_idx ON {$this->lexemeTableName} USING gin(english_lexemes)
EOF
        );
        $statement->execute();
        $statement = $this->connection->prepare(
            <<<EOF
CREATE INDEX {$this->lexemeTableName}_simple_lexeme_idx ON {$this->lexemeTableName} USING gin(simple_lexemes)
EOF
        );
        $statement->execute();
    }

    /**
     * Inserts an index entry into the database
     *
     * @param IndexEntry $indexEntry The entry to insert
     */
    private function insertIndexEntry(IndexEntry $indexEntry): void
    {
        $statement = $this->connection->prepare(
            <<<EOF
INSERT INTO {$this->lexemeTableName} (h1_inner_text, h2_inner_text, h3_inner_text, h4_inner_text, h5_inner_text, link, html_element_type, inner_text, html_element_weight)
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

    /**
     * Updates the .env file to point to the new table
     *
     * @throws FileSystemException Thrown if there was an error reading or writing to the file system
     */
    private function updateEnvFile(): void
    {
        $currEnvContents = $this->files->read($this->envPath);
        $newContents = \preg_replace(
            '/DOC_LEXEMES_TABLE_NAME=[^\r\n]+/',
            "DOC_LEXEMES_TABLE_NAME={$this->lexemeTableName}",
            $currEnvContents
        );
        $this->files->write($this->envPath, $newContents);
    }

    /**
     * Updates the lexemes in all our rows
     */
    private function updateLexemes(): void
    {
        $statement = $this->connection->prepare(
            <<<EOF
UPDATE {$this->lexemeTableName} SET english_lexemes = setweight(to_tsvector('english', COALESCE(inner_text, '')), html_element_weight::"char"), simple_lexemes = setweight(to_tsvector(COALESCE(inner_text, '')), html_element_weight::"char")
EOF
        );
        $statement->execute();
    }
}
