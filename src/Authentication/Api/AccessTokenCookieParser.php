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
use JsonException;

/**
 * Defines the access token cookie parser
 */
final class AccessTokenCookieParser
{
    /**
     * @param RequestParser $requestParser The request parser
     */
    public function __construct(private RequestParser $requestParser)
    {
    }

    /**
     * Parses a request for an access token
     *
     * @param IRequest $request The request to parse
     * @return AccessTokenCookie|null The access token if one existed in the request, otherwise null
     */
    public function parseAccessToken(IRequest $request): ?AccessTokenCookie
    {
        $cookies = $this->requestParser->parseCookies($request);
        $accessTokenJson = null;

        if (!$cookies->tryGet(SqlAuthenticationService::ACCESS_TOKEN_COOKIE_NAME, $accessTokenJson)) {
            return null;
        }

        try {
            /** @var array{userId: int, accessToken: string} $parsedAccessToken */
            $parsedAccessToken = \json_decode((string)$accessTokenJson, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $ex) {
            return null;
        }

        if (!isset($parsedAccessToken['userId'], $parsedAccessToken['accessToken'])) {
            return null;
        }

        return new AccessTokenCookie($parsedAccessToken['userId'], $parsedAccessToken['accessToken']);
    }
}
