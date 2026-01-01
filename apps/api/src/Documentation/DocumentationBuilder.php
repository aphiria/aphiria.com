<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2026 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation;

use League\CommonMark\ConverterInterface;
use League\CommonMark\Exception\CommonMarkException;
use League\Config\Exception\ConfigurationExceptionInterface;
use League\Flysystem\FilesystemException;
use League\Flysystem\FilesystemOperator;
use League\Flysystem\StorageAttributes;

/**
 * Defines the documentation builder
 */
final class DocumentationBuilder
{
    /** The GitHub docs repository */
    private const string GITHUB_REPOSITORY = 'https://github.com/aphiria/docs.git';

    /**
     * @param ConverterInterface $markdownConverter The Markdown parser
     * @param list<string> $branches The branches to download
     * @param string $clonedDocAbsolutePath The absolute path to the cloned documentation
     * @param string $clonedDocRelativePath The relative path to the cloned documentation
     * @param string $htmlDocPath The path to store HTML docs in
     * @param FilesystemOperator $files The file system helper
     */
    public function __construct(
        private readonly ConverterInterface $markdownConverter,
        private readonly array $branches,
        private readonly string $clonedDocAbsolutePath,
        private readonly string $clonedDocRelativePath,
        private readonly string $htmlDocPath,
        private readonly FilesystemOperator $files,
    ) {}

    /**
     * Builds our documentation, which includes cloning it and compiling the Markdown
     *
     * @throws DownloadFailedException Thrown if there was a problem downloading the documentation
     * @throws HtmlCompilationException Thrown if the docs could not be built
     */
    public function buildDocs(): void
    {
        $markdownFilePathsByBranch = $this->downloadDocs();
        $this->createHtmlDocs($markdownFilePathsByBranch);
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
                    /** @var string $html Psalm misinterprets this as being nullable */
                    $html = $this->markdownConverter->convert($this->files->read($markdownFilePath))->getContent();
                    // Rewrite the links to point to the HTML docs on the site
                    // Note that we explicitly match <a> tags without a target (eg target="_blank") to avoid rewriting links that may be pointing externally, eg to the documentation repo in GitHub
                    $html = \preg_replace('/<a href="([^"]+)\.md(#[^"]+)?">/', '<a href="$1.html$2">', $html);
                    $this->files->write($htmlDocFilename, (string) $html);
                }
            }
        } catch (FilesystemException|CommonMarkException|ConfigurationExceptionInterface $ex) {
            throw new HtmlCompilationException('Failed to write HTML to file', 0, $ex);
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
            $contentPaths = $this->files
                ->listContents($dir, true)
                ->filter(fn(StorageAttributes $attributes) => $attributes->isFile() || $attributes->isDir())
                ->map(fn(StorageAttributes $attributes) => $attributes->path())
                ->toArray();

            foreach ($contentPaths as $contentPath) {
                $this->files->setVisibility($contentPath, 'public');
            }

            $this->files->deleteDirectory($dir);
        } catch (FilesystemException $ex) {
            throw new DownloadFailedException('Failed to set visibility', 0, $ex);
        }
    }

    /**
     * Downloads all of our documentation
     *
     * @return array<string, list<string>> The mapping of branch names to local file paths created by the downloads
     * @throws DownloadFailedException Thrown if there was any error reading or writing to the file system
     */
    private function downloadDocs(): array
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
                        $this->clonedDocAbsolutePath . "/$branch",
                    ),
                );

                // Delete the .git directory so we don't get multiple VCS roots registered
                $this->deleteDir("$this->clonedDocRelativePath/$branch/.git");
                /** @var list<string> $markdownFilePaths */
                $markdownFilePaths = $this->files
                    ->listContents($rawDocsPath)
                    ->filter(fn(StorageAttributes $attributes) => $attributes->isFile() && \str_ends_with($attributes->path(), '.md'))
                    ->map(fn(StorageAttributes $attributes) => $attributes->path())
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
}
