<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

use Aphiria\DependencyInjection\Container;
use Aphiria\DependencyInjection\IContainer;
use Aphiria\DependencyInjection\IServiceResolver;
use Aphiria\Framework\Api\Builders\ApiApplicationBuilder;
use Aphiria\Net\Http\IRequest;
use Aphiria\Net\Http\StreamResponseWriter;
use App\App;
use Doctrine\Common\Annotations\AnnotationRegistry;

$autoloader = require __DIR__ . '/../vendor/autoload.php';
AnnotationRegistry::registerLoader([$autoloader, 'loadClass']);

// Create our DI container
$container = new Container();
Container::$globalInstance = $container;
$container->bindInstance([IServiceResolver::class, IContainer::class, Container::class], $container);

// Build and run our application
$app = (new ApiApplicationBuilder($container))->withModule(new App($container))
    ->build();
$response = $app->handle($container->resolve(IRequest::class));
(new StreamResponseWriter())->writeResponse($response);
