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
 * Defines the update password DTO
 */
final class UpdatePasswordDto
{
    /** @var string The new password */
    public string $newPassword;
}
