<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web;

use Aphiria\IO\FileSystem;
use Aphiria\IO\FileSystemException;
use App\Documentation\DocumentationMetadata;

/**
 * Defines the compiler for our views
 */
final class ViewCompiler
{
    /** @var string The path to our raw views */
    private string $rawViewPath;
    /** @var string The path to store our compiled views */
    private string $compiledViewPath;
    /** @var DocumentationMetadata The doc metadata */
    private DocumentationMetadata $docMetadata;
    /** @var string The URI to the API */
    private string $apiUri;
    /** @var FileSystem The file helper */
    private FileSystem $files;

    /**
     * @param string $rawViewPath The path to our raw views
     * @param string $compiledViewPath The path to store our compiled views
     * @param string $apiUri The URI to the API
     * @param DocumentationMetadata $docMetadata The doc metadata
     */
    public function __construct(
        string $rawViewPath,
        string $compiledViewPath,
        DocumentationMetadata $docMetadata,
        string $apiUri
    ) {
        $this->rawViewPath = $rawViewPath;
        $this->compiledViewPath = $compiledViewPath;
        $this->docMetadata = $docMetadata;
        $this->apiUri = $apiUri;
        $this->files = new FileSystem();
    }

    /**
     * Compiles all of our views
     *
     * @throws FileSystemException Thrown if there was an error reading or writing to the filesystem
     */
    public function compileViews(): void
    {
        $this->cleanUpExistingCompiledViews();
        $this->compileHomepage();
        $this->compileDocs();
    }

    /**
     * Cleans up any existing compiled views
     *
     * @throws FileSystemException Thrown if there was an error reading the files or their extensions
     */
    private function cleanUpExistingCompiledViews(): void
    {
        // Delete any compiled views
        foreach ($this->files->getFiles($this->compiledViewPath, true) as $file) {
            if ($this->files->getExtension($file) === 'html') {
                $this->files->deleteFile($file);
            }
        }

        // Delete any compiled doc directories
        $this->files->deleteDirectory("{$this->compiledViewPath}/docs");
    }

    /**
     * Compiles the partials that are common to all pages
     *
     * @param string $pageContents The contents of the page to compile
     * @param string[] $metadataKeywords The list of metadata keywords to display
     * @param string $metadataDescription The metadata description to display
     * @return string The compiled contents
     * @throws FileSystemException Thrown if there was an error reading files
     */
    private function compileCommonPartials(
        string $pageContents,
        array $metadataKeywords,
        string $metadataDescription
    ): string {
        // Compile the head
        $headContents = $this->files->read("{$this->rawViewPath}/partials/head.html");
        $compiledHeadContents = $this->compileTag('metadataKeywords', implode(',', $metadataKeywords), $headContents);
        $compiledHeadContents = $this->compileTag('metadataDescription', $metadataDescription, $compiledHeadContents);
        $compiledHeadContents = $this->compileTag('apiUri', $this->apiUri, $compiledHeadContents);
        $compiledPageContents = $this->compileTag('head', $compiledHeadContents, $pageContents);

        // Compile the main nav
        $mainNavContents = $this->files->read("{$this->rawViewPath}/partials/main-nav.html");
        $defaultDocVersion = $this->docMetadata->getDefaultVersion();
        $compiledMainNavContents = $this->compileTag('docLink', "/docs/$defaultDocVersion/{$this->docMetadata->getDefaultDoc($defaultDocVersion)}.html", $mainNavContents);
        $compiledPageContents = $this->compileTag('mainNav', $compiledMainNavContents, $compiledPageContents);

        // Compile the footer
        $footerContents = $this->files->read("{$this->rawViewPath}/partials/footer.html");
        $compiledPageContents = $this->compileTag('footer', $footerContents, $compiledPageContents);

        return $compiledPageContents;
    }

    /**
     * Compiles our docs
     *
     * @throws FileSystemException Thrown if there was an error reading or writing to the filesystem
     */
    private function compileDocs(): void
    {
        $this->files->makeDirectory("{$this->compiledViewPath}/docs");
        $docTemplatePageContents = $this->files->read("{$this->rawViewPath}/doc.html");

        // Compile each doc page
        foreach ($this->docMetadata->getDocVersions() as $version) {
            $this->files->makeDirectory("{$this->compiledViewPath}/docs/$version");

            // Compile the doc side nav for each version
            $sideNavSectionContents = $this->files->read("{$this->rawViewPath}/partials/doc-nav-section.html");
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

            $sideNavContents = $this->files->read("{$this->rawViewPath}/partials/doc-nav.html");
            $compiledSideNav = $this->compileTag('sections', $allCompiledSectionContents, $sideNavContents);

            // Compile the page
            foreach ($this->docMetadata->getDocs($version) as $section => $docs) {
                foreach ($docs as $docName => $doc) {
                    $compiledDocPageContents = $this->compileCommonPartials(
                        $docTemplatePageContents,
                        $doc['keywords'],
                        $doc['description']
                    );
                    $docContents = $this->files->read("{$this->rawViewPath}/partials/docs/$version/$docName.html");
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
     * Compiles the homepage
     *
     * @throws FileSystemException Thrown if there was an error reading or writing to the filesystem
     */
    private function compileHomepage(): void
    {
        $homepageContents = $this->files->read("{$this->rawViewPath}/index.html");
        $compiledHomepageContents = $this->compileCommonPartials(
            $homepageContents,
            ['aphiria', 'php', 'framework', 'rest', 'api'],
            'A simple, extensible REST API framework'
        );
        $this->files->write("{$this->compiledViewPath}/index.html", $compiledHomepageContents);
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
