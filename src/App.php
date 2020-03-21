<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App;

use Aphiria\Application\Builders\IApplicationBuilder;
use Aphiria\Framework\Api\Binders\ControllerBinder;
use Aphiria\Framework\Application\AphiriaComponents;
use Aphiria\Framework\Console\Binders\CommandBinder;
use Aphiria\Framework\Exceptions\Binders\ExceptionHandlerBinder;
use Aphiria\Framework\Net\Binders\ContentNegotiationBinder;
use Aphiria\Framework\Net\Binders\RequestBinder;
use Aphiria\Framework\Routing\Binders\RoutingBinder;
use Aphiria\Framework\Serialization\Binders\SerializerBinder;
use Aphiria\Framework\Validation\Binders\ValidationBinder;
use Aphiria\Middleware\MiddlewareBinding;
use App\Api\Middleware\Cors;
use App\Documentation\DocumentationModule;
use App\Web\WebModule;

/**
 * Defines the application configuration
 */
final class App
{
    use AphiriaComponents;

    /** @var IApplicationBuilder The app builder to use when configuring the application */
    private IApplicationBuilder $appBuilder;

    /**
     * @param IApplicationBuilder $appBuilder The app builder to use when configuring the application
     */
    public function __construct(IApplicationBuilder $appBuilder)
    {
        $this->appBuilder = $appBuilder;
    }

    /**
     * Configures the application's modules
     */
    public function configure(): void
    {
        // Configure this app to use Aphiria components
        $this->withRouteAnnotations($this->appBuilder)
            ->withValidatorAnnotations($this->appBuilder)
            ->withCommandAnnotations($this->appBuilder)
            ->withBinders($this->appBuilder, [
                new ExceptionHandlerBinder(),
                new RequestBinder(),
                new SerializerBinder(),
                new ValidationBinder(),
                new ContentNegotiationBinder(),
                new ControllerBinder(),
                new RoutingBinder(),
                new CommandBinder()
            ]);

        // Register any global middleware
        $this->withGlobalMiddleware($this->appBuilder, new MiddlewareBinding(Cors::class));

        // Register any modules
        $this->appBuilder->withModule(new DocumentationModule());
        $this->appBuilder->withModule(new WebModule());
    }
}
