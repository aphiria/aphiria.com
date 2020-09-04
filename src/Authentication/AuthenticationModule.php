<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Authentication;

use Aphiria\Application\Builders\IApplicationBuilder;
use Aphiria\Application\IModule;
use Aphiria\Framework\Application\AphiriaComponents;
use Aphiria\Net\Http\HttpStatusCodes;
use App\Authentication\Binders\AuthenticationBinder;

/**
 * Defines the authentication module
 */
final class AuthenticationModule implements IModule
{
    use AphiriaComponents;

    /**
     * @inheritdoc
     */
    public function build(IApplicationBuilder $appBuilder): void
    {
        $this->withBinders($appBuilder, new AuthenticationBinder())
            ->withProblemDetails(
                $appBuilder,
                IncorrectPasswordException::class,
                null,
                null,
                null,
                HttpStatusCodes::HTTP_UNAUTHORIZED
            )
            ->withProblemDetails(
                $appBuilder,
                InvalidPasswordException::class,
                null,
                null,
                null,
                HttpStatusCodes::HTTP_BAD_REQUEST
            )
            ->withProblemDetails(
                $appBuilder,
                PasswordResetNonceExpiredException::class,
                null,
                null,
                null,
                HttpStatusCodes::HTTP_BAD_REQUEST
            )
            ->withProblemDetails(
                $appBuilder,
                IncorrectPasswordResetNonceException::class,
                null,
                null,
                null,
                HttpStatusCodes::HTTP_BAD_REQUEST
            );
    }
}
