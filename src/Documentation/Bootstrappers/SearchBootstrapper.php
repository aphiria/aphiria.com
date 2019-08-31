<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Bootstrappers;

use Aphiria\DependencyInjection\Bootstrappers\Bootstrapper;
use Aphiria\DependencyInjection\IContainer;
use App\Documentation\Searching\SearchService;
use Opulence\Databases\IConnection;

/**
 * Defines the search bootstrapper
 */
final class SearchBootstrapper extends Bootstrapper
{
    /**
     * @inheritdoc
     */
    public function registerBindings(IContainer $container): void
    {
        $container->bindFactory(SearchService::class, fn (IContainer $container) => new SearchService(
            $container->resolve(IConnection::class)
        ), true);
    }
}
