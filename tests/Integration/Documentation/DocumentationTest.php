<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
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
        $response = $this->get('http://localhost/docs/search?query=routing');
        $this->assertParsedBodyPassesCallback(
            $response,
            SearchResult::class . '[]',
            static function (array $results) {
                return \count($results) > 0 && strpos($results[0]->highlightedH1, 'Routing') !== false;
            }
        );
    }

    public function testSearchingForNonExistentTermReturnsEmptyResults(): void
    {
        $response = $this->get('http://localhost/docs/search?query=abcdefghijklmnopqrstuvwxyz');
        $this->assertParsedBodyEquals([], $response);
    }
}
