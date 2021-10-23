<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2021 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web;

use Aphiria\Application\Builders\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use App\Web\Binders\ViewCompilerBinder;

/**
 * Defines the module for our web code
 */
final class WebModule extends AphiriaModule
{
    /**
     * @inheritdoc
     */
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withBinders($appBuilder, [
            new ViewCompilerBinder()
        ]);
    }
}
