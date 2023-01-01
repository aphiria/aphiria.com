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

use League\Flysystem\FilesystemException;
use League\Flysystem\FilesystemOperator;
use League\Flysystem\StorageAttributes;

/**
 * Defines the documentation downloader
 */
final class DocumentationDownloader
{
    /** The GitHub docs repository */
    private const GITHUB_REPOSITORY = 'https://github.com/aphiria/docs.git';

    /**
     * @param list<string> $branches The branches to download
     * @param string $clonedDocAbsolutePath The absolute path to the cloned documentation
     * @param string $clonedDocRelativePath The relative path to the cloned documentation
     * @param FilesystemOperator $files The file system helper
     */
    public function __construct(
        private readonly array $branches,
        private readonly string $clonedDocAbsolutePath,
        private readonly string $clonedDocRelativePath,
        private readonly FilesystemOperator $files
    ) {
    }

    /**
     * Downloads all of our documentation
     *
     * @return array<string, list<string>> The mapping of branch names to local file paths created by the downloads
     * @throws DownloadFailedException Thrown if there was any error reading or writing to the file system
     */
    public function downloadDocs(): array
    {
        try {
            $markdownFiles = [];

            foreach ($this->branches as $branch) {
                $markdownFiles[$branch] = [];
                $rawDocsPath = "$this->clonedDocRelativePath/$branch";

                if ($this->files->has($rawDocsPath)) {
                    $this->deleteDir($rawDocsPath);
                }

                $this->files->createDirectory($rawDocsPath);

                // Clone the branch from GitHub into our temporary directory
                /** @psalm-suppress ForbiddenCode We are purposely allowing this call */
                \shell_exec(
                    \sprintf(
                        'git clone -b %s --single-branch %s "%s"',
                        $branch,
                        self::GITHUB_REPOSITORY,
                        $this->clonedDocAbsolutePath . "/$branch"
                    )
                );

                // Delete the .git directory so we don't get multiple VCS roots registered
                $this->deleteDir("$this->clonedDocRelativePath/$branch/.git");
                /** @var list<string> $markdownFilePaths */
                $markdownFilePaths = $this->files->listContents($rawDocsPath)
                    ->filter(fn (StorageAttributes $attributes) => $attributes->isFile() && \str_ends_with($attributes->path(), '.md'))
                    ->map(fn (StorageAttributes $attributes) => $attributes->path())
                    ->toArray();

                foreach ($markdownFilePaths as $markdownFilePath) {
                    $markdownFiles[$branch][] = $markdownFilePath;
                }

                if (\count($markdownFiles[$branch]) === 0) {
                    throw new DownloadFailedException("Failed to download docs for branch $branch");
                }
            }

            return $markdownFiles;
        } catch (FilesystemException $ex) {
            throw new DownloadFailedException('Failed to download docs', 0, $ex);
        }
    }

    /**
     * Deletes a directory recursively
     *
     * @param string $dir The path to the directory to delete
     * @throws DownloadFailedException Thrown if the directory could not be deleted
     */
    private function deleteDir(string $dir): void
    {
        try {
            /** @var list<string> $contentPaths */
            $contentPaths = $this->files->listContents($dir, true)
                ->filter(fn (StorageAttributes $attributes) => $attributes->isFile() || $attributes->isDir())
                ->map(fn (StorageAttributes $attributes) => $attributes->path())
                ->toArray();

            foreach ($contentPaths as $contentPath) {
                $this->files->setVisibility($contentPath, 'public');
            }

            $this->files->deleteDirectory($dir);
        } catch (FilesystemException $ex) {
            throw new DownloadFailedException('Failed to set visibility', 0, $ex);
        }
    }
}
