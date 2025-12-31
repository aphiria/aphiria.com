<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Monitoring\Controllers;

use Aphiria\Api\Controllers\Controller;
use Aphiria\Authentication\Attributes\Authenticate;
use Aphiria\Net\Http\Headers;
use Aphiria\Net\Http\IResponse;
use Aphiria\Net\Http\Response;
use Aphiria\Net\Http\StringBody;
use Aphiria\Routing\Attributes\Get;
use Prometheus\RegistryInterface;
use Prometheus\RenderTextFormat;

/**
 * Defines the controller for exposing Prometheus metrics
 */
final class PrometheusMetricsController extends Controller
{
    /**
     * @param RegistryInterface $registry The Prometheus collector registry
     */
    public function __construct(private readonly RegistryInterface $registry) {}

    /**
     * Exposes Prometheus metrics in text format
     *
     * @return IResponse The response containing metrics
     */
    #[Get('metrics')]
    #[Authenticate('prometheus')]
    public function getMetrics(): IResponse
    {
        $renderer = new RenderTextFormat();
        $metricsText = $renderer->render($this->registry->getMetricFamilySamples());

        $headers = new Headers();
        $headers->add('Content-Type', RenderTextFormat::MIME_TYPE);

        return new Response(
            200,
            $headers,
            new StringBody($metricsText),
        );
    }
}
