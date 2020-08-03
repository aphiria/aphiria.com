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
use Aphiria\Net\Http\HttpException;
use Aphiria\Net\Http\HttpStatusCodes;
use Aphiria\Net\Http\IRequest;
use Aphiria\Net\Http\IRequestHandler;
use Aphiria\Net\Http\IResponse;
use App\Authentication\Api\AccessTokenParser;
use App\Authentication\IAuthenticationService;

/**
 * Defines the authentication middleware
 */
final class Authenticate implements IMiddleware
{
    /** @var IAuthenticationService The auth service */
    private IAuthenticationService $auth;
    /** @var AccessTokenParser The access token parser */
    private AccessTokenParser $accessTokenParser;

    /**
     * @param IAuthenticationService $auth The auth service
     * @param AccessTokenParser $accessTokenParser The access token parser
     */
    public function __construct(IAuthenticationService $auth, AccessTokenParser $accessTokenParser)
    {
        $this->auth = $auth;
        $this->accessTokenParser = $accessTokenParser;
    }

    /**
     * @inheritdoc
     * @throws HttpException Thrown if the user was not authenticated
     */
    public function handle(IRequest $request, IRequestHandler $next): IResponse
    {
        if (($accessToken = $this->accessTokenParser->parseAccessToken($request)) === null) {
            throw new HttpException(HttpStatusCodes::HTTP_UNAUTHORIZED, 'Valid access token not set');
        }

        if (!$this->auth->authenticateAccessToken($accessToken->userId, $accessToken->accessToken)) {
            throw new HttpException(HttpStatusCodes::HTTP_UNAUTHORIZED, 'Invalid access token');
        }

        return $next->handle($request);
    }
}
