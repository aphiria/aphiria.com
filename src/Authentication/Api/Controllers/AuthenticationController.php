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
use Aphiria\Routing\Annotations\Post;
use Aphiria\Routing\Annotations\Put;
use Aphiria\Routing\Annotations\Route;
use App\Authentication\Api\LoginDto;
use App\Authentication\Api\RequestPasswordResetDto;
use App\Authentication\Api\UpdatePasswordDto;
use App\Authentication\IAuthenticationService;
use App\Authentication\SqlAuthenticationService;
use DateTime;
use JsonException;

/**
 * Defines the authentication controller
 *
 * @Route("authentication")
 */
final class AuthenticationController extends Controller
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
