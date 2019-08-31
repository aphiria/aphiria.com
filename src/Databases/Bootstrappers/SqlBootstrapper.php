<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Databases\Bootstrappers;

use Aphiria\DependencyInjection\Bootstrappers\Bootstrapper;
use Aphiria\DependencyInjection\IContainer;
use Exception;
use Opulence\Databases\Adapters\Pdo\MySql\Driver as MySqlDriver;
use Opulence\Databases\Adapters\Pdo\PostgreSql\Driver as PostgreSqlDriver;
use Opulence\Databases\ConnectionPools\ConnectionPool;
use Opulence\Databases\ConnectionPools\SingleServerConnectionPool;
use Opulence\Databases\IConnection;
use Opulence\Databases\Providers\Types\Factories\TypeMapperFactory;
use Opulence\Databases\Server;
use RuntimeException;

/**
 * Defines the SQL bootstrapper
 */
final class SqlBootstrapper extends Bootstrapper
{
    /**
     * @inheritdoc
     */
    public function registerBindings(IContainer $container): void
    {
        try {
            switch (getenv('DB_DRIVER')) {
                case 'postgres':
                    $driver = new PostgreSqlDriver();
                    break;
                case 'mysql':
                    $driver = new MySqlDriver();
                    break;
                default:
                    throw new RuntimeException(
                        'Invalid database driver type specified in environment var "DB_DRIVER": ' . getenv('DB_DRIVER')
                    );
            }

            $connectionPool = new SingleServerConnectionPool(
                $driver,
                new Server(
                    getenv('DB_HOST'), getenv('DB_USER'), getenv('DB_PASSWORD'), getenv('DB_NAME'), (int)getenv('DB_PORT')
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
