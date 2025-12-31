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
use Throwable;

/**
 * Defines middleware that collects Prometheus metrics for HTTP requests
 */
final class PrometheusMetrics implements IMiddleware
{
    /**
     * @param RegistryInterface $registry The Prometheus collector registry
     * @param LoggerInterface $logger The logger for error handling
     */
    public function __construct(
        private readonly RegistryInterface $registry,
        private readonly LoggerInterface $logger,
    ) {}

    /**
     * @inheritdoc
     * @throws Throwable The re-thrown exception, if there was one
     */
    public function handle(IRequest $request, IRequestHandler $next): IResponse
    {
        $start = \microtime(true);

        try {
            $response = $next->handle($request);
            $latency = \microtime(true) - $start;

            $this->recordRequestMetrics($request, $response, $latency);

            return $response;
        } catch (Throwable $exception) {
            // Record exception metric before re-throwing
            $this->recordExceptionMetric($request, $exception);

            throw $exception;
        }
    }

    /**
     * Gets the path with query string
     *
     * @param IRequest $request The request
     * @return string The path with query string
     */
    private static function getPathWithQueryString(IRequest $request): string
    {
        $path = $request->uri->path;
        $queryString = $request->uri->queryString;

        return $queryString === null || $queryString === '' ? $path : "$path?$queryString";
    }

    /**
     * Records an exception metric
     *
     * @param IRequest $request The request
     * @param Throwable $exception The exception that was thrown
     */
    private function recordExceptionMetric(IRequest $request, Throwable $exception): void
    {
        try {
            $counter = $this->registry->getOrRegisterCounter(
                'app',
                'exceptions_total',
                'Total exceptions thrown',
                ['type', 'endpoint'],
            );

            $counter->inc([
                $exception::class,
                $request->uri->path,
            ]);
        } catch (MetricsRegistrationException $ex) {
            // Swallow and log the exception to prevent metrics collection from breaking requests
            $this->logger->error($ex->getMessage(), ['exception' => $ex]);
        }
    }

    /**
     * Records request metrics
     *
     * @param IRequest $request The request
     * @param IResponse $response The response
     * @param float $latency The latency of the request
     */
    private function recordRequestMetrics(IRequest $request, IResponse $response, float $latency): void
    {
        try {
            // Counter for total requests
            $counter = $this->registry->getOrRegisterCounter(
                'app',
                'http_requests_total',
                'Total HTTP requests',
                ['method', 'endpoint', 'status'],
            );
            $counter->inc([
                $request->method,
                self::getPathWithQueryString($request),
                (string) $response->statusCode->value,
            ]);

            // Histogram for request latency
            $histogram = $this->registry->getOrRegisterHistogram(
                'app',
                'http_request_duration_seconds',
                'HTTP request latency',
                ['method', 'endpoint'],
                [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
            );
            $histogram->observe($latency, [
                $request->method,
                self::getPathWithQueryString($request),
            ]);
        } catch (MetricsRegistrationException $ex) {
            // Swallow and log the exception to prevent metrics collection from breaking requests
            $this->logger->error($ex->getMessage(), ['exception' => $ex]);
        }
    }
}
