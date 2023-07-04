<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2023 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation;

use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use App\Databases\Binders\SqlBinder;
use App\Documentation\Binders\DocumentationBinder;

/**
 * Defines the documentation module
 */
final class DocumentationModule extends AphiriaModule
{
    /**
     * @inheritdoc
     */
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withBinders($appBuilder, [
            new SqlBinder(),
            new DocumentationBinder()
        ]);
    }
}
