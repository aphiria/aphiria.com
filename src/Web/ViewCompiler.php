<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web;

use App\Documentation\DocumentationMetadata;
use League\Flysystem\FilesystemException;
use League\Flysystem\FilesystemOperator;
use League\Flysystem\StorageAttributes;

/**
 * Defines the compiler for our views
 */
final class ViewCompiler
{
    /**
     * @param string $rawViewPath The path to our raw views
     * @param string $compiledViewPath The path to store our compiled views
     * @param DocumentationMetadata $docMetadata The doc metadata
     * @param FilesystemOperator $files The file system helper
     */
    public function __construct(
        private readonly string $rawViewPath,
        private readonly string $compiledViewPath,
        private readonly DocumentationMetadata $docMetadata,
        private readonly FilesystemOperator $files
    ) {
    }

    /**
     * Compiles all of our views
     *
     * @throws FilesystemException Thrown if a file we expected to be there was not or if we attempted to write to a file that already existed
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
     * @throws FilesystemException Thrown if we could not delete the compiled views
     */
    private function cleanUpExistingCompiledViews(): void
    {
        /** @var list<string> $compiledHtmlDocPaths */
        $compiledHtmlDocPaths = $this->files->listContents($this->compiledViewPath, true)
            ->filter(fn (StorageAttributes $attributes) => $attributes->isFile() && \str_ends_with($attributes->path(), '.html'))
            ->map(fn (StorageAttributes $attributes) => $attributes->path())
            ->toArray();

        // Delete any compiled views
        foreach ($compiledHtmlDocPaths as $compiledHtmlDocPath) {
            $this->files->delete($compiledHtmlDocPath);
        }

        // Delete any compiled doc directories
        $this->files->deleteDirectory("$this->compiledViewPath/docs");
    }

    /**
     * Compiles the partials that are common to all pages
     *
     * @param string $pageContents The contents of the page to compile
     * @param list<string> $metadataKeywords The list of metadata keywords to display
     * @param string $metadataDescription The metadata description to display
     * @return string The compiled contents
     * @throws FilesystemException Thrown if a view partial did not exist
     */
    private function compileCommonPartials(
        string $pageContents,
        array $metadataKeywords,
        string $metadataDescription
    ): string {
        // Compile the head
        $headContents = $this->files->read("$this->rawViewPath/partials/head.html");
        $compiledHeadContents = $this->compileTag('metadataKeywords', \implode(',', $metadataKeywords), $headContents);
        $compiledHeadContents = $this->compileTag('metadataDescription', $metadataDescription, $compiledHeadContents);
        $compiledPageContents = $this->compileTag('head', $compiledHeadContents, $pageContents);

        // Compile the main nav
        $mainNavContents = $this->files->read("$this->rawViewPath/partials/main-nav.html");
        $mainNavLinksContents = $this->files->read("$this->rawViewPath/partials/main-nav-links.html");
        $compiledMainNavContents = $this->compileTag('mainNavLinks', $mainNavLinksContents, $mainNavContents);
        $compiledPageContents = $this->compileTag('mainNav', $compiledMainNavContents, $compiledPageContents);

        // Compile the footer
        $footerContents = $this->files->read("$this->rawViewPath/partials/footer.html");
        $compiledPageContents = $this->compileTag('footer', $footerContents, $compiledPageContents);

        return $compiledPageContents;
    }

    /**
     * Compiles our docs
     *
     * @throws FilesystemException Thrown if a partial file did not exist or if we attempted to write to a file that already existed
     */
    private function compileDocs(): void
    {
        $this->files->createDirectory("$this->compiledViewPath/docs", ['visibility' => 'public']);
        $docTemplatePageContents = $this->files->read("$this->rawViewPath/doc.html");

        // Compile each doc page
        foreach ($this->docMetadata->docVersions as $version) {
            $this->files->createDirectory("$this->compiledViewPath/docs/$version", ['visibility' => 'public']);

            // Compile the doc side nav for each version
            $sideNavSectionContents = $this->files->read("$this->rawViewPath/partials/doc-side-nav-contents.html");
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

            $sideNavContents = $this->files->read("$this->rawViewPath/partials/side-nav.html");
            $compiledSideNav = $this->compileTag('contents', $allCompiledSectionContents, $sideNavContents);

            // Compile the page
            foreach ($this->docMetadata->getDocSections($version) as $docs) {
                foreach ($docs as $docName => $doc) {
                    $compiledDocPageContents = $this->compileCommonPartials(
                        $docTemplatePageContents,
                        $doc['keywords'],
                        $doc['description']
                    );
                    $docContents = $this->files->read("$this->rawViewPath/partials/docs/$version/$docName.html");
                    $compiledDocPageContents = $this->compileTag('doc', $docContents, $compiledDocPageContents);
                    $compiledDocPageContents = $this->compileTag('docTitle', $doc['title'], $compiledDocPageContents);
                    $compiledDocPageContents = $this->compileTag('docVersion', $version, $compiledDocPageContents);
                    $compiledDocPageContents = $this->compileTag('docFilename', $docName, $compiledDocPageContents);
                    $compiledDocPageContents = $this->compileTag('sideNav', $compiledSideNav, $compiledDocPageContents);
                    $this->files->write("$this->compiledViewPath/docs/$version/$docName.html", $compiledDocPageContents);
                }
            }
        }
    }

    /**
     * Compiles the homepage
     *
     * @throws FilesystemException Thrown if we could not read a view partial or if we attempted to write to a file that already existed
     */
    private function compileHomepage(): void
    {
        $homepageContents = $this->files->read("$this->rawViewPath/index.html");
        $compiledHomepageContents = $this->compileCommonPartials(
            $homepageContents,
            ['aphiria', 'php', 'framework', 'rest', 'api'],
            'A simple, extensible REST API framework'
        );
        $sideNavContents = $this->files->read("$this->rawViewPath/partials/side-nav.html");
        $mainNavLinksContents = $this->files->read("$this->rawViewPath/partials/main-nav-links.html");
        $nonDocSideNavContents = $this->files->read("$this->rawViewPath/partials/non-doc-side-nav-contents.html");
        $compiledSideNav = $this->compileTag(
            'contents',
            $this->compileTag(
                'mainNavLinks',
                $mainNavLinksContents,
                $nonDocSideNavContents
            ),
            $sideNavContents
        );
        $compiledHomepageContents = $this->compileTag('sideNav', $compiledSideNav, $compiledHomepageContents);
        $this->files->write("$this->compiledViewPath/index.html", $compiledHomepageContents);
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
