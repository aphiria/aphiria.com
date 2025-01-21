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
use App\Documentation\Searching\Context;
use App\Documentation\Searching\InvalidContextException;
use App\Documentation\Searching\ISearchIndex;
use App\Documentation\Searching\SearchResult;

/**
 * Defines the controller that handles documentation actions
 */
#[Controller('docs')]
final class DocumentationController extends BaseController
{
    /**
     * @param ISearchIndex $docSearchIndex What we'll use to search through documentation
     */
    public function __construct(private readonly ISearchIndex $docSearchIndex) {}

    /**
     * Searches our documentation with a query
     *
     * @param string $query The search query
     * @return list<SearchResult> The list of search results
     * @throws InvalidContextException Thrown if the context was invalid
     */
    #[Get('search')]
    public function searchDocs(#[QueryString] string $query): array
    {
        $cookies = $this->requestParser->parseCookies($this->request);

        if ($cookies->containsKey('context')) {
            $rawContext = $cookies->get('context');
        } else {
            $rawContext = null;
        }

        $context = match ($rawContext) {
            null, 'framework' => Context::Framework,
            'library' => Context::Library,
            default => throw new InvalidContextException('Context must be either "framework" or "library"')
        };

        return $this->docSearchIndex->query($query, $context);
    }
}
