<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web\Bootstrappers;

use Aphiria\DependencyInjection\Bootstrappers\Bootstrapper;
use Aphiria\DependencyInjection\IContainer;
use App\Documentation\DocumentationMetadata;
use App\Web\ViewCompiler;

/**
 * Defines the bootstrapper for our view compiler
 */
final class ViewCompilerBootstrapper extends Bootstrapper
{
    /**
     * @inheritdoc
     */
    public function registerBindings(IContainer $container): void
    {
        $viewCompiler = new ViewCompiler(
            __DIR__ . '/../../../resources/views',
            __DIR__ . '/../../../public-web',
            $container->resolve(DocumentationMetadata::class),
            getenv('APP_API_URL')
        );
        $container->bindInstance(ViewCompiler::class, $viewCompiler);
    }
}
