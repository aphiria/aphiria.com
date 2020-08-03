<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Authentication\Api;

use Aphiria\Net\Http\Formatting\RequestParser;
use Aphiria\Net\Http\IRequest;
use App\Authentication\SqlAuthenticationService;

/**
 * Defines the access token parser
 */
final class AccessTokenParser
{
    /** @var RequestParser The request parser */
    private RequestParser $requestParser;

    /**
     * @param RequestParser $requestParser The request parser
     */
    public function __construct(RequestParser $requestParser)
    {
        $this->requestParser = $requestParser;
    }

    /**
     * Parses a request for an access token
     *
     * @param IRequest $request The request to parse
     * @return AccessToken|null The access token if one existed in the request, otherwise null
     */
    public function parseAccessToken(IRequest $request): ?AccessToken
    {
        // TODO: Should I rename some of this stuff so that we can use it as an "authContext", eg $this->authContext->userId or $this->authContext->accessToken?  Where would I define the context?  And where would I populate it?  In middleware?  In request properties?
        $cookies = $this->requestParser->parseCookies($request);
        $accessTokenJson = null;

        if (!$cookies->tryGet(SqlAuthenticationService::ACCESS_TOKEN_COOKIE_NAME, $accessTokenJson)) {
            return null;
        }

        try {
            $parsedAccessToken = \json_decode($accessTokenJson, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $ex) {
            return null;
        }

        if (!isset($parsedAccessToken['userId'], $parsedAccessToken['accessToken'])) {
            return null;
        }

        return new AccessToken($parsedAccessToken['userId'], $parsedAccessToken['accessToken']);
    }
}
