<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Users;

use Aphiria\Application\Builders\IApplicationBuilder;
use Aphiria\Application\IModule;
use Aphiria\Framework\Application\AphiriaComponents;
use Aphiria\Net\Http\HttpStatusCodes;
use Aphiria\Net\Http\IRequest;
use Aphiria\Net\Http\IResponseFactory;
use App\Users\Binders\UserBinder;

/**
 * Defines the user module
 */
final class UserModule implements IModule
{
    use AphiriaComponents;

    /**
     * @inheritdoc
     */
    public function build(IApplicationBuilder $appBuilder): void
    {
        $this->withBinders($appBuilder, new UserBinder())
            ->withHttpExceptionResponseFactory(
                $appBuilder,
                UserNotFoundException::class,
                fn (UserNotFoundException $ex, IRequest $request, IResponseFactory $responseFactory) =>
                    $responseFactory->createResponse($request, HttpStatusCodes::HTTP_NOT_FOUND)
            );
    }
}
