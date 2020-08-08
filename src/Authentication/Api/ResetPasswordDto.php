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
 * Defines the DTO for resetting a password
 */
final class ResetPasswordDto
{
    /** @var int The ID of the user whose password we're resetting */
    public int $userId;
    /** @var string The nonce to use to authenticate the reset request */
    public string $nonce;
    /** @var string The new password */
    public string $newPassword;
}
