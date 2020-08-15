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

use Aphiria\Api\Controllers\Controller;
use Aphiria\Net\Http\Headers\Cookie;
use Aphiria\Net\Http\HttpException;
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Annotations\Middleware;
use Aphiria\Routing\Annotations\Post;
use Aphiria\Routing\Annotations\Put;
use Aphiria\Routing\Annotations\RouteGroup;
use App\Authentication\Api\AuthenticationContext;
use App\Authentication\Api\ChangePasswordDto;
use App\Authentication\Api\LoginDto;
use App\Authentication\Api\Middleware\Authenticate;
use App\Authentication\Api\RequestPasswordResetDto;
use App\Authentication\IAuthenticationService;
use App\Authentication\IncorrectPasswordException;
use App\Authentication\InvalidPasswordException;
use App\Authentication\PasswordResetNonceExpiredException;
use App\Authentication\SqlAuthenticationService;
use DateTime;
use JsonException;

/**
 * Defines the authentication controller
 *
 * @RouteGroup("authentication")
 */
final class AuthenticationController extends Controller
{
    /** @var IAuthenticationService The authentication service */
    private IAuthenticationService $auth;
    /** @var AuthenticationContext The current auth context */
    private AuthenticationContext $authContext;

    /**
     * @param IAuthenticationService $auth The authentication service
     * @param AuthenticationContext $authContext The current auth context
     */
    public function __construct(IAuthenticationService $auth, AuthenticationContext $authContext)
    {
        $this->auth = $auth;
        $this->authContext = $authContext;
    }

    /**
     * Changes a user's password
     *
     * @param int $userId The Id of the user who's password we're changing
     * @param ChangePasswordDto $changePassword The password change DTO
     * @return IResponse The response
     * @Put("users/:userId/password")
     * @Middleware(Authenticate::class, attributes={"allowUnauthenticatedUsers":true})
     * @throws IncorrectPasswordException|InvalidPasswordException Thrown if the current password was incorrect or invalid (for logged in users only)
     * @throws PasswordResetNonceExpiredException Thrown if the password reset nonce expired
     * @throws HttpException Thrown if the response could not be negotiated
     */
    public function changePassword(int $userId, ChangePasswordDto $changePassword): IResponse
    {
        if ($this->authContext->isAuthenticated) {
            if ($this->authContext->userId !== $userId) {
                return $this->unauthorized("User {$this->authContext->userId} is not authorized to change user $userId's password");
            }

            if (!isset($changePassword->currPassword, $changePassword->newPassword)) {
                return $this->badRequest('Current and new passwords cannot be empty');
            }

            $this->auth->changePassword($userId, $changePassword->currPassword, $changePassword->newPassword);
        } else {
            if (!isset($changePassword->nonce, $changePassword->newPassword)) {
                return $this->badRequest('Nonce and new password must be set if the user is not authenticated');
            }

            $this->auth->resetPassword($userId, $changePassword->nonce, $changePassword->newPassword);
        }

        return $this->noContent();
    }

    /**
     * Attempts to log in a user
     *
     * @param LoginDto $login The login data
     * @return IResponse The login response
     * @Post("login")
     * @throws HttpException Thrown if there was an error creating the response
     * @throws JsonException Thrown if there was an error encoding the access token
     */
    public function logIn(LoginDto $login): IResponse
    {
        $authenticationResult = $this->auth->logIn($login->email, $login->password);

        if (!$authenticationResult->isAuthenticated) {
            return $this->unauthorized($authenticationResult->errorMessage);
        }

        $response = $this->ok();
        $this->responseFormatter->setCookie(
            $response,
            new Cookie(
                SqlAuthenticationService::ACCESS_TOKEN_COOKIE_NAME,
                \json_encode([
                    'userId' => $authenticationResult->userId,
                    'accessToken' => $authenticationResult->accessToken
                ], JSON_THROW_ON_ERROR),
                $authenticationResult->accessTokenExpiration->diff(new DateTime())->s
            )
        );

        return $response;
    }

    /**
     * Requests a password reset for a user
     *
     * @param RequestPasswordResetDto $passwordResetRequest The password reset DTO
     * @return IResponse The accepted response
     * @Post("password/reset")
     */
    public function requestPasswordReset(RequestPasswordResetDto $passwordResetRequest): IResponse
    {
        $this->auth->requestPasswordReset($passwordResetRequest->email);

        return $this->accepted();
    }
}
