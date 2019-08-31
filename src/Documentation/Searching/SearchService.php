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

use Opulence\Databases\IConnection;
use PDO;

/**
 * Defines the documentation search service
 */
final class SearchService
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
        'li' => 'D'
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
     * Searches the documentation with a query
     *
     * @param string $query The raw search query
     * @return SearchResult[] The list of search results
     */
    public function getSearchResults(string $query): array
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
}
