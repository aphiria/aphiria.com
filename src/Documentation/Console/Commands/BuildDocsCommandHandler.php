<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Console\Commands;

use Aphiria\Console\Commands\Attributes\Command;
use Aphiria\Console\Commands\ICommandHandler;
use Aphiria\Console\Input\Input;
use Aphiria\Console\Output\IOutput;
use Aphiria\Console\StatusCodes;
use App\Documentation\DocumentationService;
use App\Documentation\DownloadFailedException;
use App\Documentation\HtmlCompilationException;
use App\Documentation\Searching\IndexingFailedException;

/**
 * Defines the command handler for doc building
 */
#[Command('docs:build', description: 'Builds our documentation into HTML')]
final class BuildDocsCommandHandler implements ICommandHandler
{
    /**
     * @param DocumentationService $docs The doc service
     */
    public function __construct(private DocumentationService $docs)
    {
    }

    /**
     * @inheritdoc
     */
    public function handle(Input $input, IOutput $output)
    {
        try {
            $this->docs->buildDocs();
            $output->writeln('<success>Documentation built</success>');

            return StatusCodes::OK;
        } catch (DownloadFailedException | HtmlCompilationException | IndexingFailedException $ex) {
            $output->writeln('<fatal>Failed to build docs</fatal>');
            $output->writeln("<info>{$ex->getMessage()}</info>");
            $output->writeln("<info>{$ex->getTraceAsString()}</info>");

            return StatusCodes::FATAL;
        }
    }
}
