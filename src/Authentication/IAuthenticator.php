<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Authentication;

/**
 * Defines the interface for authenticators to implement
 */
interface IAuthenticator
{
    /**
     * Authenticates a credential
     *
     * @param Credential $credential The credential to authenticate
     * @param int|null $userId Will be set to the user ID on success, otherwise null
     * @throws AuthenticationException Thrown if there was an error authenticating
     */
    public function authenticate(Credential $credential, ?int &$userId): void;
}
