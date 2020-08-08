<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Users\Binders;

use Aphiria\DependencyInjection\Binders\Binder;
use Aphiria\DependencyInjection\IContainer;
use App\Authentication\IAuthenticationService;
use App\Users\IUserService;
use App\Users\SqlUserService;
use PDO;

/**
 * Defines the user binder
 */
final class UserBinder extends Binder
{
    /**
     * @inheritdoc
     */
    public function bind(IContainer $container): void
    {
        $userService = new SqlUserService(
            $container->resolve(PDO::class),
            $container->resolve(IAuthenticationService::class)
        );
        $container->bindInstance(IUserService::class, $userService);
    }
}
