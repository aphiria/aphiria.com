<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web;

use App\Documentation\DocumentationMetadata;
use League\Flysystem\FileExistsException;
use League\Flysystem\FileNotFoundException;
use League\Flysystem\FilesystemInterface;

/**
 * Defines the compiler for our views
 */
final class ViewCompiler
{
    /**
     * @param string $rawViewPath The path to our raw views
     * @param string $compiledViewPath The path to store our compiled views
     * @param string $apiUri The URI to the API
     * @param DocumentationMetadata $docMetadata The doc metadata
     * @param FilesystemInterface $files The file system helper
     */
    public function __construct(
        private string $rawViewPath,
        private string $compiledViewPath,
        private DocumentationMetadata $docMetadata,
        private string $apiUri,
        private FilesystemInterface $files
    ) {
    }

    /**
     * Compiles all of our views
     *
     * @throws FileNotFoundException Thrown if a file we expected to be there was not
     * @throws FileExistsException Thrown if we attempted to write to a file that already existed
     */
    public function compileViews(): void
    {
        $this->cleanUpExistingCompiledViews();
        $this->compileDocs();
        $this->compilePages([
            ['filename' => 'create-post.html', 'description' => 'Create a post'],
            ['filename' => 'edit-post.html', 'description' => 'Edit a post'],
            ['filename' => 'forgot-password.html', 'description' => 'Forgot your password'],
            ['filename' => 'index.html', 'description' => 'A simple, extensible REST API framework'],
            ['filename' => 'login.html', 'description' => 'Log into the admin'],
            ['filename' => 'logout.html', 'description' => 'Log out of the admin'],
            ['filename' => 'posts.html', 'description' => 'View all posts'],
            ['filename' => 'reset-password.html', 'description' => 'Reset your password']
        ]);
    }

    /**
     * Cleans up any existing compiled views
     *
     * @throws FileNotFoundException Thrown if the file we
     */
    private function cleanUpExistingCompiledViews(): void
    {
        // Delete any compiled views
        /** @var array{type: string, extensions: string, path: string} $fileInfo */
        foreach ($this->files->listContents($this->compiledViewPath, true) as $fileInfo) {
            if (
                isset($fileInfo['type'], $fileInfo['extension'])
                && $fileInfo['type'] === 'file'
                && $fileInfo['extension'] === 'html'
            ) {
                $this->files->delete($fileInfo['path']);
            }
        }

        // Delete any compiled doc directories
        $this->files->deleteDir("{$this->compiledViewPath}/docs");
    }

    /**
     * Compiles the partials that are common to all pages
     *
     * @param string $pageContents The contents of the page to compile
     * @param string[] $metadataKeywords The list of metadata keywords to display
     * @param string $metadataDescription The metadata description to display
     * @return string The compiled contents
     * @throws FileNotFoundException Thrown if a view partial did not exist
     */
    private function compileCommonPartials(
        string $pageContents,
        array $metadataKeywords,
        string $metadataDescription
    ): string {
        // Compile the head
        $headContents = (string)$this->files->read("{$this->rawViewPath}/partials/head.html");
        $compiledHeadContents = $this->compileTag('metadataKeywords', implode(',', $metadataKeywords), $headContents);
        $compiledHeadContents = $this->compileTag('metadataDescription', $metadataDescription, $compiledHeadContents);
        $compiledHeadContents = $this->compileTag('apiUri', $this->apiUri, $compiledHeadContents);
        $compiledPageContents = $this->compileTag('head', $compiledHeadContents, $pageContents);

        // Compile the main nav
        $mainNavContents = (string)$this->files->read("{$this->rawViewPath}/partials/main-nav.html");
        $compiledPageContents = $this->compileTag('mainNav', $mainNavContents, $compiledPageContents);

        // Compile the footer
        $footerContents = (string)$this->files->read("{$this->rawViewPath}/partials/footer.html");
        $compiledPageContents = $this->compileTag('footer', $footerContents, $compiledPageContents);

        return $compiledPageContents;
    }

