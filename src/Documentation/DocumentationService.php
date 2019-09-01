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
use App\Documentation\Searching\ISearchIndex;
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
    /** @var ISearchIndex The doc search index */
    private ISearchIndex $searchIndex;
    /** @var string The path to store HTML docs in */
    private string $htmlDocPath;
    /** @var FileSystem The file helper */
    private FileSystem $files;

    /**
     * @param DocumentationMetadata $metadata The doc metadata
     * @param DocumentationDownloader $downloader The doc downloader
     * @param Parsedown $markdownParser The Markdown parser
     * @param ISearchIndex $searchIndex The doc search index
     * @param string $htmlDocPath The path to store HTML docs in
     */
    public function __construct(
        DocumentationMetadata $metadata,
        DocumentationDownloader $downloader,
        Parsedown $markdownParser,
        ISearchIndex $searchIndex,
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
     * Builds our documentation, which includes cloning it, compiling the Markdown, and indexing it
     *
     * @throws FileSystemException Thrown if there was an error reading or writing to the file system
     * @throws IndexingFailedException Thrown if there was an error creating an index
     */
    public function buildDocs(): void
    {
        $markdownFilesByBranch = $this->downloader->downloadDocs();
        $htmlFilesByBranch = $this->createHtmlDocs($markdownFilesByBranch);
        $htmlFilesToIndex = $htmlFilesByBranch[$this->metadata->getDefaultBranch()];
        $this->searchIndex->buildSearchIndex($htmlFilesToIndex);
    }

    /**
     * Searches the documentation with a query
     *
     * @param string $query The raw search query
     * @return SearchResult[] The list of search results
     */
    public function searchDocs(string $query): array
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
            $branchDocDir = "$this->htmlDocPath/$branch";

            if ($this->files->exists($branchDocDir)) {
                $this->files->deleteDirectory($branchDocDir);
            }

            $this->files->makeDirectory($branchDocDir);

            foreach ($markdownFiles as $markdownFile) {
                $htmlDocFilename = "$branchDocDir/{$this->files->getFileName($markdownFile)}.html";
                $html = $this->markdownParser->text($this->files->read($markdownFile));
                $this->files->write($htmlDocFilename, $html);
                $htmlFiles[$branch][] = $htmlDocFilename;
            }
        }

        return $htmlFiles;
    }
}
