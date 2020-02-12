<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation;

use Aphiria\Configuration\Builders\IApplicationBuilder;
use Aphiria\Configuration\Builders\IModuleBuilder;
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
