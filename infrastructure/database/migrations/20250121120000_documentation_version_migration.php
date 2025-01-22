<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

/**
 * Defines the documentation version migration
 */
class DocumentationVersionMigration extends AbstractMigration
{
    /**
     * Adds the "version" column
     */
    public function up(): void
    {
        $this->table('lexemes')
            ->addColumn('version', 'text')
            ->addIndex('version')
            ->update();
    }

    /**
     * Removes the "version" column
     */
    public function down(): void
    {
        $this->table('lexemes')
            ->removeColumn('version')
            ->update();
    }
}
