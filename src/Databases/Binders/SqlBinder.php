<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Databases\Binders;

use Aphiria\DependencyInjection\Binders\Binder;
use Aphiria\DependencyInjection\IContainer;
use Exception;
use Opulence\Databases\Adapters\Pdo\PostgreSql\Driver;
use Opulence\Databases\ConnectionPools\ConnectionPool;
use Opulence\Databases\ConnectionPools\SingleServerConnectionPool;
use Opulence\Databases\IConnection;
use Opulence\Databases\Providers\Types\Factories\TypeMapperFactory;
use Opulence\Databases\Server;
use RuntimeException;

/**
 * Defines the SQL binder
 */
final class SqlBinder extends Binder
{
    /**
     * @inheritdoc
     */
    public function bind(IContainer $container): void
    {
        try {
            $connectionPool = new SingleServerConnectionPool(
                new Driver(),
                new Server(
                    \getenv('DB_HOST'),
                    \getenv('DB_USER'),
                    \getenv('DB_PASSWORD'),
                    \getenv('DB_NAME'),
                    (int)\getenv('DB_PORT')
                )
            );
            $container->bindInstance(ConnectionPool::class, $connectionPool);
            $container->bindInstance(IConnection::class, $connectionPool->getWriteConnection());
            $container->bindInstance(TypeMapperFactory::class, new TypeMapperFactory());
        } catch (Exception $ex) {
            throw new RuntimeException('Failed to register SQL bindings', 0, $ex);
        }
    }
}
