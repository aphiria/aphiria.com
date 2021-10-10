<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2021 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Binders;

use Aphiria\DependencyInjection\Binders\Binder;
use Aphiria\DependencyInjection\IContainer;
use App\Documentation\DocumentationDownloader;
use App\Documentation\DocumentationMetadata;
use App\Documentation\DocumentationService;
use App\Documentation\Searching\PostgreSqlSearchIndex;
use League\Flysystem\Adapter\Local;
use League\Flysystem\Filesystem;
use League\Flysystem\FilesystemInterface;
use ParsedownExtra;
use PDO;

/**
 * Defines the binder for our documentation
 */
final class DocumentationBinder extends Binder
{
    /**
     * @inheritdoc
     */
    public function bind(IContainer $container): void
    {
        $metadata = new DocumentationMetadata([
            '1.x' => $this->get1xBranchDocConfig()
        ]);
        $container->bindInstance(DocumentationMetadata::class, $metadata);
        $files = new Filesystem(
            new Local(__DIR__ . '/../../..', LOCK_EX, Local::DISALLOW_LINKS, ['file' => ['rwx' => 0777]])
        );
        $container->bindInstance(FilesystemInterface::class, $files);
        $searchIndex = new PostgreSqlSearchIndex(
            (string)\getenv('DOC_LEXEMES_TABLE_NAME'),
            $container->resolve(PDO::class),
            "/docs/{$metadata->getDefaultVersion()}/",
            '/.env',
            $files
        );
        $docs = new DocumentationService(
            $metadata,
            new DocumentationDownloader($metadata->getBranches(), __DIR__ . '/../../../tmp/docs', '/tmp/docs', $files),
            new ParsedownExtra(),
            $searchIndex,
            '/resources/views/partials/docs',
            $files
        );
        $container->bindInstance(DocumentationService::class, $docs);
    }

