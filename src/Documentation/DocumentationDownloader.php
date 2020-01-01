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
use RuntimeException;

/**
 * Defines the documentation downloader
 */
final class DocumentationDownloader
{
    /** The GitHub docs repository */
    private const GITHUB_REPOSITORY = 'https://github.com/aphiria/docs.git';
    /** @var array The branches to download */
    private array $branches;
    /** @var FileSystem A file system helper */
    private FileSystem $files;
    /** @var string The temporary location for cloned docs */
    private string $clonedDocPath;

    /**
     * @param array $branches The branches to download
     * @param string $clonedDocPath
     */
    public function __construct(array $branches, string $clonedDocPath)
    {
        $this->branches = $branches;
        $this->clonedDocPath = $clonedDocPath;
        $this->files = new FileSystem();
    }

    /**
     * Downloads all of our documentation
     *
     * @return string[] The mapping of branch names to local file paths created by the downloads
     * @throws FileSystemException Thrown if there was any error reading or writing to the file system
     */
    public function downloadDocs(): array
    {
        $markdownFiles = [];

        foreach ($this->branches as $branch) {
            $rawDocsPath = "{$this->clonedDocPath}/$branch";

            if ($this->files->exists($rawDocsPath)) {
                /**
                 * When cloning from GitHub, some files in the .git directory are read-only, which means we cannot delete
                 * them using normal PHP commands.  So, we first chmod all the files, then delete them.
                 */
                foreach ($this->files->getFiles($rawDocsPath, true) as $file) {
                    chmod($file, 0777);
                }

                $this->files->deleteDirectory($rawDocsPath);
            }

            $this->files->makeDirectory($rawDocsPath);

            // Clone the branch from GitHub into our temporary directory
            shell_exec(
                sprintf(
                    'git clone -b %s --single-branch %s %s',
                    $branch,
                    self::GITHUB_REPOSITORY,
                    $rawDocsPath
                )
            );

            $markdownFiles[$branch] = $this->files->glob("$rawDocsPath/*.md");

            if (\count($markdownFiles[$branch]) === 0) {
                throw new RuntimeException("Failed to download docs for branch $branch");
            }
        }

        return $markdownFiles;
    }
}
