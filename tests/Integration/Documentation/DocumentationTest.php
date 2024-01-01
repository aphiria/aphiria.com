<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2024 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Tests\Integration\Documentation;

use App\Documentation\Searching\SearchResult;
use App\Tests\Integration\IntegrationTestCase;

class DocumentationTest extends IntegrationTestCase
{
    public function testSearchingForItemWithDocumentationReturnsResults(): void
    {
        $response = $this->get('/docs/search?query=routing');
        $this->assertParsedBodyPassesCallback(
            $response,
            SearchResult::class . '[]',
            /**
             * @param SearchResult[] $results
             * @return bool
             */
            static function (array $results): bool {
                return \count($results) > 0 && \str_contains($results[0]->highlightedH1, 'Routing');
            }
        );
    }

    public function testSearchingForNonExistentTermReturnsEmptyResults(): void
    {
        $response = $this->get('/docs/search?query=abcdefghijklmnopqrstuvwxyz');
        // The Symfony serializer cannot deserialize type 'array', so we cannot just check if it equals []
        $this->assertParsedBodyPassesCallback(
            $response,
            SearchResult::class . '[]',
            static function (array $results): bool {
                return \count($results) === 0;
            }
        );
    }
}
