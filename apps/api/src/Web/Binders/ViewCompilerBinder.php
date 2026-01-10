<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2026 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web\Binders;

use Aphiria\DependencyInjection\Binders\Binder;
use Aphiria\DependencyInjection\IContainer;
use App\Documentation\DocumentationMetadata;
use App\Web\ViewCompiler;
use League\Flysystem\FilesystemOperator;

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
            '/apps/web/src/views',
            '/apps/web/public',
            $container->resolve(DocumentationMetadata::class),
            $container->resolve(FilesystemOperator::class),
        );
        $container->bindInstance(ViewCompiler::class, $viewCompiler);
    }
}
