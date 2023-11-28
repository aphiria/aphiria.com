<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2023 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Api\Controllers;

use Aphiria\Api\Controllers\Controller;
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Attributes\Get;
use Exception;

/**
 * Defines the controller used for health checks of the API
 */
final class HealthController extends Controller
{
    /**
     * Checks the health of the API
     *
     * @return IResponse The response
     * @throws Exception Thrown if there was an error negotiating the content
     */
    #[Get('health')]
    public function checkHealth(): IResponse
    {
        return $this->ok();
    }
}
