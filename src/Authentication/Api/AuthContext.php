<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Authentication\Api;

/**
 * Defines the current authentication context
 */
final class AuthContext
{
    /** @var bool Whether or not the user was authenticated */
    private bool $isAuthenticated;
    /** @var int|null The authenticated user ID, or null if not authenticated */
    private ?int $userId;
    /** @var string|null The authenticated access token, or null if not authenticated */
    private ?string $accessToken;

    /**
     * @param bool $isAuthenticated Whether or not the user was authenticated
     * @param int|null $userId The authenticated user ID, or null if not authenticated
     * @param string|null $accessToken The authenticated access token, or null if not authenticated
     */
    public function __construct(bool $isAuthenticated, int $userId = null, string $accessToken = null)
    {
        $this->isAuthenticated = $isAuthenticated;
        $this->userId = $userId;
        $this->accessToken = $accessToken;
    }

    /**
     * Gets the current user's access token
     *
     * @return string|null The user's access token if authenticated, otherwise null
     */
    public function getAccessToken(): ?string
    {
        return $this->accessToken;
    }

    /**
     * Gets the current user ID
     *
     * @return int|null The authenticated user ID, or null if not authenticated
     */
    public function getUserId(): ?int
    {
        return $this->userId;
    }

    /**
     * Gets whether or not the user was authenticated
     *
     * @return bool True if the user is authenticated, otherwise false
     */
    public function isAuthenticated(): bool
    {
        return $this->isAuthenticated;
    }
}
