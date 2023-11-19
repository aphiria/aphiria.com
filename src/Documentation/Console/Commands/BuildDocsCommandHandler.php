<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2023 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Console\Commands;

use Aphiria\Console\Commands\Attributes\Command;
use Aphiria\Console\Commands\ICommandHandler;
use Aphiria\Console\Input\Input;
use Aphiria\Console\Output\IOutput;
use Aphiria\Console\StatusCode;
use App\Documentation\DocumentationBuilder;
use App\Documentation\DocumentationIndexer;
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
     * @param DocumentationBuilder $docBuilder The documentation builder
     */
    public function __construct(private readonly DocumentationBuilder $docBuilder)
    {
    }

    /**
     * @inheritdoc
     */
    public function handle(Input $input, IOutput $output)
    {
        try {
            $this->docBuilder->buildDocs();
            $output->writeln('<success>Documentation built</success>');

            return StatusCode::Ok;
        } catch (DownloadFailedException | HtmlCompilationException $ex) {
            $output->writeln('<fatal>Failed to build docs</fatal>');
            $output->writeln("<info>{$ex->getMessage()}</info>");
            $output->writeln("<info>{$ex->getTraceAsString()}</info>");

            return StatusCode::Fatal;
        }
    }
}
