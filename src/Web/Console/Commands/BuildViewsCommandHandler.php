<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web\Console\Commands;

use Aphiria\Console\Commands\Attributes\Command;
use Aphiria\Console\Commands\ICommandHandler;
use Aphiria\Console\Input\Input;
use Aphiria\Console\Output\IOutput;
use Aphiria\Console\StatusCodes;
use App\Web\ViewCompiler;
use League\Flysystem\FileExistsException;
use League\Flysystem\FileNotFoundException;

/**
 * Defines the command handler for building web views
 */
#[Command('views:build', description: 'Builds our views')]
final class BuildViewsCommandHandler implements ICommandHandler
{
    /**
     * @param ViewCompiler $viewCompiler The compiler for our views
     */
    public function __construct(private ViewCompiler $viewCompiler)
    {
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
        } catch (FileExistsException | FileNotFoundException $ex) {
            $output->writeln('<fatal>Failed to build views</fatal>');
            $output->writeln("<info>{$ex->getMessage()}</info>");
            $output->writeln("<info>{$ex->getTraceAsString()}</info>");

            return StatusCodes::FATAL;
        }
    }
}
