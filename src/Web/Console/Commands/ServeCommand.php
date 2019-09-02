<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web\Console\Commands;

use Aphiria\Console\Commands\Command;

/**
 * Defines the command for running the site locally
 */
final class ServeCommand extends Command
{
    public function __construct()
    {
        parent::__construct('app:serve', [], [], 'Runs the site locally');
    }
}
