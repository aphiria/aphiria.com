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
    /**
     * @param ConverterInterface $markdownConverter The Markdown parser
     * @param list<string> $branches The branches to read
     * @param string $docsSourcePath The path to the local docs directory
     * @param string $htmlDocPath The path to store HTML docs in
     * @param FilesystemOperator $files The file system helper
     */
    public function __construct(
        private readonly ConverterInterface $markdownConverter,
        private readonly array $branches,
        private readonly string $docsSourcePath,
        private readonly string $htmlDocPath,
        private readonly FilesystemOperator $files,
    ) {}

    /**
     * Builds our documentation by compiling the Markdown from the local docs directory
     *
     * @throws HtmlCompilationException Thrown if the docs could not be built
     */
    public function buildDocs(): void
    {
        $markdownFilePathsByBranch = $this->readDocs();
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
     * Reads all documentation from the local docs directory
     *
     * @return array<string, list<string>> The mapping of branch names to Markdown file paths
     * @throws HtmlCompilationException Thrown if there was any error reading the docs
     */
    private function readDocs(): array
    {
        try {
            $markdownFiles = [];

            foreach ($this->branches as $branch) {
                $markdownFiles[$branch] = [];

                /** @var list<string> $markdownFilePaths */
                $markdownFilePaths = $this->files
                    ->listContents($this->docsSourcePath)
                    ->filter(fn(StorageAttributes $attributes) => $attributes->isFile() && \str_ends_with($attributes->path(), '.md'))
                    ->map(fn(StorageAttributes $attributes) => $attributes->path())
                    ->toArray();

                foreach ($markdownFilePaths as $markdownFilePath) {
                    $markdownFiles[$branch][] = $markdownFilePath;
                }

                if (\count($markdownFiles[$branch]) === 0) {
                    throw new HtmlCompilationException("No markdown files found in $this->docsSourcePath");
                }
            }

            return $markdownFiles;
        } catch (FilesystemException $ex) {
            throw new HtmlCompilationException('Failed to read docs', 0, $ex);
        }
    }
}
