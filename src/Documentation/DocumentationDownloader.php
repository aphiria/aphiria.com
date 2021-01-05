<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2021 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation;

use League\Flysystem\FileNotFoundException;
use League\Flysystem\FilesystemInterface;
use RuntimeException;

/**
 * Defines the documentation downloader
 */
final class DocumentationDownloader
{
    /** The GitHub docs repository */
    private const GITHUB_REPOSITORY = 'https://github.com/aphiria/docs.git';

    /**
     * @param string[] $branches The branches to download
     * @param string $clonedDocAbsolutePath The absolute path to the cloned documentation
     * @param string $clonedDocRelativePath The relative path to the cloned documentation
     * @param FilesystemInterface $files The file system helper
     */
    public function __construct(
        private array $branches,
        private string $clonedDocAbsolutePath,
        private string $clonedDocRelativePath,
        private FilesystemInterface $files
    ) {
    }

    /**
     * Downloads all of our documentation
     *
     * @return array<string, string[]> The mapping of branch names to local file paths created by the downloads
     * @throws DownloadFailedException Thrown if there was any error reading or writing to the file system
     */
    public function downloadDocs(): array
    {
        $markdownFiles = [];

        foreach ($this->branches as $branch) {
            $markdownFiles[$branch] = [];
            $rawDocsPath = "{$this->clonedDocRelativePath}/$branch";

            if ($this->files->has($rawDocsPath)) {
                $this->deleteDir($rawDocsPath);
            }

            if (!$this->files->createDir($rawDocsPath)) {
                throw new DownloadFailedException("Failed to create directory $rawDocsPath");
            }

            // Clone the branch from GitHub into our temporary directory
            /** @psalm-suppress ForbiddenCode We are purposely allowing this call */
            \shell_exec(
                sprintf(
                    'git clone -b %s --single-branch %s %s',
                    $branch,
                    self::GITHUB_REPOSITORY,
                    $this->clonedDocAbsolutePath . "/$branch"
                )
            );

            // Delete the .git directory so we don't get multiple VCS roots registered
            $this->deleteDir("{$this->clonedDocRelativePath}/$branch/.git");

            /** @var array{type: string, extension: string, path: string} $fileInfo */
            foreach ($this->files->listContents($rawDocsPath) as $fileInfo) {
                if (
                    isset($fileInfo['type'], $fileInfo['extension'])
                    && $fileInfo['type'] === 'file'
                    && $fileInfo['extension'] === 'md'
                ) {
                    $markdownFiles[$branch][] = (string)$fileInfo['path'];
                }
            }

            if (\count($markdownFiles[$branch]) === 0) {
                throw new RuntimeException("Failed to download docs for branch $branch");
            }
        }

        return $markdownFiles;
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
            /** @var array{type: string, path: string} $fileInfo */
            foreach ($this->files->listContents($dir, true) as $fileInfo) {
                if (isset($fileInfo['type'], $fileInfo['path']) && ($fileInfo['type'] === 'file' || $fileInfo['type'] === 'dir')) {
                    $this->files->setVisibility((string)$fileInfo['path'], 'public');
                }
            }
        } catch (FileNotFoundException $ex) {
            throw new DownloadFailedException("Failed to set visibility on {$ex->getPath()}");
        }

        if (!$this->files->deleteDir($dir)) {
            throw new DownloadFailedException("Failed to delete $dir");
        }
    }
}
