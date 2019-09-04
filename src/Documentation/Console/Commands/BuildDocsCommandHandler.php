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
            $this->docs->buildDocs(array_key_exists('skip-indexing', $input->options));
            $output->writeln('<success>Documentation built</success>');
        } catch (FileSystemException | IndexingFailedException $ex) {
            $output->writeln('<fatal>Failed to build docs</fatal>');
            $output->writeln("<info>{$ex->getMessage()}</info>");
        }
    }
}
