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
use Aphiria\Console\Input\Option;
use Aphiria\Console\Input\OptionTypes;

/**
 * Defines the command for creating docs
 */
final class BuildDocsCommand extends Command
{
    public function __construct()
    {
        parent::__construct(
            'docs:build',
            [],
            [new Option('skip-indexing', null, OptionTypes::NO_VALUE, 'If enabled, indexing docs is skipped')],
            'Builds our documentation into searchable HTML'
        );
    }
}
