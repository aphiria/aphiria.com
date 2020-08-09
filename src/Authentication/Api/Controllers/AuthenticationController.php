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
use Aphiria\Net\Http\HttpStatusCodes;
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Annotations\Middleware;
use Aphiria\Routing\Annotations\Post;
use Aphiria\Routing\Annotations\Put;
use Aphiria\Routing\Annotations\RouteGroup;
use App\Authentication\Api\AuthContext;
use App\Authentication\Api\ChangePasswordDto;
use App\Authentication\Api\LoginDto;
use App\Authentication\Api\Middleware\Authenticate;
use App\Authentication\Api\RequestPasswordResetDto;
use App\Authentication\Api\ResetPasswordDto;
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
    /** @var AuthContext The current auth context */
    private AuthContext $authContext;

    /**
     * @param IAuthenticationService $auth The authentication service
     * @param AuthContext $authContext The current auth context
     */
    public function __construct(IAuthenticationService $auth, AuthContext $authContext)
    {
        $this->auth = $auth;
        $this->authContext = $authContext;
    }

    /**
     * Changes a logged-in user's password
     *
     * @param ChangePasswordDto $changePassword The password change DTO
     * @Put("password")
     * @Middleware(Authenticate::class)
     * @throws IncorrectPasswordException|InvalidPasswordException Thrown if the password was incorrect or invalid
     */
    public function changePassword(ChangePasswordDto $changePassword): void
    {
        $this->auth->changePassword(
            $this->authContext->getUserId(),
            $changePassword->currPassword,
            $changePassword->newPassword
        );
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
            return $this->responseFactory->createResponse(
                $this->request,
                HttpStatusCodes::HTTP_UNAUTHORIZED,
                null,
                $authenticationResult->errorMessage
            );
        }

        $response = $this->responseFactory->createResponse($this->request, HttpStatusCodes::HTTP_OK);
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
     * @Post("password/reset")
     */
    public function requestPasswordReset(RequestPasswordResetDto $passwordResetRequest): void
    {
        $this->auth->requestPasswordReset($passwordResetRequest->email);
    }

    /**
     * Resets a user's password
     *
     * @param ResetPasswordDto $resetPassword The reset password DTO
     * @Put("password/reset")
     * @throws InvalidPasswordException Thrown if the new password was invalid
     * @throws PasswordResetNonceExpiredException Thrown if the nonce expired
     */
    public function resetPassword(ResetPasswordDto $resetPassword): void
    {
        $this->auth->resetPassword($resetPassword->userId, $resetPassword->nonce, $resetPassword->newPassword);
    }
}
