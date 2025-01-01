<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web\Console\Commands;

use Aphiria\Console\Commands\Attributes\Command;
use Aphiria\Console\Commands\ICommandHandler;
use Aphiria\Console\Input\Input;
use Aphiria\Console\Output\IOutput;
use Aphiria\Console\StatusCode;
use App\Web\ViewCompiler;
use League\Flysystem\FilesystemException;

/**
 * Defines the command handler for building web views
 */
#[Command('views:build', description: 'Builds our views')]
final class BuildViewsCommandHandler implements ICommandHandler
{
    /**
     * @param ViewCompiler $viewCompiler The compiler for our views
     */
    public function __construct(private readonly ViewCompiler $viewCompiler)
    {
    }

    /**
     * @inheritdoc
     */
    public function handle(Input $input, IOutput $output)
    {
        try {
            $this->viewCompiler->compileViews();
            $output->writeln('<success>Views built</success>');

            return StatusCode::Ok;
        } catch (FilesystemException $ex) {
            $output->writeln('<fatal>Failed to build views</fatal>');
            $output->writeln("<info>{$ex->getMessage()}</info>");
            $output->writeln("<info>{$ex->getTraceAsString()}</info>");

            return StatusCode::Fatal;
        }
    }
}
