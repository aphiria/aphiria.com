<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web;

use Aphiria\Configuration\IApplicationBuilder;
use Aphiria\Configuration\IModuleBuilder;
use App\Web\Bootstrappers\ViewCompilerBootstrapper;

/**
 * Defines the module for our web code
 */
final class WebModuleBuilder implements IModuleBuilder
{
    /**
     * Builds the entire module into an application
     *
     * @param IApplicationBuilder $appBuilder The app builder to use
     */
    public function build(IApplicationBuilder $appBuilder): void
    {
        $appBuilder->withBootstrappers(fn () => [
            new ViewCompilerBootstrapper()
        ]);
    }
}
