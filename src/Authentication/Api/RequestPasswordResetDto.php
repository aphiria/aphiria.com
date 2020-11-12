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
 * Defines the DTO for requesting a password reset
 */
final class RequestPasswordResetDto
{
    /** @var string The email address of the user whose password we want to reset */
    public string $email = '';
}
