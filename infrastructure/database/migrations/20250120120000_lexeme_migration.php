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
 * Defines the lexeme migration
 */
class LexemeMigration extends AbstractMigration
{
    /**
     * Creates the tables necessary for lexemes
     */
    public function change(): void
    {
        $this->execute('DROP TABLE IF EXISTS lexemes');
        $this
            ->table('lexemes', ['id' => false, 'primary_key' => ['id']])
            ->addColumn('id', 'integer', ['identity' => true, 'null' => false])
            ->addColumn('h1_inner_text', 'text', ['null' => true])
            ->addColumn('h2_inner_text', 'text', ['null' => true])
            ->addColumn('h3_inner_text', 'text', ['null' => true])
            ->addColumn('h4_inner_text', 'text', ['null' => true])
            ->addColumn('h5_inner_text', 'text', ['null' => true])
            ->addColumn('context', 'text', ['null' => false])
            ->addColumn('link', 'text', ['null' => false])
            ->addColumn('html_element_type', 'text', ['null' => false])
            ->addColumn('inner_text', 'text', ['null' => false])
            ->addColumn('html_element_weight', 'char', ['null' => false])
            ->create();

        // Manually add tsvector columns because they're not natively supported by Phinx
        $this->execute('ALTER TABLE lexemes ADD COLUMN english_lexemes tsvector');
        $this->execute('ALTER TABLE lexemes ADD COLUMN simple_lexemes tsvector');

        // Add indices for these columns
        $this->execute('CREATE INDEX english_lexeme_idx ON lexemes USING gin(english_lexemes)');
        $this->execute('CREATE INDEX simple_lexeme_idx ON lexemes USING gin(simple_lexemes)');
    }
}
