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

/**
 * Defines the interfaces for documentation search indices to implement
 */
interface ISearchIndex
{
    /**
     * Builds up a search index for a list of document paths
     *
     * @param string[] $htmlPaths The paths to the HTML docs
     * @throws IndexingFailedException Thrown when there was a failure to index the documents
     */
    public function buildSearchIndex(array $htmlPaths): void;

    /**
     * Queries the documentation and returns any matches
     *
     * @param string $query The raw search query
     * @return SearchResult[] The list of search results
     */
    public function query(string $query): array;
}
