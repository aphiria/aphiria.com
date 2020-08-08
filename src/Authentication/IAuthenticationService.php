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
    // TODO: I need a way of setting the initial password for a user.  How do I do that?

    /**
     * Authenticates an access token
     *
     * @param int $userId The user ID to authenticate
     * @param string $accessToken The access token to authenticate
     * @return bool True if the access token is valid, otherwise false
     */
    public function authenticateAccessToken(int $userId, string $accessToken): bool;

    /**
     * Changes a logged-in user's password
     *
     * @param int $userId The ID of the user whose password we're changing
     * @param string $currPassword The user's current password
     * @param string $newPassword The new password
     * @throws IncorrectPasswordException Thrown if the password could not be changed
     * @throws InvalidPasswordException Thrown if the new password isn't a valid password
     */
    public function changePassword(int $userId, string $currPassword, string $newPassword): void;

    /**
     * Attempts to log in a user
     *
     * @param string $email The email address
     * @param string $password The password
     * @return AuthenticationResult The authentication result
     */
    public function logIn(string $email, string $password): AuthenticationResult;

    /**
     * Logs out a user
     *
     * @param int $userId The user ID to log out
     * @param string $accessToken The access token to log out
     */
    public function logOut(int $userId, string $accessToken): void;

    /**
     * Requests a password reset
     *
     * @param string $email The email of the user whose password we want to reset
     */
    public function requestPasswordReset(string $email): void;
}
