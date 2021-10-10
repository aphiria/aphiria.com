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

use InvalidArgumentException;

/**
 * Contains metadata about all of our documentation
 */
final class DocumentationMetadata
{
    /** @var string The default doc branch to display */
    private const DEFAULT_VERSION = '1.x';

    /**
     * @param array<string, array{title: string, default: string, docs: array<string, array<string, array{title: string, linkText: string, description: string, keywords: list<string>}>>}> $config The associative array that contains our metadata
     */
    public function __construct(private array $config)
    {
    }

    /**
     * Gets the branch names that contain documentation
     *
     * @return list<string> The branch names
     */
    public function getBranches(): array
    {
        return \array_keys($this->config);
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
     * Gets the default branch to display
     *
     * @return string The default version
     */
    public function getDefaultVersion(): string
    {
        return self::DEFAULT_VERSION;
    }

    /**
     * Gets the docs, broken up by logical sections
     *
     * @param string $version The version whose doc sections we want
     * @return array<string, array<string, array{title: string, linkText: string, description: string, keywords: list<string>}>> The mapping of doc sections to doc metadata
     * @throws InvalidArgumentException Thrown if no doc exists with the input version
     */
    public function getDocSections(string $version): array
    {
        if (!$this->hasVersion($version)) {
            throw new InvalidArgumentException("No document with version $version exists");
        }

        return $this->config[$version]['docs'];
    }

    /**
     * Gets the list of doc versions
     *
     * @return list<string> The list of doc versions
     */
    public function getDocVersions(): array
    {
        return \array_keys($this->config);
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
