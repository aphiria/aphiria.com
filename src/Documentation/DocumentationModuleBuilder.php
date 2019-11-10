<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/app/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation;

use Aphiria\Configuration\IApplicationBuilder;
use Aphiria\Configuration\IModuleBuilder;
use App\Databases\Bootstrappers\SqlBootstrapper;
use App\Documentation\Bootstrappers\DocumentationBootstrapper;

/**
 * Defines the documentation module builder
 */
final class DocumentationModuleBuilder implements IModuleBuilder
{
    /**
     * @inheritdoc
     */
    public function build(IApplicationBuilder $appBuilder): void
    {
        $appBuilder->withBootstrappers(fn () => [
            new SqlBootstrapper(),
            new DocumentationBootstrapper()
        ]);
    }
}
