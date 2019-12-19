<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web\Console\Commands;

use Aphiria\Console\Commands\Annotations\Command;
use Aphiria\Console\Commands\ICommandHandler;
use Aphiria\Console\Input\Input;
use Aphiria\Console\Output\IOutput;
use Aphiria\IO\FileSystemException;
use App\Web\ViewCompiler;

/**
 * Defines the command handler for building web views
 *
 * @Command("views:build", description="Builds our views")
 */
final class BuildViewsCommandHandler implements ICommandHandler
{
    /** @var ViewCompiler The compiler for our views */
    private ViewCompiler $viewCompiler;

    /**
     * @param ViewCompiler $viewCompiler The compiler for our views
     */
    public function __construct(ViewCompiler $viewCompiler)
    {
        $this->viewCompiler = $viewCompiler;
    }

    /**
     * Handles a command
     *
     * @param Input $input The input to handle
     * @param IOutput $output The output to write to
     * @return int|void The status code if there was one, or void, which assumes an status code of 0
     */
    public function handle(Input $input, IOutput $output)
    {
        try {
            $this->viewCompiler->compileViews();
            $output->writeln('<success>Views built</success>');
        } catch (FileSystemException $ex) {
            $output->writeln('<fatal>Failed to build views</fatal>');
            $output->writeln("<info>{$ex->getMessage()}</info>");
        }
    }
}
