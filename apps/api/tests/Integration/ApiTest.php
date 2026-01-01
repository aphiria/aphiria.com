<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2026 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Tests\Integration;

use Aphiria\Net\Http\HttpStatusCode;

class ApiTest extends IntegrationTestCase
{
    public function testCheckingHealthOnEmptyPathReturns200(): void
    {
        $this->assertStatusCodeEquals(HttpStatusCode::Ok, $this->get('/'));
    }

    public function testCheckingHealthReturns200(): void
    {
        $this->assertStatusCodeEquals(HttpStatusCode::Ok, $this->get('/health'));
    }

    public function testNonExistentRouteReturns404(): void
    {
        $this->assertStatusCodeEquals(HttpStatusCode::NotFound, $this->get('/does-not-exist'));
    }
}
