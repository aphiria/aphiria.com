<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2026 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

use Aphiria\Application\Configuration\Bootstrappers\DotEnvBootstrapper;
use Aphiria\DependencyInjection\Container;
use Aphiria\DependencyInjection\IContainer;
use Aphiria\DependencyInjection\IServiceResolver;
use App\Databases\Binders\SqlBinder;
use App\Documentation\Binders\DocumentationBinder;

require __DIR__ . '/vendor/autoload.php';

/**
 * If the DI container does not exist, assume we are invoking Phinx commands directly from the CLI.
 * This means we need to manually bootstrap and bind a few things.
 */
if (($container = Container::$globalInstance) === null) {
    $container = new Container();
    Container::$globalInstance = $container;
    $container->bindInstance([IServiceResolver::class, IContainer::class, Container::class], $container);

    // Ensure our environment variables are set
    new DotEnvBootstrapper(__DIR__ . '/.env')->bootstrap();
    // Ensure our database connection is configured
    new SqlBinder()->bind($container);
    // Ensure our file system is configured
    new DocumentationBinder()->bind($container);
}

return [
    'paths' => [
        'migrations' => '%%PHINX_CONFIG_DIR%%/infrastructure/database/migrations',
        'seeds' => '%%PHINX_CONFIG_DIR%%/infrastructure/database/seeds',
    ],
    'environments' => [
        'default_migration_table' => 'phinxlog',
        'default_environment' => \getenv('APP_ENV'),
        'production' => [
            'adapter' => 'postgresql',
            'name' => \getenv('DB_NAME'),
            'connection' => $container->resolve(PDO::class),
        ],
        'preview' => [
            'adapter' => 'postgresql',
            'name' => \getenv('DB_NAME'),
            'connection' => $container->resolve(PDO::class),
        ],
        'local' => [
            'adapter' => 'postgresql',
            'name' => \getenv('DB_NAME'),
            'connection' => $container->resolve(PDO::class),
        ],
    ],
    'version_order' => 'creation',
];
