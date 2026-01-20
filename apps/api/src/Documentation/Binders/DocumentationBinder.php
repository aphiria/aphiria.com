<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2026 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Binders;

use Aphiria\DependencyInjection\Binders\Binder;
use Aphiria\DependencyInjection\IContainer;
use App\Documentation\Searching\ISearchIndex;
use App\Documentation\Searching\PostgreSqlSearchIndex;
use PDO;

/**
 * Defines the binder for documentation search
 */
final class DocumentationBinder extends Binder
{
    /**
     * @inheritdoc
     */
    public function bind(IContainer $container): void
    {
        // Bind using a factory to defer resolving the database connection
        $container->bindFactory(
            ISearchIndex::class,
            fn() => new PostgreSqlSearchIndex($container->resolve(PDO::class)),
            true,
        );
    }
}
