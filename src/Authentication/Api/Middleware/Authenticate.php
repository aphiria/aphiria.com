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

use Aphiria\Middleware\AttributeMiddleware;
use Aphiria\Net\Http\HttpException;
use Aphiria\Net\Http\HttpStatusCodes;
use Aphiria\Net\Http\IRequest;
use Aphiria\Net\Http\IRequestHandler;
use Aphiria\Net\Http\IResponse;
use App\Authentication\Api\AccessTokenCookieParser;
use App\Authentication\Api\AuthenticationContext;
use App\Authentication\IAuthenticationService;

/**
 * Defines the authentication middleware
 */
final class Authenticate extends AttributeMiddleware
{
    /**
     * @param IAuthenticationService $auth The auth service
     * @param AccessTokenCookieParser $accessTokenCookieParser The access token parser
     * @param AuthenticationContext $authContext The current authentication context
     */
    public function __construct(
        private IAuthenticationService $auth,
        private AccessTokenCookieParser $accessTokenCookieParser,
        private AuthenticationContext $authContext
    ) {
    }

    /**
     * @inheritdoc
     * @throws HttpException Thrown if the user was not authenticated
     */
    public function handle(IRequest $request, IRequestHandler $next): IResponse
    {
        $allowUnauthenticatedUsers = (bool)$this->getAttribute('allowUnauthenticatedUsers');

        if (($accessTokenCookie = $this->accessTokenCookieParser->parseAccessToken($request)) === null) {
            if ($allowUnauthenticatedUsers) {
                return $next->handle($request);
            }

            throw new HttpException(HttpStatusCodes::UNAUTHORIZED, 'Access token not set');
        }

        if ($this->auth->authenticateAccessToken($accessTokenCookie->userId, $accessTokenCookie->accessToken)) {
            // Update the auth context
            $this->authContext->isAuthenticated = true;
            $this->authContext->userId = $accessTokenCookie->userId;
            $this->authContext->accessToken = $accessTokenCookie->accessToken;

            return $next->handle($request);
        }

        if ($allowUnauthenticatedUsers) {
            return $next->handle($request);
        }

        throw new HttpException(HttpStatusCodes::UNAUTHORIZED, 'Invalid access token');
    }
}
