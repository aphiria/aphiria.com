<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Posts;

use Exception;

/**
 * Defines the exception that's thrown when a post is not found
 */
final class PostNotFoundException extends Exception
{
}
