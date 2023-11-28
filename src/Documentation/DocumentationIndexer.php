<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2023 David Young
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

/**
 * Defines the documentation indexer
 */
final class DocumentationIndexer
{
    /**
     * @param DocumentationMetadata $metadata The doc metadata
     * @param ISearchIndex $searchIndex The doc search index
     * @param string $htmlDocPath The path to store HTML docs in
     * @param FilesystemOperator $files The file system helper
     */
    public function __construct(
        private readonly DocumentationMetadata $metadata,
        private readonly DocumentationBuilder $builder,
        private readonly ISearchIndex $searchIndex,
        private readonly string $htmlDocPath,
        private readonly FilesystemOperator $files
    ) {
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
                $this->builder->buildDocs();
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

            if (empty($htmlFilesToIndex)) {
                throw new IndexingFailedException('There are no documents to index');
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
}
