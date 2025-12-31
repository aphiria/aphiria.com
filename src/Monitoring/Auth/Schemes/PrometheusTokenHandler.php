<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Monitoring\Auth\Schemes;

use Aphiria\Authentication\AuthenticationResult;
use Aphiria\Authentication\AuthenticationScheme;
use Aphiria\Authentication\AuthenticationSchemeOptions;
use Aphiria\Authentication\Schemes\IAuthenticationSchemeHandler;
use Aphiria\Net\Http\HttpStatusCode;
use Aphiria\Net\Http\IRequest;
use Aphiria\Net\Http\IResponse;
use Aphiria\Security\Claim;
use Aphiria\Security\ClaimType;
use Aphiria\Security\Identity;
use Aphiria\Security\User;

/**
 * Defines the Prometheus token authentication handler for /metrics endpoint
 *
 * @implements IAuthenticationSchemeHandler<AuthenticationSchemeOptions>
 */
final class PrometheusTokenHandler implements IAuthenticationSchemeHandler
{
    /**
     * @inheritdoc
     */
    public function authenticate(IRequest $request, AuthenticationScheme $scheme): AuthenticationResult
    {
        $authHeader = null;

        if ($request->headers->tryGetFirst('Authorization', $authHeader) === false || !\str_starts_with($authHeader ?? '', 'Bearer ')) {
            return AuthenticationResult::fail('Missing or invalid Authorization header', $scheme->name);
        }

        /** @var string $authHeader */
        // Remove "Bearer " prefix
        $token = \substr($authHeader, 7);
        $expectedToken = \getenv('PROMETHEUS_AUTH_TOKEN');

        if ($expectedToken === false || $expectedToken === '') {
            return AuthenticationResult::fail('PROMETHEUS_AUTH_TOKEN not configured', $scheme->name);
        }

        if (!\hash_equals($expectedToken, $token)) {
            return AuthenticationResult::fail('Invalid token', $scheme->name);
        }

        // Create identity with Name claim for Prometheus system user
        $identity = new Identity(
            [new Claim(ClaimType::Name, 'prometheus', 'prometheus')],
            $scheme->name,
        );

        return AuthenticationResult::pass(new User([$identity]), $scheme->name);
    }

    /**
     * @inheritdoc
     */
    public function challenge(IRequest $request, IResponse $response, AuthenticationScheme $scheme): void
    {
        $response->statusCode = HttpStatusCode::Unauthorized;
        $response->headers->add('WWW-Authenticate', 'Bearer realm="Prometheus Metrics"');
    }

    /**
     * @inheritdoc
     */
    public function forbid(IRequest $request, IResponse $response, AuthenticationScheme $scheme): void
    {
        $response->statusCode = HttpStatusCode::Forbidden;
    }
}
