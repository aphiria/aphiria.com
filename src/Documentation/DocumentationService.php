<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation;

use Aphiria\IO\FileSystem;
use Aphiria\IO\FileSystemException;
use App\Documentation\Searching\IndexingFailedException;
use App\Documentation\Searching\ISearchIndex;
use App\Documentation\Searching\SearchResult;
use ParsedownExtra;

/**
 * Defines the service that handles our documentation
 */
final class DocumentationService
{
    /** @var DocumentationMetadata The metadata about our docs */
    private DocumentationMetadata $metadata;
    /** @var DocumentationDownloader The doc downloader */
    private DocumentationDownloader $downloader;
    /** @var ParsedownExtra The Markdown parser */
    private ParsedownExtra $markdownParser;
    /** @var ISearchIndex The doc search index */
    private ISearchIndex $searchIndex;
    /** @var string The path to store HTML docs in */
    private string $htmlDocPath;
    /** @var FileSystem The file helper */
    private FileSystem $files;

    /**
     * @param DocumentationMetadata $metadata The doc metadata
     * @param DocumentationDownloader $downloader The doc downloader
     * @param ParsedownExtra $markdownParser The Markdown parser
     * @param ISearchIndex $searchIndex The doc search index
     * @param string $htmlDocPath The path to store HTML docs in
     */
    public function __construct(
        DocumentationMetadata $metadata,
        DocumentationDownloader $downloader,
        ParsedownExtra $markdownParser,
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
     * Builds our documentation, which includes cloning it and compiling the Markdown
     *
     * @throws FileSystemException Thrown if there was an error reading or writing to the file system
     */
    public function buildDocs(): void
    {
        $markdownFilesByBranch = $this->downloader->downloadDocs();
        $this->createHtmlDocs($markdownFilesByBranch);
    }

    /**
     * Indexes our docs for searching
     *
     * @throws IndexingFailedException Thrown if there was an error creating an index
     * @throws FileSystemException Thrown if there was an error reading or writing to the file system
     */
    public function indexDocs(): void
    {
        // Only index the default version
        $htmlDocPath = "{$this->htmlDocPath}/{$this->metadata->getDefaultVersion()}";

        if (!$this->files->exists($htmlDocPath)) {
            $this->buildDocs();
        }

        $htmlFilesToIndex = $this->files->glob("$htmlDocPath/*.html");
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
                // Rewrite the links to point to the HTML docs on the site
                $html = preg_replace('/<a href="([^"]+)\.md(#[^"]+)?"/', '<a href="$1.html$2"', $html);
                $this->files->write($htmlDocFilename, $html);
                $htmlFiles[$branch][] = $htmlDocFilename;
            }
        }

        return $htmlFiles;
    }
}
