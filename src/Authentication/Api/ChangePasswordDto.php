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
    /** @var string The user's current password */
    public string $currPassword;
    /** @var string The new password */
    public string $newPassword;
}
