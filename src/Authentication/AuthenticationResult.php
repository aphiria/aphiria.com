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

use DateTime;

/**
 * Defines an authentication result
 */
final class AuthenticationResult
{
    /** @var bool Whether or not the user was authenticated */
    public bool $isAuthenticated = false;
    /** @var string|null The error message if there was one, otherwise null */
    public ?string $errorMessage = null;
    /** @var int|null The authenticated user ID, or null if not authenticated */
    public ?int $userId = null;
    /** @var string|null The authenticated access token, or null if not authenticated */
    public ?string $accessToken = null;
    /** @var DateTime|null The authenticated access token's expiration, or null if not authenticated */
    public ?DateTime $accessTokenExpiration = null;

    /**
     * @param bool $isAuthenticated Whether or not the user was authenticated
     * @param string|null $errorMessage The error message if there was one, otherwise null
     * @param int|null $userId The authenticated user ID, or null if not authenticated
     * @param string|null $accessToken The authenticated access token, or null if not authenticated
     * @param DateTime|null $accessTokenExpiration The authenticated access token's expiration, or null if not authenticated
     */
    public function __construct(
        bool $isAuthenticated,
        string $errorMessage = null,
        int $userId = null,
        string $accessToken = null,
        DateTime $accessTokenExpiration = null
    ) {
        $this->isAuthenticated = $isAuthenticated;
        $this->errorMessage = $errorMessage;
        $this->userId = $userId;
        $this->accessToken = $accessToken;
        $this->accessTokenExpiration = $accessTokenExpiration;
    }
}
