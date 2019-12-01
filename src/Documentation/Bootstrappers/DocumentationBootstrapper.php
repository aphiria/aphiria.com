<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Bootstrappers;

use Aphiria\DependencyInjection\Bootstrappers\Bootstrapper;
use Aphiria\DependencyInjection\IContainer;
use App\Documentation\DocumentationDownloader;
use App\Documentation\DocumentationMetadata;
use App\Documentation\DocumentationService;
use App\Documentation\Searching\PostgreSqlSearchIndex;
use Opulence\Databases\IConnection;
use ParsedownExtra;

/**
 * Defines the bootstrapper for our documentation
 */
final class DocumentationBootstrapper extends Bootstrapper
{
    /**
     * @inheritdoc
     */
    public function registerBindings(IContainer $container): void
    {
        $metadata = new DocumentationMetadata([
            'master' => $this->getMasterBranchDocConfig()
        ]);
        $container->bindInstance(DocumentationMetadata::class, $metadata);
        $searchIndex = new PostgreSqlSearchIndex(
            getenv('DOC_LEXEMES_TABLE_NAME'),
            $container->resolve(IConnection::class),
            "/docs/{$metadata->getDefaultVersion()}/",
            __DIR__ . '/../../../.env'
        );
        $docs = new DocumentationService(
            $metadata,
            new DocumentationDownloader($metadata->getBranches(), __DIR__ . '/../../../tmp/docs'),
            new ParsedownExtra(),
            $searchIndex,
            __DIR__ . '/../../../resources/views/partials/docs'
        );
        $container->bindInstance(DocumentationService::class, $docs);
    }

    /**
     * Returns an associative array that stores metadata about each page of documentation in the master branch
     *
     * @return array The master branch config
     */
    private function getMasterBranchDocConfig(): array
    {
        return [
            'title' => 'Master',
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
                    'framework-comparisons' => [
                        'title' => 'Framework Comparisons',
                        'linkText' => 'Framework Comparisons',
                        'description' => 'Learn Aphiria stacks up against other popular PHP frameworks',
                        'keywords' => ['aphiria', 'frameworks', 'laravel', 'symfony']
                    ],
                    'application-builders' => [
                        'title' => 'Application Builders',
                        'linkText' => 'Application Builders',
                        'description' => 'Learn how to configure an Aphiria application',
                        'keywords' => ['aphiria', 'configure', 'php', 'application builder']
                    ],
                    'contributing' => [
                        'title' => 'Contributing',
                        'linkText' => 'Contributing',
                        'description' => 'Learn how to contribute to Aphiria',
                        'keywords' => ['aphiria', 'contributing', 'php']
                    ]
                ],
                'HTTP Applications' => [
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
                    'http-exception-handling' => [
                        'title' => 'Exception Handling',
                        'linkText' => 'Exception Handling',
                        'description' => 'Learn about rendering exceptions as HTTP responses in Aphiria',
                        'keywords' => ['aphiria', 'exceptions', 'http', 'exception handling', 'responses', 'php']
                    ]
                ],
                'Console Applications' => [
                    'console' => [
                        'title' => 'Console Basics',
                        'linkText' => 'Basics',
                        'description' => 'Learn the basics of console applications in Aphiria',
                        'keywords' => ['aphiria', 'console', 'command prompt', 'php']
                    ]
                ],
                'Dependency Injection' => [
                    'di-container' => [
                        'title' => 'Container',
                        'linkText' => 'Container',
                        'description' => 'Learn about configuring your dependencies in Aphiria',
                        'keywords' => ['aphiria', 'dependencies', 'dependency injection', 'container', 'php']
                    ],
                    'bootstrappers' => [
                        'title' => 'Bootstrappers',
                        'linkText' => 'Bootstrappers',
                        'description' => 'Learn about configuring your container via bootstrappers in Aphiria',
                        'keywords' => ['aphiria', 'bootstrappers', 'dependency injection', 'container', 'php']
                    ]
                ],
                'Miscellaneous' => [
                    'collections' => [
                        'title' => 'Collections',
                        'linkText' => 'Collections',
                        'description' => 'Learn about collections in Aphiria',
                        'keywords' => ['aphiria', 'collections', 'hash tables', 'array lists', 'stacks', 'queues']
                    ],
                    'io' => [
                        'title' => 'Input/Output',
                        'linkText' => 'Input/Output',
                        'description' => 'Learn about working with IO in Aphiria',
                        'keywords' => ['aphiria', 'io', 'stream', 'file system', 'read write', 'php']
                    ],
                    'reflection' => [
                        'title' => 'Reflection',
                        'linkText' => 'Reflection',
                        'description' => 'Learn about added reflection functionality in Aphiria',
                        'keywords' => ['aphiria', 'reflection', 'class finder', 'php']
                    ],
                    'serialization' => [
                        'title' => 'Serialization',
                        'linkText' => 'Serialization',
                        'description' => 'Learn about to serialize and deserialize objects in Aphiria',
                        'keywords' => ['aphiria', 'serialize', 'deserialize', 'encode', 'decode', 'php']
                    ]
                ]
            ]
        ];
    }
}