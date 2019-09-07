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
 * Defines the command for indexing docs
 */
final class IndexDocsCommand extends Command
{
    public function __construct()
    {
        parent::__construct(
            'docs:index',
            [],
            [],
            'Indexes our documentation for searchability'
        );
    }
}
