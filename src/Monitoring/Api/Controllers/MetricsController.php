<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Monitoring\Api\Controllers;

use Aphiria\Api\Controllers\Controller;
use Aphiria\Net\Http\Headers;
use Aphiria\Net\Http\IResponse;
use Aphiria\Net\Http\Response;
use Aphiria\Net\Http\StringBody;
use Aphiria\Routing\Attributes\Get;
use Prometheus\RegistryInterface;
use Prometheus\RenderTextFormat;
use Throwable;

/**
 * Defines the metrics controller
 */
final class MetricsController extends Controller
{
    /**
     * @param RegistryInterface $registry The Prometheus registry we log metrics to
     */
    public function __construct(private readonly RegistryInterface $registry) {}

    /**
     * Gets the Prometheus metrics
     *
     * @return IResponse The Prometheus metrics
     * @throws Throwable Thrown if the metrics could not be rendered
     */
    #[Get('metrics')]
    // TODO: Add auth
    public function getMetrics(): IResponse
    {
        $renderer = new RenderTextFormat();
        $metrics  = $this->registry->getMetricFamilySamples();
        $headers = new Headers();
        $headers->add('Content-Type', RenderTextFormat::MIME_TYPE);

        // Intentionally do not use content negotiation due to the custom MIME type
        return new Response(headers: $headers, body: new StringBody($renderer->render($metrics)));
    }
}
