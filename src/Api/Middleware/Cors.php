<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Api\Middleware;

use Aphiria\Collections\KeyValuePair;
use Aphiria\Middleware\IMiddleware;
use Aphiria\Net\Http\Handlers\IRequestHandler;
use Aphiria\Net\Http\IRequest;
use Aphiria\Net\Http\IResponse;

/**
 * Defines the middleware that enforces CORS
 */
final class Cors implements IMiddleware
{
    /** @var string The allowed origin */
    private string $allowedOrigin;

    public function __construct()
    {
        // Strip off any port numbers
        $allowedOriginUriParts = \parse_url(getenv('APP_WEB_URL'));
        $this->allowedOrigin = "{$allowedOriginUriParts['scheme']}://{$allowedOriginUriParts['host']}";
    }

    /**
     * @inheritdoc
     */
    public function handle(IRequest $request, IRequestHandler $next): IResponse
    {
        $response = $next->handle($request);
        $response->getHeaders()
            ->addRange([
                new KeyValuePair('Access-Control-Allow-Origin', $this->allowedOrigin),
                new KeyValuePair('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE')
            ]);

        return $response;
    }
}
