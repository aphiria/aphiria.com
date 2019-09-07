<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Console\Commands;

use Aphiria\Console\Commands\ICommandBus;
use Aphiria\Console\Commands\ICommandHandler;
use Aphiria\Console\Input\Input;
use Aphiria\Console\Output\IOutput;
use Aphiria\IO\FileSystemException;
use App\Documentation\DocumentationService;
use App\Documentation\Searching\IndexingFailedException;

/**
 * Defines the command handler for doc building
 */
final class BuildDocsCommandHandler implements ICommandHandler
{
    /** @var DocumentationService The doc service */
    private DocumentationService $docs;
    /** @var ICommandBus What we can use to call other commands */
    private ICommandBus $commands;

    /**
     * @param DocumentationService $docs The doc service
     * @param ICommandBus $commands What we can use to call other commands
     */
    public function __construct(DocumentationService $docs, ICommandBus $commands)
    {
        $this->docs = $docs;
        $this->commands = $commands;
    }

    /**
     * @inheritdoc
     */
    public function handle(Input $input, IOutput $output)
    {
        try {
            $this->docs->buildDocs();
            $output->writeln('<success>Documentation built</success>');
            // Building our docs should always result in rebuilding the views
            $this->commands->handle('views:build', $output);
        } catch (FileSystemException | IndexingFailedException $ex) {
            $output->writeln('<fatal>Failed to build docs</fatal>');
            $output->writeln("<info>{$ex->getMessage()}</info>");
        }
    }
}
