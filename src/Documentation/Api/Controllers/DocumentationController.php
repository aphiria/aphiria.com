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
use App\Documentation\Searching\Context;
use App\Documentation\Searching\DocumentationVersion;
use App\Documentation\Searching\InvalidContextException;
use App\Documentation\Searching\InvalidDocumentationVersionException;
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
     * @param string $version The documentation version to query
     * @return list<SearchResult> The list of search results
     * @throws InvalidDocumentationVersionException Thrown if the documentation version was invalid
     * @throws InvalidContextException Thrown if the context was invalid
     */
    #[Get('search')]
    public function searchDocs(#[QueryString] string $query, #[QueryString] string $version = '1.x'): array
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

        $rawVersion = $version;

        if (($version = DocumentationVersion::tryFrom($rawVersion)) === null) {
            throw new InvalidDocumentationVersionException("Invalid documentation version \"$rawVersion\"");
        }

        return $this->docSearchIndex->query($query, $version, $context);
    }
}
