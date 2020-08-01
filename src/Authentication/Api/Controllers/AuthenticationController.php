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
use App\Authentication\AuthenticationException;
use App\Authentication\Credential;
use App\Authentication\IAuthenticator;

/**
 * Defines the authentication controller
 *
 * @Route("authentication")
 */
final class AuthenticationController
{
    /** @var IAuthenticator The authenticator */
    private IAuthenticator $authenticator;

    /**
     * @param IAuthenticator $authenticator The authenticator
     */
    public function __construct(IAuthenticator $authenticator)
    {
        $this->authenticator = $authenticator;
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
        $loginCredential = new Credential(
            Credential::TYPE_EMAIL_PASSWORD,
            ['email' => $login->email, 'password' => $login->password]
        );

        $userId = null;
        $this->authenticator->authenticate($loginCredential, $userId);
        // TODO: Create access token, set it to response
    }

    /**
     * Updates a user's password
     *
     * @Put("password")
     */
    public function updatePassword(): void
    {
        // TODO: How do I store the password?  Just in the body?  Or is it part of another model?
        // TODO: I need some way of verifying that this request is legit (probably using a nonce)
    }
}
