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
use Aphiria\Net\Http\IRequest;
use Aphiria\Net\Http\IResponseFactory;
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
            ->withHttpExceptionResponseFactory(
                $appBuilder,
                IncorrectPasswordException::class,
                fn (IncorrectPasswordException $ex, IRequest $request, IResponseFactory $responseFactory) =>
                    $responseFactory->createResponse($request, HttpStatusCodes::HTTP_UNAUTHORIZED)
            )
            ->withHttpExceptionResponseFactory(
                $appBuilder,
                InvalidPasswordException::class,
                fn (InvalidPasswordException $ex, IRequest $request, IResponseFactory $responseFactory) =>
                    $responseFactory->createResponse($request, HttpStatusCodes::HTTP_BAD_REQUEST)
            );
    }
}
