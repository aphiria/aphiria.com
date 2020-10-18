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
use Aphiria\Routing\Attributes\Middleware;
use Aphiria\Routing\Attributes\Post;
use Aphiria\Routing\Attributes\Put;
use Aphiria\Routing\Attributes\RouteGroup;
use App\Authentication\Api\AuthenticationContext;
use App\Authentication\Api\ChangePasswordDto;
use App\Authentication\Api\LoginDto;
use App\Authentication\Api\Middleware\Authenticate;
use App\Authentication\Api\RequestPasswordResetDto;
use App\Authentication\IAuthenticationService;
use App\Authentication\IncorrectPasswordException;
use App\Authentication\InvalidPasswordException;
use App\Authentication\InvalidPasswordResetException;
use App\Authentication\PasswordResetNonceExpiredException;
use App\Authentication\SqlAuthenticationService;
use App\Authentication\UnauthorizedPasswordChangeException;
use DateTime;
use JsonException;

/**
 * Defines the authentication controller
 */
#[RouteGroup('authentication')]
final class AuthenticationController extends Controller
{
    /**
     * @param IAuthenticationService $auth The authentication service
     * @param AuthenticationContext $authContext The current auth context
     */
    public function __construct(private IAuthenticationService $auth, private AuthenticationContext $authContext)
    {
    }

    /**
     * Changes a user's password
     *
     * @param int $userId The Id of the user who's password we're changing
     * @param ChangePasswordDto $changePassword The password change DTO
     * @return IResponse The response
     * @throws IncorrectPasswordException|InvalidPasswordException Thrown if the current password was incorrect or invalid (for logged in users only)
     * @throws PasswordResetNonceExpiredException Thrown if the password reset nonce expired
     * @throws HttpException Thrown if the response could not be negotiated
     * @throws UnauthorizedPasswordChangeException Thrown if the password change was not authorized
     * @throws InvalidPasswordResetException Thrown if the password reset was invalid
     */
    #[
        Put('users/:userId/password'),
        Middleware(Authenticate::class, parameters: ['allowUnauthenticatedUsers' => true])
    ]
    public function changePassword(int $userId, ChangePasswordDto $changePassword): IResponse
    {
        if ($this->authContext->isAuthenticated) {
            if ($this->authContext->userId !== $userId) {
                throw new UnauthorizedPasswordChangeException("User {$this->authContext->userId} is not authorized to change user {$userId}'s password");
            }

            if (!isset($changePassword->currPassword, $changePassword->newPassword)) {
                throw new InvalidPasswordException('Current and new passwords cannot be empty');
            }

            $this->auth->changePassword($userId, $changePassword->currPassword, $changePassword->newPassword);
        } else {
            if (!isset($changePassword->nonce, $changePassword->newPassword)) {
                throw new InvalidPasswordResetException('Nonce and new password must be set if the user is not authenticated');
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
     * @throws HttpException Thrown if there was an error creating the response
     * @throws JsonException Thrown if there was an error encoding the access token
     * @throws IncorrectPasswordException Thrown if the password was incorrect
     */
    #[Post('login')]
    public function logIn(LoginDto $login): IResponse
    {
        $authenticationResult = $this->auth->logIn($login->email, $login->password);

        if (!$authenticationResult->isAuthenticated) {
            throw new IncorrectPasswordException($authenticationResult->errorMessage);
        }

        $response = $this->noContent();
        $cookieMaxAge = $authenticationResult->accessTokenExpiration->getTimestamp() - (new DateTime())->getTimestamp();
        // Set an HTTP-only cookie with the access token
        $this->responseFormatter->setCookie(
            $response,
            new Cookie(
                SqlAuthenticationService::ACCESS_TOKEN_COOKIE_NAME,
                \json_encode([
                    'userId' => $authenticationResult->userId,
                    'accessToken' => $authenticationResult->accessToken
                ], JSON_THROW_ON_ERROR),
                $cookieMaxAge,
                '/',
                \getenv('APP_COOKIE_DOMAIN'),
                (bool)\getenv('APP_COOKIE_SECURE')
            )
        );
        // Set a browser-readable cookie letting it know the user is authenticated
        $this->responseFormatter->setCookie(
            $response,
            new Cookie(
                SqlAuthenticationService::LOGGED_IN_COOKIE_NAME,
                '1',
                $cookieMaxAge,
                '/',
                \getenv('APP_COOKIE_DOMAIN'),
                (bool)\getenv('APP_COOKIE_SECURE'),
                false
            )
        );

        return $response;
    }

    /**
     * Logs the user out of the current session
     *
     * @return IResponse The response with the deleted cookies
     * @throws HttpException Thrown if the response could not be negotiated
     */
    #[Post('logout')]
    public function logOut(): IResponse
    {
        if ($this->authContext->isAuthenticated) {
            $this->auth->logOut($this->authContext->userId, $this->authContext->accessToken);
        }

        $response = $this->noContent();
        $this->responseFormatter->deleteCookie(
            $response,
            SqlAuthenticationService::ACCESS_TOKEN_COOKIE_NAME,
            '/',
            \getenv('APP_COOKIE_DOMAIN'),
            (bool)\getenv('APP_COOKIE_SECURE')
        );
        $this->responseFormatter->deleteCookie(
            $response,
            SqlAuthenticationService::LOGGED_IN_COOKIE_NAME,
            '/',
            \getenv('APP_COOKIE_DOMAIN'),
            (bool)\getenv('APP_COOKIE_SECURE'),
            false
        );

        return $response;
    }

    /**
     * Requests a password reset for a user
     *
     * @param RequestPasswordResetDto $passwordResetRequest The password reset DTO
     * @return IResponse The accepted response
     * @throws HttpException Thrown if the response could not be negotiated
     */
    #[Post('password/reset')]
    public function requestPasswordReset(RequestPasswordResetDto $passwordResetRequest): IResponse
    {
        $this->auth->requestPasswordReset($passwordResetRequest->email);

        return $this->accepted();
    }
}
