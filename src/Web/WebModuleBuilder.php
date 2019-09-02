<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web;

use Aphiria\Configuration\IApplicationBuilder;
use Aphiria\Configuration\IModuleBuilder;
use Aphiria\Console\Commands\CommandRegistry;
use Aphiria\DependencyInjection\IContainer;
use App\Web\Bootstrappers\ViewCompilerBootstrapper;
use App\Web\Console\Commands\BuildViewsCommand;
use App\Web\Console\Commands\BuildViewsCommandHandler;
use App\Web\Console\Commands\ServeCommand;
use App\Web\Console\Commands\ServeCommandHandler;

/**
 * Defines the module for our web code
 */
final class WebModuleBuilder implements IModuleBuilder
{
    /** @var IContainer The DI container that can resolve dependencies */
    private IContainer $container;

    /**
     * @param IContainer $container The DI container that can resolve dependencies
     */
    public function __construct(IContainer $container)
    {
        $this->container = $container;
    }

    /**
     * Builds the entire module into an application
     *
     * @param IApplicationBuilder $appBuilder The app builder to use
     */
    public function build(IApplicationBuilder $appBuilder): void
    {
        $appBuilder->withBootstrappers(fn () => [
            new ViewCompilerBootstrapper()
        ]);

        $appBuilder->withConsoleCommands(function (CommandRegistry $commands) {
            $commands->registerCommand(
                new BuildViewsCommand(),
                fn () => $this->container->resolve(BuildViewsCommandHandler::class)
            );

            $commands->registerCommand(
                new ServeCommand(),
                fn () => $this->container->resolve(ServeCommandHandler::class)
            );
        });
    }
}
