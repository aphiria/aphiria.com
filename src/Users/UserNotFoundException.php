<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Users;

use Exception;

/**
 * Defines the exception that's thrown when a user is not found
 */
final class UserNotFoundException extends Exception
{
}
