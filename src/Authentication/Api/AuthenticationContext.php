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
final class AuthenticationContext
{
    /**
     * @param bool $isAuthenticated Whether or not the user was authenticated
     * @param int|null $userId The authenticated user ID, or null if not authenticated
     * @param string|null $accessToken The authenticated access token, or null if not authenticated
     */
    public function __construct(
        public bool $isAuthenticated,
        public ?int $userId = null,
        public ?string $accessToken = null
    ) {
    }
}
