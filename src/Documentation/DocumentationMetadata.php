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

/**
 * Contains metadata about all of our documentation
 */
final class DocumentationMetadata
{
    /** @var string The default doc branch to display */
    private const DEFAULT_BRANCH = 'master';
    /** @var array The associative array that contains our metadata */
    private array $config;

    /**
     * @param array $config The associative array that contains our metadata
     */
    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * Gets the branch names that contain documentation
     *
     * @return array The branch names
     */
    public function getBranches(): array
    {
        return \array_keys($this->config);
    }

    /**
     * Gets the branch names to their titles
     *
     * @return array The mapping of branch names to their titles
     */
    public function getBranchTitles(): array
    {
        $titles = [];

        foreach ($this->config as $name => $data) {
            $titles[$name] = $data['title'];
        }

        return $titles;
    }

    /**
     * Gets the default branch to display
     *
     * @return string The default branch
     */
    public function getDefaultBranch(): string
    {
        return self::DEFAULT_BRANCH;
    }

    /**
     * Gets the name of the default doc for a version
     *
     * @param string $version The version to get
     * @return string The default doc
     */
    public function getDefaultDoc(string $version): string
    {
        return $this->config[$version]['default'];
    }

    /**
     * Gets the config for docs for a version
     *
     * @param string $version The version to get
     * @return array The docs config
     */
    public function getDocs($version): array
    {
        return $this->config[$version]['docs'];
    }

    /**
     * Gets all of the docs for a branch as a flattened array
     *
     * @param string $version The version to get
     * @return array The flattened docs
     */
    public function getFlattenedDocs(string $version): array
    {
        $flattenedDocs = [];

        foreach ($this->config[$version]['docs'] as $sectionHeader => $docs) {
            $flattenedDocs = \array_merge($flattenedDocs, $docs);
        }

        return $flattenedDocs;
    }

    /**
     * Gets whether or not a doc exists for a specific version
     *
     * @param string $version The name of the version to get
     * @param string $name The name of the document
     * @return bool True if the document exists, otherwise false
     */
    public function hasDoc(string $version, string $name): bool
    {
        if (!isset($this->config[$version])) {
            return false;
        }

        $docs = $this->getFlattenedDocs($version);

        return isset($docs[$name]);
    }

    /**
     * Gets whether or not a version has docs
     *
     * @param string $version The name of the version to get
     * @return bool True if the version exists, otherwise false
     */
    public function hasVersion(string $version): bool
    {
        return isset($this->config[$version]);
    }
}
