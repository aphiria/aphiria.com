<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Console\Commands;

use Aphiria\Console\Commands\Attributes\Command;
use Aphiria\Console\Commands\ICommandHandler;
use Aphiria\Console\Input\Input;
use Aphiria\Console\Output\IOutput;
use Aphiria\Console\StatusCode;
use App\Documentation\DocumentationIndexer;
use App\Documentation\DownloadFailedException;
use App\Documentation\HtmlCompilationException;
use App\Documentation\Searching\IndexingFailedException;

/**
 * Defines the command handler for indexing docs
 */
#[Command('docs:index', description: 'Indexes our documentation for searchability')]
final class IndexDocsCommandHandler implements ICommandHandler
{
    /**
     * @param DocumentationIndexer $docIndexer The documentation indexer
     */
    public function __construct(private readonly DocumentationIndexer $docIndexer)
    {
    }

    /**
     * @inheritdoc
     */
    public function handle(Input $input, IOutput $output)
    {
        try {
            $this->docIndexer->indexDocs();
            $output->writeln('<success>Documentation indexed</success>');

            return StatusCode::Ok;
        } catch (DownloadFailedException | HtmlCompilationException | IndexingFailedException $ex) {
            $output->writeln('<fatal>Failed to index docs</fatal>');
            $output->writeln("<info>{$ex->getMessage()}</info>");
            $output->writeln("<info>{$ex->getTraceAsString()}</info>");

            return StatusCode::Fatal;
        }
    }
}
