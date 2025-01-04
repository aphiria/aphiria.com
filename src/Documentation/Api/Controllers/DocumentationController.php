<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Api\Controllers;

use Aphiria\Api\Controllers\Controller as BaseController;
use Aphiria\Routing\Attributes\Controller;
use Aphiria\Routing\Attributes\Get;
use Aphiria\Routing\Attributes\QueryString;
use App\Documentation\DocumentationIndexer;
use App\Documentation\Searching\SearchResult;

/**
 * Defines the controller that handles documentation actions
 */
#[Controller('docs')]
final class DocumentationController extends BaseController
{
    /**
     * @param DocumentationIndexer $docs What we'll use to search through documentation
     */
    public function __construct(private readonly DocumentationIndexer $docs) {}

    /**
     * Searches our documentation with a query
     *
     * @param string $query The search query
     * @return list<SearchResult> The list of search results
     */
    #[Get('search')]
    public function searchDocs(#[QueryString] string $query): array
    {
        return $this->docs->searchDocs($query);
    }
}
