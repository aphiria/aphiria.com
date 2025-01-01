<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation;

use Exception;

/**
 * Defines the exception that's thrown if there was an error compiling the docs to HTML
 */
final class HtmlCompilationException extends Exception
{
}
