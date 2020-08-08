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

use Aphiria\DependencyInjection\IContainer;
use Aphiria\Middleware\IMiddleware;
use Aphiria\Net\Http\HttpException;
use Aphiria\Net\Http\HttpStatusCodes;
use Aphiria\Net\Http\IRequest;
use Aphiria\Net\Http\IRequestHandler;
use Aphiria\Net\Http\IResponse;
use App\Authentication\Api\AccessTokenCookieParser;
use App\Authentication\Api\AuthContext;
use App\Authentication\IAuthenticationService;

/**
 * Defines the authentication middleware
 */
final class Authenticate implements IMiddleware
{
    /** @var IAuthenticationService The auth service */
    private IAuthenticationService $auth;
    /** @var AccessTokenCookieParser The access token parser */
    private AccessTokenCookieParser $accessTokenCookieParser;
    /** @var IContainer The DI container */
    private IContainer $container;

    /**
     * @param IAuthenticationService $auth The auth service
     * @param AccessTokenCookieParser $accessTokenCookieParser The access token parser
     * @param IContainer $container The DI container
     */
    public function __construct(
        IAuthenticationService $auth,
        AccessTokenCookieParser $accessTokenCookieParser,
        IContainer $container
    ) {
        $this->auth = $auth;
        $this->accessTokenCookieParser = $accessTokenCookieParser;
        $this->container = $container;
    }

    /**
     * @inheritdoc
     * @throws HttpException Thrown if the user was not authenticated
     */
    public function handle(IRequest $request, IRequestHandler $next): IResponse
    {
        if (($accessTokenCookie = $this->accessTokenCookieParser->parseAccessToken($request)) === null) {
            throw new HttpException(HttpStatusCodes::HTTP_UNAUTHORIZED, 'Access token not set');
        }

        if (!$this->auth->authenticateAccessToken($accessTokenCookie->userId, $accessTokenCookie->accessToken)) {
            throw new HttpException(HttpStatusCodes::HTTP_UNAUTHORIZED, 'Invalid access token');
        }

        // Overwrite the auth context bound in the auth binder
        $this->container->bindInstance(
            AuthContext::class,
            new AuthContext(true, $accessTokenCookie->userId, $accessTokenCookie->accessToken)
        );

        return $next->handle($request);
    }
}
