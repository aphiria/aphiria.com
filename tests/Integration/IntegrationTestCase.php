<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2022 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Tests\Integration;

use Aphiria\Application\Builders\IApplicationBuilder;
use Aphiria\Application\IApplication;
use Aphiria\DependencyInjection\IContainer;
use Aphiria\Framework\Api\Testing\PhpUnit\IntegrationTestCase as BaseIntegrationTestCase;
use App\GlobalModule;
use TypeError;

/**
 * Defines the base integration test case
 */
class IntegrationTestCase extends BaseIntegrationTestCase
{
    /**
     * @inheritdoc
     */
    protected function createApplication(IContainer $container): IApplication
    {
        $globalModule = new GlobalModule($container);
        $globalModule->bootstrap();
        $appBuilderClass = (string)\getenv('APP_BUILDER_API');

        if (!\class_exists($appBuilderClass) || !\is_subclass_of($appBuilderClass, IApplicationBuilder::class)) {
            throw new TypeError('Environment variable "APP_BUILDER_API" must implement ' . IApplicationBuilder::class);
        }

        return $container->resolve($appBuilderClass)
            ->withModule($globalModule)
            ->build();
    }

    /**
     * @inheritdoc
     */
    protected function getAppUri(): ?string
    {
        $appUrl = \getenv('APP_API_URL');

        if (empty($appUrl)) {
            return null;
        }

        return $appUrl;
    }
}