    /**
     * Compiles our docs
     *
     * @throws FileNotFoundException Thrown if a partial file did not exist
     * @throws FileExistsException Thrown if we attempted to write to a file that already existed
     */
    private function compileDocs(): void
    {
        $this->files->createDir("{$this->compiledViewPath}/docs");
        $docTemplatePageContents = (string)$this->files->read("{$this->rawViewPath}/doc.html");

        // Compile each doc page
        foreach ($this->docMetadata->getDocVersions() as $version) {
            $this->files->createDir("{$this->compiledViewPath}/docs/$version");

            // Compile the doc side nav for each version
            $sideNavSectionContents = (string)$this->files->read("{$this->rawViewPath}/partials/doc-nav-section.html");
            $allCompiledSectionContents = '';

            foreach ($this->docMetadata->getDocSections($version) as $section => $docs) {
                $compiledSectionContents = $this->compileTag('docSectionTitle', $section, $sideNavSectionContents);
                $docSectionListItems = '';

                foreach ($docs as $docName => $doc) {
                    $docSectionListItems .= '<li><a href="/docs/' . $version . '/' . $docName . '.html" title="View documentation for ' . $doc['title'] . '">' . $doc['linkText'] . '</a></li>';
                }

                $compiledSectionContents = $this->compileTag('docSectionListItems', $docSectionListItems, $compiledSectionContents);
                $allCompiledSectionContents .= $compiledSectionContents;
            }

            $sideNavContents = (string)$this->files->read("{$this->rawViewPath}/partials/doc-nav.html");
            $compiledSideNav = $this->compileTag('sections', $allCompiledSectionContents, $sideNavContents);

            // Compile the page
            foreach ($this->docMetadata->getDocSections($version) as $section => $docs) {
                foreach ($docs as $docName => $doc) {
                    $compiledDocPageContents = $this->compileCommonPartials(
                        $docTemplatePageContents,
                        $doc['keywords'],
                        $doc['description']
                    );
                    $docContents = (string)$this->files->read("{$this->rawViewPath}/partials/docs/$version/$docName.html");
                    $compiledDocPageContents = $this->compileTag('doc', $docContents, $compiledDocPageContents);
                    $compiledDocPageContents = $this->compileTag('docTitle', $doc['title'], $compiledDocPageContents);
                    $compiledDocPageContents = $this->compileTag('docVersion', $version, $compiledDocPageContents);
                    $compiledDocPageContents = $this->compileTag('docFilename', $docName, $compiledDocPageContents);
                    $compiledDocPageContents = $this->compileTag('docSideNav', $compiledSideNav, $compiledDocPageContents);
                    $this->files->write("{$this->compiledViewPath}/docs/$version/$docName.html", $compiledDocPageContents);
                }
            }
        }
    }

    /**
     * Compiles a list of pages
     *
     * @param array<array{filename: string, description: string}> $configs The config containing data on the pages to compile
     * @throws FileNotFoundException Thrown if we could not read a view partial
     * @throws FileExistsException Thrown if we attempted to write to a file that already existed
     */
    private function compilePages(array $configs): void
    {
        foreach ($configs as $config) {
            $pageContents = (string)$this->files->read("{$this->rawViewPath}/{$config['filename']}");
            $compiledPageContents = $this->compileCommonPartials(
                $pageContents,
                ['aphiria', 'php', 'framework', 'rest', 'api'],
                $config['description']
            );
            $this->files->write("{$this->compiledViewPath}/{$config['filename']}", $compiledPageContents);
        }
    }

    /**
     * Compiles a tag
     *
     * @param string $name The name of the tag to compile
     * @param string $tagContents The contents to fill the tag with
     * @param string $subject The subject to compile that tag in
     * @return string The compiled tag
     */
    private function compileTag(string $name, string $tagContents, string $subject): string
    {
        return \str_replace("{{ $name }}", $tagContents, $subject);
    }
}
