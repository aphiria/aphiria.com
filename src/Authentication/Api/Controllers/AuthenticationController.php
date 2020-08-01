<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Authentication\Api\Controllers;

use Aphiria\Routing\Annotations\Post;
use Aphiria\Routing\Annotations\Put;
use Aphiria\Routing\Annotations\Route;
use App\Authentication\Api\LoginDto;
use App\Authentication\Api\RequestPasswordResetDto;
use App\Authentication\Api\UpdatePasswordDto;
use App\Authentication\AuthenticationException;
use App\Authentication\IAuthenticationService;

/**
 * Defines the authentication controller
 *
 * @Route("authentication")
 */
final class AuthenticationController
{
    /** @var IAuthenticationService The authentication service */
    private IAuthenticationService $auth;

    /**
     * @param IAuthenticationService $auth The authentication service
     */
    public function __construct(IAuthenticationService $auth)
    {
        $this->auth = $auth;
    }

    /**
     * Attempts to log in a user
     *
     * @param LoginDto $login The login data
     * @throws AuthenticationException Thrown if the credentials could not be authenticated
     * @Post("login")
     */
    public function logIn(LoginDto $login): void
    {
        $userId = null;
        $this->auth->logIn($login->email, $login->password);
        // TODO: Create access token, set it to response
    }

    /**
     * Requests a password reset for a user
     *
     * @param RequestPasswordResetDto $passwordReset The password reset DTO
     * @Post("password/reset")
     */
    public function requestPasswordReset(RequestPasswordResetDto $passwordReset): void
    {
        $this->auth->requestPasswordReset($passwordReset->email);
    }

    /**
     * Updates a user's password
     *
     * @param UpdatePasswordDto $updatePassword
     * @Put("password")
     */
    public function updatePassword(UpdatePasswordDto $updatePassword): void
    {
        // Where/how do we pass in the user ID?
        // TODO: How do we trust that the user ID that's passed in is legit?
        // TODO: I need some way of verifying that this request is legit (probably using a nonce)
        $this->auth->updatePassword(-1, $updatePassword->newPassword);
    }
}
