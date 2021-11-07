<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2021 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Api\Controllers;

use Aphiria\Api\Controllers\Controller;
use Aphiria\Routing\Attributes\Get;
use Aphiria\Routing\Attributes\RouteGroup;
use App\Documentation\DocumentationService;
use App\Documentation\Searching\SearchResult;

/**
 * Defines the controller that handles documentation actions
 */
#[RouteGroup('docs')]
final class DocumentationController extends Controller
{
    /**
     * @param DocumentationService $docs What we'll use to search through documentation
     */
    public function __construct(private readonly DocumentationService $docs)
    {
    }

    /**
     * Searches our documentation with a query
     *
     * @param string $query The search query
     * @return list<SearchResult> The list of search results
     */
    #[Get('search')]
    public function searchDocs(string $query): array
    {
        return $this->docs->searchDocs($query);
    }
}
