<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
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
            'master' => $this->getMasterBranchDocConfig()
        ]);
        $container->bindInstance(DocumentationMetadata::class, $metadata);
        $searchIndex = new PostgreSqlSearchIndex(
            \getenv('DOC_LEXEMES_TABLE_NAME'),
            $container->resolve(PDO::class),
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
                    'application-builders' => [
                        'title' => 'Application Builders',
                        'linkText' => 'Application Builders',
                        'description' => 'Learn how to build an Aphiria application',
                        'keywords' => ['aphiria', 'configure', 'php', 'application builder']
                    ],
                    'configuration' => [
                        'title' => 'Configuration',
                        'linkText' => 'Configuration',
                        'description' => 'Learn how to configure an Aphiria application',
                        'keywords' => ['aphiria', 'configure', 'php']
                    ],
                    'di-container' => [
                        'title' => 'DI Container',
                        'linkText' => 'DI Container',
                        'description' => 'Learn about configuring your dependencies in Aphiria',
                        'keywords' => ['aphiria', 'dependencies', 'dependency injection', 'container', 'php']
                    ],
                    'binders' => [
                        'title' => 'Binders',
                        'linkText' => 'Binders',
                        'description' => 'Learn about configuring your container via binders in Aphiria',
                        'keywords' => ['aphiria', 'binders', 'dependency injection', 'container', 'php']
                    ],
                    'exception-handling' => [
                        'title' => 'Exception Handling',
                        'linkText' => 'Exception Handling',
                        'description' => 'Learn how to handle unhandled exceptions in Aphiria',
                        'keywords' => ['aphiria', 'exceptions', 'errors', 'global exception handler']
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
                    'psr-adapters' => [
                        'title' => 'PSR Adapters',
                        'linkText' => 'PSR Adapters',
                        'description' => 'Learn how to map to-and-from some PSRs',
                        'keywords' => ['aphiria', 'psrs', 'fig', 'psr-7', 'psr-11', 'php']
                    ],
                    'serialization' => [
                        'title' => 'Serialization',
                        'linkText' => 'Serialization',
                        'description' => 'Learn about to serialize and deserialize objects in Aphiria',
                        'keywords' => ['aphiria', 'serialize', 'deserialize', 'encode', 'decode', 'php']
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
