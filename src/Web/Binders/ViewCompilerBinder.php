<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web\Binders;

use Aphiria\DependencyInjection\Binders\Binder;
use Aphiria\DependencyInjection\IContainer;
use App\Documentation\DocumentationMetadata;
use App\Web\ViewCompiler;
use League\Flysystem\FilesystemInterface;

/**
 * Defines the binder for our view compiler
 */
final class ViewCompilerBinder extends Binder
{
    /**
     * @inheritdoc
     */
    public function bind(IContainer $container): void
    {
        $viewCompiler = new ViewCompiler(
            '/resources/views',
            '/public-web',
            $container->resolve(DocumentationMetadata::class),
            (string)\getenv('APP_API_URL'),
            $container->resolve(FilesystemInterface::class)
        );
        $container->bindInstance(ViewCompiler::class, $viewCompiler);
    }
}
