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
     * @param array $branches The branches to download
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
     * @return string[][] The mapping of branch names to local file paths created by the downloads
     * @throws DownloadFailedException Thrown if there was any error reading or writing to the file system
     */
    public function downloadDocs(): array
    {
        $markdownFiles = [];

        foreach ($this->branches as $branch) {
            $markdownFiles[$branch] = [];
            $rawDocsPath = "{$this->clonedDocRelativePath}/$branch";

            if ($this->files->has($rawDocsPath)) {
                /**
                 * When cloning from GitHub, some files in the .git directory are read-only, which means we cannot delete
                 * them using normal PHP commands.  So, we first chmod all the files, then delete them.
                 */
                try {
                    foreach ($this->files->listContents($rawDocsPath, true) as $fileInfo) {
                        if (isset($fileInfo['type'], $fileInfo['path']) && $fileInfo['type'] === 'file') {
                            $this->files->setVisibility($fileInfo['path'], 'rwx');
                        }
                    }
                } catch (FileNotFoundException $ex) {
                    throw new DownloadFailedException("Failed to set visibility on file {$ex->getPath()}");
                }

                if (!$this->files->deleteDir($rawDocsPath)) {
                    throw new DownloadFailedException("Failed to delete directory $rawDocsPath");
                }
            }

            if (!$this->files->createDir($rawDocsPath)) {
                throw new DownloadFailedException("Failed to create directory $rawDocsPath");
            }

            // Clone the branch from GitHub into our temporary directory
            shell_exec(
                sprintf(
                    'git clone -b %s --single-branch %s %s',
                    $branch,
                    self::GITHUB_REPOSITORY,
                    $this->clonedDocAbsolutePath . "/$branch"
                )
            );

            foreach ($this->files->listContents($rawDocsPath) as $fileInfo) {
                if (
                    isset($fileInfo['type'], $fileInfo['extension'])
                    && $fileInfo['type'] === 'file'
                    && $fileInfo['extension'] === 'md'
                ) {
                    $markdownFiles[$branch][] = $fileInfo['path'];
                }
            }

            if (\count($markdownFiles[$branch]) === 0) {
                throw new RuntimeException("Failed to download docs for branch $branch");
            }
        }

        return $markdownFiles;
    }
}
