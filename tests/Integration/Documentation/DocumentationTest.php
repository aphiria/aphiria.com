<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Tests\Integration\Documentation;

use Aphiria\Net\Http\HttpStatusCode;
use App\Documentation\Searching\SearchResult;
use App\Tests\Integration\IntegrationTestCase;

class DocumentationTest extends IntegrationTestCase
{
    public function testSearchingForItemWithBadContextReturns400(): void
    {
        $response = $this->get('/docs/search?query=routing', ['Cookie' => 'context=invalid']);
        $this->assertStatusCodeEquals(HttpStatusCode::BadRequest, $response);
    }

    public function testSearchingForItemWithDocumentationReturnsResults(): void
    {
        $response = $this->get('/docs/search?query=routing');
        $this->assertStatusCodeEquals(HttpStatusCode::Ok, $response);
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
        $this->assertStatusCodeEquals(HttpStatusCode::Ok, $response);
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
