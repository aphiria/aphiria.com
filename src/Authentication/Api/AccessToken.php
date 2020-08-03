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
 * Defines an access token
 */
final class AccessToken
{
    /** @var int The ID of the user whose access token this is */
    public int $userId;
    /** @var string The access token value */
    public string $accessToken;

    /**
     * @param int $userId The ID of the user whose access token this is
     * @param string $accessToken The access token value
     */
    public function __construct(int $userId, string $accessToken)
    {
        $this->userId = $userId;
        $this->accessToken = $accessToken;
    }
}
