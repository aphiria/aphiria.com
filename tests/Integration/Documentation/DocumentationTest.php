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
use PHPUnit\Framework\Attributes\DataProvider;

class DocumentationTest extends IntegrationTestCase
{
    public static function versionProvider(): array
    {
        // Null means 'no version specified'
        return [[null, '1.x']];
    }

    #[DataProvider('versionProvider')]
    public function testSearchingForItemWithBadContextReturns400(?string $version): void
    {
        $versionQueryString = $version === null ? '' : "&version=$version";
        $response = $this->get("/docs/search?query=routing$versionQueryString", ['Cookie' => 'context=invalid']);
        $this->assertStatusCodeEquals(HttpStatusCode::BadRequest, $response);
    }

    public function testSearchingForItemWithBadVersionReturns400(): void
    {
        $response = $this->get('/docs/search?query=routing&version=bad');
        $this->assertStatusCodeEquals(HttpStatusCode::BadRequest, $response);
    }

    #[DataProvider('versionProvider')]
    public function testSearchingForItemWithDocumentationReturnsResults(?string $version): void
    {
        $versionQueryString = $version === null ? '' : "&version=$version";
        $response = $this->get("/docs/search?query=routing$versionQueryString");
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

    #[DataProvider('versionProvider')]
    public function testSearchingForNonExistentTermReturnsEmptyResults(?string $version): void
    {
        $versionQueryString = $version === null ? '' : "&version=$version";
        $response = $this->get("/docs/search?query=abcdefghijklmnopqrstuvwxyz$versionQueryString");
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
