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
use League\Flysystem\FileExistsException;
use League\Flysystem\FileNotFoundException;
use League\Flysystem\FilesystemInterface;
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
     * @param FilesystemInterface $files The file system helper
     */
    public function __construct(
        private readonly DocumentationMetadata $metadata,
        private readonly DocumentationDownloader $downloader,
        private readonly ParsedownExtra $markdownParser,
        private readonly ISearchIndex $searchIndex,
        private readonly string $htmlDocPath,
        private readonly FilesystemInterface $files
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
        // Only index the default version
        $htmlDocPath = "{$this->htmlDocPath}/{$this->metadata->getDefaultVersion()}";

        if (!$this->files->has($htmlDocPath)) {
            $this->buildDocs();
        }

        $htmlFilesToIndex = [];

        /** @var array{type: string, extension: string, path: string} $fileInfo */
        foreach ($this->files->listContents($htmlDocPath) as $fileInfo) {
            if (
                isset($fileInfo['type'], $fileInfo['extension'])
                && $fileInfo['type'] === 'file'
                && $fileInfo['extension'] === 'html'
            ) {
                $htmlFilesToIndex[] = (string)$fileInfo['path'];
            }
        }

        $this->searchIndex->buildSearchIndex($htmlFilesToIndex);
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
     * @return array<string, list<string>> The list of HTML doc file paths
     * @throws HtmlCompilationException Thrown if there was an error compiling the HTML docs
     */
    private function createHtmlDocs(array $markdownFilePathsByBranch): array
    {
        $htmlFiles = [];

        foreach ($markdownFilePathsByBranch as $branch => $markdownFilePaths) {
            $htmlFiles[$branch] = [];
            $branchDocDir = "$this->htmlDocPath/$branch";

            if ($this->files->has($branchDocDir) && !$this->files->deleteDir($branchDocDir)) {
                throw new HtmlCompilationException("Failed to delete directory $branchDocDir");
            }

            if (!$this->files->createDir($branchDocDir)) {
                throw new HtmlCompilationException("Failed to create directory $branchDocDir");
            }

            foreach ($markdownFilePaths as $markdownFilePath) {
                try {
                    $markdownFilename = \pathinfo($markdownFilePath, PATHINFO_FILENAME);
                    $htmlDocFilename = "$branchDocDir/$markdownFilename.html";
                    $html = (string)$this->markdownParser->text($this->files->read($markdownFilePath));
                    // Rewrite the links to point to the HTML docs on the site
                    $html = \preg_replace('/<a href="([^"]+)\.md(#[^"]+)?"/', '<a href="$1.html$2"', $html);
                    $this->files->write($htmlDocFilename, $html);
                    $htmlFiles[$branch][] = $htmlDocFilename;
                } catch (FileNotFoundException $ex) {
                    throw new HtmlCompilationException("File {$ex->getPath()} not found", 0, $ex);
                } catch (FileExistsException $ex) {
                    throw new HtmlCompilationException("File {$ex->getPath()} already exists", 0, $ex);
                }
            }
        }

        return $htmlFiles;
    }
}
