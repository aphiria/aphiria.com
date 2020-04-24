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

use Aphiria\Console\Commands\Annotations\Command;
use Aphiria\Console\Commands\ICommandHandler;
use Aphiria\Console\Input\Input;
use Aphiria\Console\Output\IOutput;
use Aphiria\Console\StatusCodes;
use App\Documentation\DocumentationService;
use App\Documentation\DownloadFailedException;
use App\Documentation\HtmlCompilationException;
use App\Documentation\Searching\IndexingFailedException;

/**
 * Defines the command handler for indexing docs
 *
 * @Command("docs:index", description="Indexes our documentation for searchability")
 */
final class IndexDocsCommandHandler implements ICommandHandler
{
    /** @var DocumentationService The doc service */
    private DocumentationService $docs;

    /**
     * @param DocumentationService $docs The doc service
     */
    public function __construct(DocumentationService $docs)
    {
        $this->docs = $docs;
    }

    /**
     * @inheritdoc
     */
    public function handle(Input $input, IOutput $output)
    {
        try {
            $this->docs->indexDocs();
            $output->writeln('<success>Documentation indexed</success>');

            return StatusCodes::OK;
        } catch (DownloadFailedException | HtmlCompilationException | IndexingFailedException $ex) {
            $output->writeln('<fatal>Failed to index docs</fatal>');
            $output->writeln("<info>{$ex->getMessage()}</info>");

            return StatusCodes::FATAL;
        }
    }
}
