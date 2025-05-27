<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Monitoring\Middleware;

use Aphiria\Middleware\IMiddleware;
use Aphiria\Net\Http\IRequest;
use Aphiria\Net\Http\IRequestHandler;
use Aphiria\Net\Http\IResponse;
use Prometheus\Exception\MetricsRegistrationException;
use Prometheus\RegistryInterface;
use Psr\Log\LoggerInterface;

/**
 * Defines the middleware for scraping Prometheus metrics
 */
final class Prometheus implements IMiddleware
{
    /**
     * @param RegistryInterface $registry The Prometheus metrics registry
     * @param LoggerInterface $logger The logger in case of an error when logging metrics
     */
    public function __construct(
        private readonly RegistryInterface $registry,
        private readonly LoggerInterface $logger
    ) {}

    /**
     * @inheritdoc
     */
    public function handle(IRequest $request, IRequestHandler $next): IResponse
    {
        $start = microtime(true);
        $response = $next->handle($request);
        $latency = microtime(true) - $start;

        try {
            // Counter
            $counter = $this->registry->getOrRegisterCounter(
                'app',
                'http_requests_total',
                'Total HTTP requests',
                ['method', 'path', 'status']
            );
            $counter->inc([
                $request->method,
                $request->uri->path,
                $response->statusCode->value
            ]);

            // Histogram
            $histogram = $this->registry->getOrRegisterHistogram(
                'app',
                'http_request_duration_seconds',
                'HTTP request latency',
                ['method', 'path'],
                [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
            );
            $histogram->observe($latency, [
                $request->method,
                $request->uri->path . ($request->uri->queryString === null ? '' : '?' . $request->uri->queryString)
            ]);
        } catch (MetricsRegistrationException $ex) {
            // Swallow and log the exception - we do not want an inability to log metrics to stop the application from serving requests
            $this->logger->error($ex->getMessage(), ['exception' => $ex]);
        }

        return $response;
    }
}
