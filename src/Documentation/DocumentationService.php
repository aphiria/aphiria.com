<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2022 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation;

use App\Documentation\Searching\IndexingFailedException;
use App\Documentation\Searching\ISearchIndex;
use App\Documentation\Searching\SearchResult;
use League\Flysystem\FilesystemException;
use League\Flysystem\FilesystemOperator;
use League\Flysystem\StorageAttributes;
use ParsedownExtra;

/**
 * Defines the service that handles our documentation
 */
final class DocumentationService
{
    /**
     * @param DocumentationMetadata $metadata The doc metadata
     * @param DocumentationDownloader $downloader The doc downloader
     * @param ParsedownExtra $markdownParser The Markdown parser
     * @param ISearchIndex $searchIndex The doc search index
     * @param string $htmlDocPath The path to store HTML docs in
     * @param FilesystemOperator $files The file system helper
     */
    public function __construct(
        private readonly DocumentationMetadata $metadata,
        private readonly DocumentationDownloader $downloader,
        private readonly ParsedownExtra $markdownParser,
        private readonly ISearchIndex $searchIndex,
        private readonly string $htmlDocPath,
        private readonly FilesystemOperator $files
    ) {
    }

    /**
     * Builds our documentation, which includes cloning it and compiling the Markdown
     *
     * @throws DownloadFailedException Thrown if there was a problem downloading the documentation
     * @throws HtmlCompilationException Thrown if the docs could not be built
     */
    public function buildDocs(): void
    {
        $markdownFilePathsByBranch = $this->downloader->downloadDocs();
        $this->createHtmlDocs($markdownFilePathsByBranch);
    }

    /**
     * Indexes our docs for searching
     *
     * @throws IndexingFailedException Thrown if there was an error creating an index
     * @throws DownloadFailedException Thrown if the docs had not been built and failed to be downloaded
     * @throws HtmlCompilationException Thrown if the docs had not been built and failed to be compiled
     */
    public function indexDocs(): void
    {
        try {
            // Only index the default version
            $htmlDocsPath = "$this->htmlDocPath/{$this->metadata->getDefaultVersion()}";

            if (!$this->files->has($htmlDocsPath)) {
                $this->buildDocs();
            }

            $htmlFilesToIndex = [];
            /** @var list<string> $htmlDocPaths */
            $htmlDocPaths = $this->files->listContents($htmlDocsPath)
                ->filter(fn (StorageAttributes $attributes) => $attributes->isFile() && \str_ends_with($attributes->path(), '.html'))
                ->map(fn (StorageAttributes $attributes) => $attributes->path())
                ->toArray();

            foreach ($htmlDocPaths as $htmlDocPath) {
                $htmlFilesToIndex[] = $htmlDocPath;
            }

            $this->searchIndex->buildSearchIndex($htmlFilesToIndex);
        } catch (FilesystemException $ex) {
            throw new IndexingFailedException('Failed to index documents', 0, $ex);
        }
    }

    /**
     * Searches the documentation with a query
     *
     * @param string $query The raw search query
     * @return list<SearchResult> The list of search results
     */
    public function searchDocs(string $query): array
    {
        return $this->searchIndex->query($query);
    }

    /**
     * Creates HTML docs from Markdown files
     *
     * @param array<string, list<string>> $markdownFilePathsByBranch The mapping of branches to Markdown file paths to create HTML docs from
     * @throws HtmlCompilationException Thrown if there was an error compiling the HTML docs
     */
    private function createHtmlDocs(array $markdownFilePathsByBranch): void
    {
        try {
            foreach ($markdownFilePathsByBranch as $branch => $markdownFilePaths) {
                $branchDocDir = "$this->htmlDocPath/$branch";

                if ($this->files->has($branchDocDir)) {
                    $this->files->deleteDirectory($branchDocDir);
                }

                $this->files->createDirectory($branchDocDir);

                foreach ($markdownFilePaths as $markdownFilePath) {
                    $markdownFilename = \pathinfo($markdownFilePath, PATHINFO_FILENAME);
                    $htmlDocFilename = "$branchDocDir/$markdownFilename.html";
                    $html = (string)$this->markdownParser->text($this->files->read($markdownFilePath));
                    // Rewrite the links to point to the HTML docs on the site
                    $html = \preg_replace('/<a href="([^"]+)\.md(#[^"]+)?"/', '<a href="$1.html$2"', $html);
                    $this->files->write($htmlDocFilename, $html);
                }
            }
        } catch (FilesystemException $ex) {
            throw new HtmlCompilationException('Failed to write HTML to file', 0, $ex);
        }
    }
}
