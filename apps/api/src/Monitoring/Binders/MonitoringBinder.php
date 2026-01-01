<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2026 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Monitoring\Binders;

use Aphiria\DependencyInjection\Binders\Binder;
use Aphiria\DependencyInjection\IContainer;
use Prometheus\CollectorRegistry;
use Prometheus\RegistryInterface;
use Prometheus\Storage\APC;

/**
 * Defines the monitoring binder for Prometheus metrics collection
 */
final class MonitoringBinder extends Binder
{
    /**
     * @inheritdoc
     */
    public function bind(IContainer $container): void
    {
        // Use APCu for metrics storage (persistent across requests within same PHP-FPM worker)
        $registry = new CollectorRegistry(new APC());

        // Bind both the concrete class and interface for DI flexibility
        $container->bindInstance([CollectorRegistry::class, RegistryInterface::class], $registry);
    }
}
