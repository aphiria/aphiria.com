<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2026 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Monitoring;

use Aphiria\Application\IApplicationBuilder;
use Aphiria\Authentication\AuthenticationScheme;
use Aphiria\Authentication\AuthenticationSchemeOptions;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Middleware\MiddlewareBinding;
use App\Monitoring\Api\Middleware\PrometheusMetrics;
use App\Monitoring\Auth\Schemes\PrometheusTokenHandler;
use App\Monitoring\Binders\MonitoringBinder;

/**
 * Defines the monitoring module
 */
final class MonitoringModule extends AphiriaModule
{
    /**
     * @inheritdoc
     */
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this
            ->withBinders($appBuilder, new MonitoringBinder())
            ->withGlobalMiddleware($appBuilder, new MiddlewareBinding(PrometheusMetrics::class))
            ->withAuthenticationScheme(
                $appBuilder,
                new AuthenticationScheme(
                    'prometheus',
                    PrometheusTokenHandler::class,
                    new AuthenticationSchemeOptions(),
                ),
            );
    }
}
