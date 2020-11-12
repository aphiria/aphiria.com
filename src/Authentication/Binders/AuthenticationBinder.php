<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Authentication\Binders;

use Aphiria\DependencyInjection\Binders\Binder;
use Aphiria\DependencyInjection\IContainer;
use App\Authentication\Api\AuthenticationContext;
use App\Authentication\IAuthenticationService;
use App\Authentication\SqlAuthenticationService;
use PDO;

/**
 * Defines the authentication binder
 */
final class AuthenticationBinder extends Binder
{
    /**
     * @inheritdoc
     */
    public function bind(IContainer $container): void
    {
        $container->bindInstance(
            IAuthenticationService::class,
            new SqlAuthenticationService($container->resolve(PDO::class), (string)\getenv('APP_WEB_URL'))
        );
        // Bind an unauthenticated context, and let the auth middleware overwrite it if authenticated
        $container->bindInstance(AuthenticationContext::class, new AuthenticationContext(false));
    }
}
