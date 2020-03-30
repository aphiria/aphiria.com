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
use Aphiria\Application\IModule;
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
use Aphiria\Net\Http\HttpException;
use App\Api\Middleware\Cors;
use App\Documentation\DocumentationModule;
use App\Web\WebModule;
use Exception;

/**
 * Defines the application configuration
 */
final class App implements IModule
{
    use AphiriaComponents;

    /**
     * Configures the application's modules and components
     *
     * @param IApplicationBuilder $appBuilder The builder that will build our app
     * @throws Exception Thrown if there was an error building the app
     */
    public function build(IApplicationBuilder $appBuilder): void
    {
        // Configure this app to use Aphiria components
        $this->withRouteAnnotations($appBuilder)
            ->withValidatorAnnotations($appBuilder)
            ->withCommandAnnotations($appBuilder)
            ->withBinders($appBuilder, [
                new ExceptionHandlerBinder(),
                new RequestBinder(),
                new SerializerBinder(),
                new ValidationBinder(),
                new ContentNegotiationBinder(),
                new ControllerBinder(),
                new RoutingBinder(),
                new CommandBinder()
            ]);

        // Configure logging levels for exceptions
        $this->withLogLevelFactory($appBuilder, HttpException::class, function (HttpException $ex) {
            return $ex->getResponse()->getStatusCode() >= 500 ? LogLevel::ERROR : LogLevel::DEBUG;
        });

        // Register any global middleware
        $this->withGlobalMiddleware($appBuilder, new MiddlewareBinding(Cors::class));

        // Register any modules
        $appBuilder->withModule(new DocumentationModule());
        $appBuilder->withModule(new WebModule());
    }
}
