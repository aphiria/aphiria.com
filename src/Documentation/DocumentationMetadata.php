<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
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
    /** @var list<string> The list of branch names */
    public array $branches {
        get => \array_keys($this->config);
    }
    /** @var string The default version */
    public string $defaultVersion {
        get => self::DEFAULT_VERSION;
    }
    /** @var list<string> The list of doc versions */
    public array $docVersions {
        get => \array_keys($this->config);
    }
    /** @var string The default doc branch to display */
    private const string DEFAULT_VERSION = '1.x';

    /**
     * @param array<string, array{title: string, default: string, docs: array<string, array<string, array{title: string, linkText: string, description: string, keywords: list<string>}>>}> $config The associative array that contains our metadata
     */
    public function __construct(private readonly array $config) {}

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
     * Whether or not a version has docs
     *
     * @param string $version The name of the version to get
     * @return bool True if the version has docs, otherwise false
     */
    public function hasVersion(string $version): bool
    {
        return isset($this->config[$version]);
    }
}
