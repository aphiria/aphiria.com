<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Authentication\Api\Middleware;

use Aphiria\Middleware\IMiddleware;
use Aphiria\Net\Http\Formatting\RequestParser;
use Aphiria\Net\Http\HttpException;
use Aphiria\Net\Http\HttpStatusCodes;
use Aphiria\Net\Http\IRequest;
use Aphiria\Net\Http\IRequestHandler;
use Aphiria\Net\Http\IResponse;
use App\Authentication\AuthenticationService;
use App\Authentication\IAuthenticationService;

/**
 * Defines the authentication middleware
 */
final class Authenticate implements IMiddleware
{
    /** @var IAuthenticationService The auth service */
    private IAuthenticationService $auth;
    /** @var RequestParser The request parser */
    private RequestParser $requestParser;

    /**
     * @param IAuthenticationService $auth The auth service
     * @param RequestParser $requestParser The request parser
     */
    public function __construct(IAuthenticationService $auth, RequestParser $requestParser)
    {
        $this->auth = $auth;
        $this->requestParser = $requestParser;
    }

    /**
     * @inheritdoc
     * @throws HttpException Thrown if the user was not authenticated
     */
    public function handle(IRequest $request, IRequestHandler $next): IResponse
    {
        $cookies = $this->requestParser->parseCookies($request);
        $accessTokenJson = null;

        if (!$cookies->tryGet(AuthenticationService::ACCESS_TOKEN_COOKIE_NAME, $accessTokenJson)) {
            throw new HttpException(HttpStatusCodes::HTTP_UNAUTHORIZED, 'No access token cookie set');
        }

        try {
            $parsedAccessToken = \json_decode($accessTokenJson, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $ex) {
            throw new HttpException(HttpStatusCodes::HTTP_UNAUTHORIZED, 'Invalid access token');
        }

        if (!isset($parsedAccessToken['userId'], $parsedAccessToken['accessToken'])) {
            throw new HttpException(HttpStatusCodes::HTTP_UNAUTHORIZED, 'Missing user ID/access token');
        }

        if (!$this->auth->authenticateAccessToken($parsedAccessToken['userId'], $parsedAccessToken['accessToken'])) {
            throw new HttpException(HttpStatusCodes::HTTP_UNAUTHORIZED, 'Invalid access token');
        }

        return $next->handle($request);
    }
}
