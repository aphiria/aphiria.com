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
 * Defines the authentication service
 */
interface IAuthenticationService
{
    /**
     * Attempts to log in a user
     *
     * @param string $email The email address
     * @param string $password The password
     * @throws AuthenticationException Thrown if the credentials were invalid
     */
    public function logIn(string $email, string $password): void;

    /**
     * Requests a password reset
     *
     * @param string $email The email of the user whose password we want to reset
     */
    public function requestPasswordReset(string $email): void;

    /**
     * Updates a user's password
     *
     * @param int $userId The ID of the user whose password we're updating
     * @param string $newPassword The new password
     */
    public function updatePassword(int $userId, string $newPassword): void;
}
