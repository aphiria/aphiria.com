<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Posts;

use Aphiria\Application\Builders\IApplicationBuilder;
use Aphiria\Application\IModule;
use Aphiria\Framework\Application\AphiriaComponents;
use Aphiria\Net\Http\HttpStatusCodes;
use Aphiria\Net\Http\IRequest;
use Aphiria\Net\Http\IResponseFactory;
use App\Posts\Binders\PostBinder;

/**
 * Defines the post module
 */
final class PostModule implements IModule
{
    use AphiriaComponents;

    /**
     * @inheritdoc
     */
    public function build(IApplicationBuilder $appBuilder): void
    {
        $this->withBinders($appBuilder, new PostBinder())
            ->withHttpExceptionResponseFactory(
                $appBuilder,
                PostNotFoundException::class,
                fn (PostNotFoundException $ex, IRequest $request, IResponseFactory $responseFactory) =>
                    $responseFactory->createResponse($request, HttpStatusCodes::HTTP_NOT_FOUND)
            );
    }
}
