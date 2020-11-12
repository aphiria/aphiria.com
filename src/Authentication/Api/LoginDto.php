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
 * Defines the login DTO
 */
final class LoginDto
{
    /** @var string The email address */
    public string $email = '';
    /** @var string The password */
    public string $password = '';
}
