<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2021 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Api\Middleware;

use Aphiria\Collections\KeyValuePair;
use Aphiria\Middleware\IMiddleware;
use Aphiria\Net\Http\HttpStatusCode;
use Aphiria\Net\Http\IRequest;
use Aphiria\Net\Http\IRequestHandler;
use Aphiria\Net\Http\IResponse;
use Aphiria\Net\Http\Response;

/**
 * Defines the middleware that enforces CORS
 */
final class Cors implements IMiddleware
{
    /** @var list<string> The list of allowed methods */
    private static array $allowedMethods = ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'];
    /** @var list<string> The list of allowed headers */
    private static array $allowedHeaders = ['Content-Type', 'Origin', 'Accept', 'Cookie'];
    /** @var string The allowed origin */
    private string $allowedOrigin;

    public function __construct()
    {
        // Strip off any port numbers
        /** @var array{scheme: string, host: string} $allowedOriginUriParts */
        $allowedOriginUriParts = \parse_url((string)\getenv('APP_WEB_URL'));
        $this->allowedOrigin = "{$allowedOriginUriParts['scheme']}://{$allowedOriginUriParts['host']}";
    }

    /**
     * @inheritdoc
     */
    public function handle(IRequest $request, IRequestHandler $next): IResponse
    {
        $requestedMethod = null;

        // Check if this is a preflight request
        if ($request->getMethod() === 'OPTIONS' && $request->getHeaders()->tryGetFirst('Access-Control-Request-Method', $requestedMethod)) {
            if (!\in_array($requestedMethod, self::$allowedMethods, true)) {
                return $this->addCorsResponseHeaders(new Response(HttpStatusCode::MethodNotAllowed));
            }

            return $this->addCorsResponseHeaders(new Response(HttpStatusCode::Ok));
        }

        return $this->addCorsResponseHeaders($next->handle($request));
    }

    /**
     * Adds CORS headers to a response
     *
     * @param IResponse $response The response to decorate
     * @return IResponse The response with the added headers
     */
    private function addCorsResponseHeaders(IResponse $response): IResponse
    {
        /** @var list<KeyValuePair<string, float|int|list<float|int|string>|string>> $headers */
        $headers = [
            new KeyValuePair('Access-Control-Allow-Origin', $this->allowedOrigin),
            new KeyValuePair('Access-Control-Allow-Methods', \implode(', ', self::$allowedMethods)),
            new KeyValuePair('Access-Control-Allow-Headers', \implode(', ', self::$allowedHeaders)),
            new KeyValuePair('Access-Control-Allow-Credentials', 'true')
        ];
        $response->getHeaders()
            ->addRange($headers);

        return $response;
    }
}