    /**
     * Returns an associative array that stores metadata about each page of documentation in the 1.x branch
     *
     * @return array{title: string, default: string, docs: array<string, array<string, array{title: string, linkText: string, description: string, keywords: list<string>}>>} The master branch config
     */
    private function get1xBranchDocConfig(): array
    {
        return [
            'title' => '1.x',
            'default' => 'introduction',
            'docs' => [
                'Getting Started' => [
                    'introduction' => [
                        'title' => 'Introduction',
                        'linkText' => 'Introduction',
                        'description' => 'Get introduced to Aphiria',
                        'keywords' => ['aphiria', 'introduction', 'php']
                    ],
                    'installation' => [
                        'title' => 'Installing',
                        'linkText' => 'Installing',
                        'description' => 'Learn how to install Aphiria',
                        'keywords' => ['aphiria', 'install', 'php']
                    ],
                    'contributing' => [
                        'title' => 'Contributing',
                        'linkText' => 'Contributing',
                        'description' => 'Learn how to contribute to Aphiria',
                        'keywords' => ['aphiria', 'contributing', 'php']
                    ],
                    'framework-comparisons' => [
                        'title' => 'Framework Comparisons',
                        'linkText' => 'Framework Comparisons',
                        'description' => 'Learn Aphiria stacks up against other popular PHP frameworks',
                        'keywords' => ['aphiria', 'frameworks', 'laravel', 'symfony']
                    ]
                ],
                'Configuration' => [
                    'configuration' => [
                        'title' => 'Configuration',
                        'linkText' => 'Configuration',
                        'description' => 'Learn how to configure an Aphiria application',
                        'keywords' => ['aphiria', 'configure', 'application builder', 'php']
                    ],
                    'dependency-injection' => [
                        'title' => 'Dependency Injection',
                        'linkText' => 'Dependency Injection',
                        'description' => 'Learn about injecting your dependencies in Aphiria',
                        'keywords' => ['aphiria', 'dependencies', 'dependency injection', 'container', 'binders', 'php']
                    ],
                    'exception-handling' => [
                        'title' => 'Exception Handling',
                        'linkText' => 'Exception Handling',
                        'description' => 'Learn how to handle unhandled exceptions in Aphiria',
                        'keywords' => ['aphiria', 'exceptions', 'errors', 'global exception handler']
                    ]
                ],
                'Building Your API' => [
                    'routing' => [
                        'title' => 'Routing',
                        'linkText' => 'Routing',
                        'description' => 'Learn about creating an Aphiria router',
                        'keywords' => ['aphiria', 'routing', 'router', 'http', 'php']
                    ],
                    'http-requests' => [
                        'title' => 'HTTP Requests',
                        'linkText' => 'Requests',
                        'description' => 'Learn the basics of HTTP requests in Aphiria',
                        'keywords' => ['aphiria', 'http', 'requests', 'php']
                    ],
                    'http-responses' => [
                        'title' => 'HTTP Responses',
                        'linkText' => 'Responses',
                        'description' => 'Learn the basics of HTTP responses in Aphiria',
                        'keywords' => ['aphiria', 'http', 'responses', 'php']
                    ],
                    'controllers' => [
                        'title' => 'Controllers',
                        'linkText' => 'Controllers',
                        'description' => 'Learn about setting up controllers for your endpoints in Aphiria',
                        'keywords' => ['aphiria', 'http', 'controllers', 'endpoints', 'php']
                    ],
                    'middleware' => [
                        'title' => 'Middleware',
                        'linkText' => 'Middleware',
                        'description' => 'Learn about HTTP middleware in Aphiria',
                        'keywords' => ['aphiria', 'middleware', 'http', 'requests', 'responses', 'php']
                    ],
                    'content-negotiation' => [
                        'title' => 'Content Negotiation',
                        'linkText' => 'Content Negotiation',
                        'description' => 'Learn about how content negotiation works in Aphiria',
                        'keywords' => ['aphiria', 'content negotiation', 'http', 'php']
                    ],
                    'sessions' => [
                        'title' => 'Sessions',
                        'linkText' => 'Sessions',
                        'description' => 'Learn about server-side sessions in Aphiria',
                        'keywords' => ['aphiria', 'sessions', 'http', 'php']
                    ],
                    'testing-apis' => [
                        'title' => 'Testing APIs',
                        'linkText' => 'Testing APIs',
                        'description' => 'Learn how to test your Aphiria applications',
                        'keywords' => ['aphiria', 'integration tests', 'testing', 'php']
                    ]
                ],
                'Libraries' => [
                    'collections' => [
                        'title' => 'Collections',
                        'linkText' => 'Collections',
                        'description' => 'Learn about collections in Aphiria',
                        'keywords' => ['aphiria', 'collections', 'hash tables', 'array lists', 'stacks', 'queues']
                    ],
                    'console' => [
                        'title' => 'Console',
                        'linkText' => 'Console',
                        'description' => 'Learn how to use console commands in Aphiria',
                        'keywords' => ['aphiria', 'console', 'command prompt', 'php']
                    ],
                    'io' => [
                        'title' => 'Input/Output',
                        'linkText' => 'Input/Output',
                        'description' => 'Learn about working with IO in Aphiria',
                        'keywords' => ['aphiria', 'io', 'stream', 'php']
                    ],
                    'reflection' => [
                        'title' => 'Reflection',
                        'linkText' => 'Reflection',
                        'description' => 'Learn about added reflection functionality in Aphiria',
                        'keywords' => ['aphiria', 'reflection', 'class finder', 'php']
                    ],
                    'psr-adapters' => [
                        'title' => 'PSR Adapters',
                        'linkText' => 'PSR Adapters',
                        'description' => 'Learn how to map to-and-from some PSRs',
                        'keywords' => ['aphiria', 'psrs', 'fig', 'psr-7', 'psr-11', 'php']
                    ],
                    'validation' => [
                        'title' => 'Validation',
                        'linkText' => 'Validation',
                        'description' => 'Learn about to validate data in Aphiria',
                        'keywords' => ['aphiria', 'validation', 'constraints', 'php']
                    ]
                ]
            ]
        ];
    }
}
