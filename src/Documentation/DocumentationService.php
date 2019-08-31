<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation;

use Aphiria\IO\FileSystem;
use Aphiria\IO\FileSystemException;
use App\Documentation\Searching\IndexingFailedException;
use App\Documentation\Searching\SearchIndex;
use App\Documentation\Searching\SearchResult;
use Parsedown;

/**
 * Defines the service that handles our documentation
 */
final class DocumentationService
{
    /** @var DocumentationMetadata The metadata about our docs */
    private DocumentationMetadata $metadata;
    /** @var DocumentationDownloader The doc downloader */
    private DocumentationDownloader $downloader;
    /** @var Parsedown The Markdown parser */
    private Parsedown $markdownParser;
    /** @var SearchIndex The doc search index */
    private SearchIndex $searchIndex;
    /** @var string The path to store HTML docs in */
    private string $htmlDocPath;
    /** @var FileSystem The file helper */
    private FileSystem $files;

    /**
     * @param DocumentationMetadata $metadata The doc metadata
     * @param DocumentationDownloader $downloader The doc downloader
     * @param Parsedown $markdownParser The Markdown parser
     * @param SearchIndex $searchIndex The doc search index
     * @param string $htmlDocPath The path to store HTML docs in
     */
    public function __construct(
        DocumentationMetadata $metadata,
        DocumentationDownloader $downloader,
        Parsedown $markdownParser,
        SearchIndex $searchIndex,
        string $htmlDocPath
    ) {
        $this->metadata = $metadata;
        $this->downloader = $downloader;
        $this->markdownParser = $markdownParser;
        $this->searchIndex = $searchIndex;
        $this->htmlDocPath = $htmlDocPath;
        $this->files = new FileSystem();
    }

    /**
     * Creates our documentation, which includes cloning it, compiling the Markdown, and indexing it
     *
     * @throws FileSystemException Thrown if there was an error reading or writing to the file system
     * @throws IndexingFailedException Thrown if there was an error creating an index
     */
    public function createDocs(): void
    {
        $markdownFilesByBranch = $this->downloader->downloadDocs();
        $htmlFilesByBranch = $this->createHtmlDocs($markdownFilesByBranch);
        $htmlFilesToIndex = $htmlFilesByBranch[$this->metadata->getDefaultBranch()];

        foreach ($htmlFilesToIndex as $htmlFile) {
            $filename = \pathinfo($htmlFile, \PATHINFO_FILENAME);
            $this->searchIndex->buildSearchIndex($filename, $this->files->read($htmlFile));
        }
    }

    /**
     * Searches the documentation with a query
     *
     * @param string $query The raw search query
     * @return SearchResult[] The list of search results
     */
    public function search(string $query): array
    {
        return $this->searchIndex->query($query);
    }

    /**
     * Creates HTML docs from Markdown files
     *
     * @param string[] $markdownFilesByBranch The mapping of branches to Markdown file paths to create HTML docs from
     * @return string[] The list of HTML doc file paths
     * @throws FileSystemException Thrown if there was an error reading or writing to the file system
     */
    private function createHtmlDocs(array $markdownFilesByBranch): array
    {
        $htmlFiles = [];

        foreach ($markdownFilesByBranch as $branch => $markdownFiles) {
            $htmlFiles[$branch] = [];

            foreach ($markdownFiles as $markdownFile) {
                $html = $this->markdownParser->text($this->files->read($markdownFile));
                $compiledDocFilename = sprintf(
                    '%s/%s/%s.html',
                    $this->htmlDocPath,
                    $branch,
                    $this->files->getFileName($markdownFile)
                );
                $this->files->write($compiledDocFilename, $html);
                $htmlFiles[$branch][] = $compiledDocFilename;
            }
        }

        return $htmlFiles;
    }
}
