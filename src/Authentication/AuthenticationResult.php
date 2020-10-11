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
    /**
     * @param bool $isAuthenticated Whether or not the user was authenticated
     * @param string|null $errorMessage The error message if there was one, otherwise null
     * @param int|null $userId The authenticated user ID, or null if not authenticated
     * @param string|null $accessToken The authenticated access token, or null if not authenticated
     * @param DateTime|null $accessTokenExpiration The authenticated access token's expiration, or null if not authenticated
     */
    public function __construct(
        public bool $isAuthenticated,
        public ?string $errorMessage = null,
        public ?int $userId = null,
        public ?string $accessToken = null,
        public ?DateTime $accessTokenExpiration = null
    ) {
    }
}
