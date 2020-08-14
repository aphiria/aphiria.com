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
 * Defines the change password DTO
 */
final class ChangePasswordDto
{
    /** @var string|null The nonce to use to authenticate the reset request, or null if the user is logged in */
    public ?string $nonce = null;
    /** @var string|null The user's current password if the user is logged in, otherwise null */
    public ?string $currPassword = null;
    /** @var string The new password */
    public string $newPassword;
}
