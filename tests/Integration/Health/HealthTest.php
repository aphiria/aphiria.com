<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2023 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Tests\Integration\Health;

use Aphiria\Net\Http\HttpStatusCode;
use App\Tests\Integration\IntegrationTestCase;

class HealthTest extends IntegrationTestCase
{
    public function testCheckingHealthReturns200(): void
    {
        $this->assertStatusCodeEquals(HttpStatusCode::Ok, $this->get('/health'));
    }
}
