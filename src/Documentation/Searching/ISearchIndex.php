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

/**
 * Defines the interfaces for documentation search indices to implement
 */
interface ISearchIndex
{
    /**
     * Queries the documentation and returns any matches
     *
     * @param string $query The raw search query
     * @param Context $context The context to search under
     * @return list<SearchResult> The list of search results
     */
    public function query(string $query, Context $context): array;
}
