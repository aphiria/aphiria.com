<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Databases\Binders;

use Aphiria\DependencyInjection\Binders\Binder;
use Aphiria\DependencyInjection\IContainer;
use PDO;

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
        $dsn = \sprintf(
            'pgsql:host=%s;dbname=%s;port=%d;options=\'--client_encoding=utf8\'',
            (string)\getenv('DB_HOST'),
            (string)\getenv('DB_NAME'),
            (int)\getenv('DB_PORT')
        );
        $container->bindFactory(PDO::class, fn() => new PDO($dsn, (string)\getenv('DB_USER'), (string)\getenv('DB_PASSWORD')), true);
    }
}
