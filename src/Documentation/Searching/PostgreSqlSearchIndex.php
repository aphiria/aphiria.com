<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Searching;

use PDO;

/**
 * Defines the documentation search index backed by PostgreSQL
 */
final class PostgreSqlSearchIndex implements ISearchIndex
{
    /** @var int The maximum number of search results we'll return */
    private const int MAX_NUM_SEARCH_RESULTS = 5;

    /**
     * @param PDO $pdo The DB connection to use
     */
    public function __construct(private readonly PDO $pdo) {}

    /**
     * @inheritdoc
     */
    public function query(string $query, DocumentationVersion $version, Context $context): array
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
        $statement = $this->pdo->prepare(
            <<<EOF
SELECT DISTINCT ON(rank, link, html_element_type) link, html_element_type, rank, h1_highlights, h2_highlights, h3_highlights, h4_highlights, h5_highlights, inner_text_highlights FROM
((SELECT link, html_element_type, rank, ts_headline('english', h1_inner_text, query, '{$tsHeadlineOptions}') as h1_highlights, ts_headline('english', h2_inner_text, query, '{$tsHeadlineOptions}') as h2_highlights, ts_headline('english', h3_inner_text, query, '{$tsHeadlineOptions}') as h3_highlights, ts_headline('english', h4_inner_text, query, '{$tsHeadlineOptions}') as h4_highlights, ts_headline('english', h5_inner_text, query, '{$tsHeadlineOptions}') as h5_highlights, ts_headline('english', inner_text, query, '{$tsHeadlineOptions}') as inner_text_highlights
FROM (SELECT link, html_element_type, h1_inner_text, h2_inner_text, h3_inner_text, h4_inner_text, h5_inner_text, inner_text, ts_rank_cd(english_lexemes, query) AS rank, query
        FROM lexemes, plainto_tsquery('english', :query) AS query
        WHERE english_lexemes @@ query AND (context = :context OR context = 'global') AND version = :version
        ORDER BY rank DESC
        LIMIT :maxResults) AS english_matching_query)
UNION
(SELECT link, html_element_type, rank, ts_headline(h1_inner_text, query, '{$tsHeadlineOptions}') as h1_highlights, ts_headline(h2_inner_text, query, '{$tsHeadlineOptions}') as h2_highlights, ts_headline(h3_inner_text, query, '{$tsHeadlineOptions}') as h3_highlights, ts_headline(h4_inner_text, query, '{$tsHeadlineOptions}') as h4_highlights, ts_headline(h5_inner_text, query, '{$tsHeadlineOptions}') as h5_highlights, ts_headline(inner_text, query, '{$tsHeadlineOptions}') as inner_text_highlights
    FROM (SELECT link, html_element_type, h1_inner_text, h2_inner_text, h3_inner_text, h4_inner_text, h5_inner_text, inner_text, ts_rank_cd(simple_lexemes, query) AS rank, query
          FROM lexemes, (SELECT (SELECT (array_to_string(string_to_array(:query, ' '), ':* & ') || ':*'))::tsquery AS query) AS query
          WHERE simple_lexemes @@ query AND (context = :context OR context = 'global') AND version = :version
          ORDER BY rank DESC
          LIMIT :maxResults) AS non_english_matching_query)) AS distinct_query
ORDER BY rank DESC
LIMIT :maxResults
EOF,
        );
        // The query must be lower cased for our full text search to work appropriately
        $statement->execute([
            'query' => \mb_strtolower(\trim($query)),
            'version' => $version->value,
            'context' => $context->value,
            'maxResults' => self::MAX_NUM_SEARCH_RESULTS,
        ]);
        $searchResults = [];

        /** @var array{link: string, html_element_type: string, h1_highlights: string, h2_highlights: string, h3_highlights: string, h4_highlights: string, h5_highlights: string, inner_text_highlights: string} $row */
        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $searchResults[] = new SearchResult(
                $row['link'],
                $row['html_element_type'],
                $row['h1_highlights'],
                $row['h2_highlights'],
                $row['h3_highlights'],
                $row['h4_highlights'],
                $row['h5_highlights'],
                $row['inner_text_highlights'],
            );
        }

        return $searchResults;
    }
}
