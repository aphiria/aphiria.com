<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Binders;

use Aphiria\DependencyInjection\Binders\Binder;
use Aphiria\DependencyInjection\IContainer;
use App\Documentation\DocumentationBuilder;
use App\Documentation\DocumentationMetadata;
use App\Documentation\Searching\ISearchIndex;
use App\Documentation\Searching\PostgreSqlSearchIndex;
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\DisallowedRawHtml\DisallowedRawHtmlExtension;
use League\CommonMark\Extension\Table\TableExtension;
use League\CommonMark\MarkdownConverter;
use League\Flysystem\Filesystem;
use League\Flysystem\FilesystemOperator;
use League\Flysystem\Local\LocalFilesystemAdapter;
use League\Flysystem\UnixVisibility\PortableVisibilityConverter;
use PDO;

/**
 * Defines the binder for our documentation
 */
final class DocumentationBinder extends Binder
{
    /** @var string The path to the HTML docs */
    private const string HTML_DOC_PATH = '/resources/views/partials/docs';

    /**
     * @inheritdoc
     */
    public function bind(IContainer $container): void
    {
        $metadata = new DocumentationMetadata([
            '1.x' => $this->get1xBranchDocConfig(),
        ]);
        $container->bindInstance(DocumentationMetadata::class, $metadata);
        $files = new Filesystem(
            new LocalFilesystemAdapter(
                __DIR__ . '/../../..',
                PortableVisibilityConverter::fromArray([
                    'file' => [
                        'public' => 0777,
                    ],
                    'dir' => [
                        'public' => 0755,
                    ],
                ]),
                LOCK_EX,
                LocalFilesystemAdapter::DISALLOW_LINKS,
            ),
        );
        $container->bindInstance(FilesystemOperator::class, $files);

        $config = [
            'table' => [
                'wrap' => [
                    'enabled' => false,
                    'tag' => 'div',
                    'attributes' => [],
                ],
                'alignment_attributes' => [
                    'left'   => ['align' => 'left'],
                    'center' => ['align' => 'center'],
                    'right'  => ['align' => 'right'],
                ],
            ],
        ];
        $environment = new Environment($config);
        $environment->addExtension(new CommonMarkCoreExtension());
        $environment->addExtension(new DisallowedRawHtmlExtension());
        $environment->addExtension(new TableExtension());
        $converter = new MarkdownConverter($environment);
        $docBuilder = new DocumentationBuilder(
            $converter,
            $metadata->branches,
            __DIR__ . '/../../../tmp/docs',
            '/tmp/docs',
            self::HTML_DOC_PATH,
            $files,
        );
        $container->bindInstance(DocumentationBuilder::class, $docBuilder);

        // Bind using a factory to defer resolving the database connection
        $container->bindFactory(
            ISearchIndex::class,
            fn() => new PostgreSqlSearchIndex($container->resolve(PDO::class)),
            true,
        );
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
                        'keywords' => ['aphiria', 'introduction', 'php'],
                    ],
                    'installation' => [
                        'title' => 'Installing',
                        'linkText' => 'Installing',
                        'description' => 'Learn how to install Aphiria',
                        'keywords' => ['aphiria', 'install', 'php'],
                    ],
                    'contributing' => [
                        'title' => 'Contributing',
                        'linkText' => 'Contributing',
                        'description' => 'Learn how to contribute to Aphiria',
                        'keywords' => ['aphiria', 'contributing', 'php'],
                    ],
                    'framework-comparisons' => [
                        'title' => 'Framework Comparisons',
                        'linkText' => 'Framework Comparisons',
                        'description' => 'Learn Aphiria stacks up against other popular PHP frameworks',
                        'keywords' => ['aphiria', 'frameworks', 'laravel', 'symfony'],
                    ],
                ],
                'Configuration' => [
                    'application-builders' => [
                        'title' => 'Application Builders',
                        'linkText' => 'Application Builders',
                        'description' => 'Learn how to build an Aphiria application',
                        'keywords' => ['aphiria', 'application builder', 'modules', 'components', 'php'],
                    ],
                    'config-files' => [
                        'title' => 'Config Files',
                        'linkText' => 'Config Files',
                        'description' => 'Learn how to read configuration settings',
                        'keywords' => ['aphiria', 'configure', 'config', 'json', 'yaml', 'php'],
                    ],
                    'dependency-injection' => [
                        'title' => 'Dependency Injection',
                        'linkText' => 'Dependency Injection',
                        'description' => 'Learn about injecting your dependencies in Aphiria',
                        'keywords' => ['aphiria', 'dependencies', 'dependency injection', 'container', 'binders', 'php'],
                    ],
                    'exception-handling' => [
                        'title' => 'Exception Handling',
                        'linkText' => 'Exception Handling',
                        'description' => 'Learn how to handle unhandled exceptions in Aphiria',
                        'keywords' => ['aphiria', 'exceptions', 'errors', 'global exception handler'],
                    ],
                ],
                'Building Your API' => [
                    'routing' => [
                        'title' => 'Routing',
                        'linkText' => 'Routing',
                        'description' => 'Learn about creating an Aphiria router',
                        'keywords' => ['aphiria', 'routing', 'router', 'http', 'php'],
                    ],
                    'http-requests' => [
                        'title' => 'HTTP Requests',
                        'linkText' => 'Requests',
                        'description' => 'Learn the basics of HTTP requests in Aphiria',
                        'keywords' => ['aphiria', 'http', 'requests', 'php'],
                    ],
                    'http-responses' => [
                        'title' => 'HTTP Responses',
                        'linkText' => 'Responses',
                        'description' => 'Learn the basics of HTTP responses in Aphiria',
                        'keywords' => ['aphiria', 'http', 'responses', 'php'],
                    ],
                    'controllers' => [
                        'title' => 'Controllers',
                        'linkText' => 'Controllers',
                        'description' => 'Learn about setting up controllers for your endpoints in Aphiria',
                        'keywords' => ['aphiria', 'http', 'controllers', 'endpoints', 'php'],
                    ],
                    'middleware' => [
                        'title' => 'Middleware',
                        'linkText' => 'Middleware',
                        'description' => 'Learn about HTTP middleware in Aphiria',
                        'keywords' => ['aphiria', 'middleware', 'http', 'requests', 'responses', 'php'],
                    ],
                    'content-negotiation' => [
                        'title' => 'Content Negotiation',
                        'linkText' => 'Content Negotiation',
                        'description' => 'Learn about how content negotiation works in Aphiria',
                        'keywords' => ['aphiria', 'content negotiation', 'http', 'php'],
                    ],
                    'sessions' => [
                        'title' => 'Sessions',
                        'linkText' => 'Sessions',
                        'description' => 'Learn about server-side sessions in Aphiria',
                        'keywords' => ['aphiria', 'sessions', 'http', 'php'],
                    ],
                    'testing-apis' => [
                        'title' => 'Testing APIs',
                        'linkText' => 'Testing APIs',
                        'description' => 'Learn how to test your Aphiria applications',
                        'keywords' => ['aphiria', 'integration tests', 'testing', 'php'],
                    ],
                ],
                'Auth' => [
                    'authentication' => [
                        'title' => 'Authentication',
                        'linkText' => 'Authentication',
                        'description' => 'Learn about authentication in Aphiria',
                        'keywords' => ['aphiria', 'authentication'],
                    ],
                    'authorization' => [
                        'title' => 'Authorization',
                        'linkText' => 'Authorization',
                        'description' => 'Learn about authorization in Aphiria',
                        'keywords' => ['aphiria', 'authorization', 'pbac'],
                    ],
                ],
                'Libraries' => [
                    'collections' => [
                        'title' => 'Collections',
                        'linkText' => 'Collections',
                        'description' => 'Learn about collections in Aphiria',
                        'keywords' => ['aphiria', 'collections', 'hash tables', 'array lists', 'stacks', 'queues'],
                    ],
                    'console' => [
                        'title' => 'Console',
                        'linkText' => 'Console',
                        'description' => 'Learn how to use console commands in Aphiria',
                        'keywords' => ['aphiria', 'console', 'command prompt', 'php'],
                    ],
                    'io' => [
                        'title' => 'Input/Output',
                        'linkText' => 'Input/Output',
                        'description' => 'Learn about working with IO in Aphiria',
                        'keywords' => ['aphiria', 'io', 'stream', 'php'],
                    ],
                    'reflection' => [
                        'title' => 'Reflection',
                        'linkText' => 'Reflection',
                        'description' => 'Learn about added reflection functionality in Aphiria',
                        'keywords' => ['aphiria', 'reflection', 'class finder', 'php'],
                    ],
                    'psr-adapters' => [
                        'title' => 'PSR Adapters',
                        'linkText' => 'PSR Adapters',
                        'description' => 'Learn how to map to-and-from some PSRs',
                        'keywords' => ['aphiria', 'psrs', 'fig', 'psr-7', 'psr-11', 'php'],
                    ],
                    'validation' => [
                        'title' => 'Validation',
                        'linkText' => 'Validation',
                        'description' => 'Learn about to validate data in Aphiria',
                        'keywords' => ['aphiria', 'validation', 'constraints', 'php'],
                    ],
                ],
            ],
        ];
    }
}
