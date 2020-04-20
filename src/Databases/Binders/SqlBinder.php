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
        $dsn = sprintf(
            'pgsql:host=%s;dbname=%s;port=%d;options=\'--client_encoding=utf8\'',
            \getenv('DB_HOST'),
            \getenv('DB_NAME'),
            (int)\getenv('DB_PORT')
        );
        $pdo = new PDO($dsn, \getenv('DB_USER'), \getenv('DB_PASSWORD'));
        $container->bindInstance(PDO::class, $pdo);
    }
}
