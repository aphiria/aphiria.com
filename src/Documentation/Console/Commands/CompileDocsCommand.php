<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Console\Commands;

use Aphiria\Console\Commands\Command;

/**
 * Defines the command for compiling docs
 */
final class CompileDocsCommand extends Command
{
    public function __construct()
    {
        parent::__construct('compile:docs', [], [], 'Compiles our documentation into searchable HTML');
    }
}
