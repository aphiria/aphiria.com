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
 * Defines an access token cookie's contents
 */
final class AccessTokenCookie
{
    /**
     * @param int $userId The ID of the user whose access token this is
     * @param string $accessToken The access token value
     */
    public function __construct(public int $userId, public string $accessToken)
    {
    }
}
