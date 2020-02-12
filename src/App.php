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

use Aphiria\Configuration\Builders\AphiriaComponentBuilder;
use Aphiria\Configuration\Builders\IApplicationBuilder;
use Aphiria\Configuration\Framework\Api\Bootstrappers\ControllerBootstrapper;
use Aphiria\Configuration\Framework\Console\Bootstrappers\CommandBootstrapper;
use Aphiria\Configuration\Framework\Exceptions\Bootstrappers\ExceptionHandlerBootstrapper;
use Aphiria\Configuration\Framework\Logging\Bootstrappers\LoggerBootstrapper;
use Aphiria\Configuration\Framework\Net\Bootstrappers\ContentNegotiatorBootstrapper;
use Aphiria\Configuration\Framework\Routing\Bootstrappers\RoutingBootstrapper;
use Aphiria\Configuration\Framework\Serialization\Bootstrappers\SerializerBootstrapper;
use Aphiria\Configuration\Framework\Validation\Bootstrappers\ValidationBootstrapper;
use Aphiria\Configuration\Middleware\MiddlewareBinding;
use Aphiria\DependencyInjection\IContainer;
use App\Api\Middleware\Cors;
use App\Documentation\DocumentationModuleBuilder;
use App\Web\WebModuleBuilder;

/**
 * Defines the application configuration
 */
final class App
{
    /** @var IApplicationBuilder The app builder to use when configuring the application */
    private IApplicationBuilder $appBuilder;
    /** @var IContainer The DI container that can resolve dependencies */
    private IContainer $container;

    /**
     * @param IApplicationBuilder $appBuilder The app builder to use when configuring the application
     * @param IContainer $container The DI container that can resolve dependencies
     */
    public function __construct(IApplicationBuilder $appBuilder, IContainer $container)
    {
        $this->appBuilder = $appBuilder;
        $this->container = $container;
    }

    /**
     * Configures the application's modules
     */
    public function configure(): void
    {
        // Configure this app to use Aphiria components
        (new AphiriaComponentBuilder($this->container))
            ->withExceptionHandlers($this->appBuilder)
            ->withExceptionLogLevelFactories($this->appBuilder)
            ->withExceptionResponseFactories($this->appBuilder)
            ->withEncoderComponent($this->appBuilder)
            ->withRoutingComponent($this->appBuilder)
            ->withRoutingAnnotations($this->appBuilder)
            ->withConsoleAnnotations($this->appBuilder)
            ->withValidationComponent($this->appBuilder)
            ->withValidationAnnotations($this->appBuilder);

        // Register some global bootstrappers
        $this->appBuilder->withBootstrappers(fn () => [
            new SerializerBootstrapper,
            new ExceptionHandlerBootstrapper,
            new LoggerBootstrapper,
            new ContentNegotiatorBootstrapper,
            new ControllerBootstrapper,
            new ValidationBootstrapper,
            new RoutingBootstrapper,
            new CommandBootstrapper
        ]);

        // Register any global middleware
        $this->appBuilder->withGlobalMiddleware(fn () => [
            new MiddlewareBinding(Cors::class)
        ]);

        // Register any modules
        $this->appBuilder->withModule(new DocumentationModuleBuilder());
        $this->appBuilder->withModule(new WebModuleBuilder());
    }
}
