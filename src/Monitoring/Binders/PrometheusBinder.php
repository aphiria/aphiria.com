<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Monitoring\Binders;

use Aphiria\Application\Configuration\GlobalConfiguration;
use Aphiria\Application\Configuration\MissingConfigurationValueException;
use Aphiria\DependencyInjection\Binders\Binder;
use Aphiria\DependencyInjection\IContainer;
use Prometheus\CollectorRegistry;
use Prometheus\Exception\MetricsRegistrationException;
use Prometheus\RegistryInterface;
use Prometheus\Storage\InMemory as InMemoryAdapter;
use Prometheus\Storage\Redis as RedisAdapter;
use Psr\Log\LoggerInterface;
use Throwable;

/**
 * Defines the binder for Prometheus
 */
final class PrometheusBinder extends Binder
{
    /**
     * @inheritdoc
     * @throws MetricsRegistrationException Thrown if the metrics could not be registered
     */
    public function bind(IContainer $container): void
    {
        try {
            $adapter = new RedisAdapter([
                'host' => GlobalConfiguration::getString('app.monitoring.redis.host'),
                'port' => GlobalConfiguration::getString('app.monitoring.redis.port'),
                'password' => GlobalConfiguration::getString('app.monitoring.redis.password')
            ]);
            $container->bindInstance(
                RegistryInterface::class,
                $this->configureRegistryMetrics(new CollectorRegistry($adapter))
            );
        } catch (Throwable $ex) {
            // This is really only useful during CI when Redis has not yet been provisioned
            $container->resolve(LoggerInterface::class)->error(
                'Failed to connect to Redis, falling back to in-memory metrics',
                ['exception' => $ex]
            );
            $adapter = new InMemoryAdapter();
            $container->bindInstance(
                RegistryInterface::class,
                $this->configureRegistryMetrics(new CollectorRegistry($adapter))
            );
        }
    }

    /**
     * Configures the Prometheus registry's metrics
     *
     * @param RegistryInterface $registry The registry to configure
     * @return RegistryInterface The configured registry
     * @throws MetricsRegistrationException Thrown if the metrics could not be registered
     */
    private function configureRegistryMetrics(RegistryInterface $registry): RegistryInterface
    {
        // HTTP request counter, labeled by method/path/status
        $registry->registerCounter(
            'app',
            'http_requests_total',
            'Total HTTP requests',
            ['method','path','status']
        );

        // HTTP request duration histogram
        $registry->registerHistogram(
            'app',
            'http_request_duration_seconds',
            'HTTP request latency in seconds',
            ['method','path'],
            [0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2.5,5,10]
        );

        return $registry;
    }
}
