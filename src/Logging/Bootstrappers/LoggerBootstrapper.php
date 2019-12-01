<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Logging\Bootstrappers;

use Aphiria\DependencyInjection\Bootstrappers\Bootstrapper;
use Aphiria\DependencyInjection\IContainer;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Psr\Log\LoggerInterface;

/**
 * Defines the bootstrapper that registers the application logger
 */
final class LoggerBootstrapper extends Bootstrapper
{
    /**
     * @inheritdoc
     */
    public function registerBindings(IContainer $container): void
    {
        /**
         * ----------------------------------------------------------
         * Create a PSR-3 logger
         * ----------------------------------------------------------
         *
         * Note: You may use any PSR-3 logger you'd like
         * For convenience, the Monolog library is included here
         */
        $logger = new Logger('app');
        $logger->pushHandler(new StreamHandler(__DIR__ . '/../../../tmp/logs/errors.txt'));
        $container->bindInstance(LoggerInterface::class, $logger);
    }
}