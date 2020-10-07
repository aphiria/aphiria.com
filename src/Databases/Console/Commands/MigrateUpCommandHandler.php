<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Databases\Console\Commands;

use Aphiria\Console\Commands\Attributes\Command;
use Aphiria\Console\Commands\ICommandHandler;
use Aphiria\Console\Input\Input;
use Aphiria\Console\Output\IOutput;
use PDO;
use PDOException;

/**
 * Defines the migrate-up command handler
 */
#[Command('db:migrate-up', description: 'Runs the up database migration')]
final class MigrateUpCommandHandler implements ICommandHandler
{
    /**
     * @param PDO $pdo The DB instance
     */
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * @inheritdoc
     */
    public function handle(Input $input, IOutput $output)
    {
        $this->pdo->beginTransaction();

        try {
            $sql = \file_get_contents(__DIR__ . '/../../../../databases/migrate-up.sql');
            $this->pdo->exec($sql);
            $this->pdo->commit();
            $output->writeln('<success>Successfully migrated</success>');
        } catch (PDOException $ex) {
            $this->pdo->rollBack();
            throw $ex;
        }
    }
}
