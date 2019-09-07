<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/app/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation;

use Aphiria\Configuration\IApplicationBuilder;
use Aphiria\Configuration\IModuleBuilder;
use Aphiria\Console\Commands\CommandRegistry;
use Aphiria\DependencyInjection\IContainer;
use App\Databases\Bootstrappers\SqlBootstrapper;
use App\Documentation\Bootstrappers\DocumentationBootstrapper;
use App\Documentation\Console\Commands\BuildDocsCommand;
use App\Documentation\Console\Commands\BuildDocsCommandHandler;
use App\Documentation\Console\Commands\IndexDocsCommand;
use App\Documentation\Console\Commands\IndexDocsCommandHandler;

/**
 * Defines the documentation module builder
 */
final class DocumentationModuleBuilder implements IModuleBuilder
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
     * @inheritdoc
     */
    public function build(IApplicationBuilder $appBuilder): void
    {
        $appBuilder->withBootstrappers(fn () => [
            new SqlBootstrapper(),
            new DocumentationBootstrapper()
        ]);

        $appBuilder->withConsoleCommands(function (CommandRegistry $commands) {
            $commands->registerCommand(
                new BuildDocsCommand(),
                fn () => $this->container->resolve(BuildDocsCommandHandler::class)
            );
            $commands->registerCommand(
                new IndexDocsCommand(),
                fn () => $this->container->resolve(IndexDocsCommandHandler::class)
            );
        });
    }
}
