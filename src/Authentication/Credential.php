<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Authentication;

/**
 * Defines an authentication credential
 */
final class Credential
{
    public const TYPE_EMAIL_PASSWORD = 'TYPE_EMAIL_PASSWORD';
    public const TYPE_ACCESS_TOKEN = 'TYPE_ACCESS_TOKEN';
    /** @var string The type of credential this is */
    private string $type;
    /** @var array The mapping of value names to their values */
    private array $values;

    /**
     * @param string $type The type of credential this is
     * @param array $values The mapping of value names to their values
     */
    public function __construct(string $type, array $values)
    {
        $this->type = $type;
        $this->values = $values;
    }

    /**
     * Gets the type of credential this is
     *
     * @return string Gets the type of credential
     */
    public function getType(): string
    {
        return $this->type;
    }

    /**
     * Gets a particular value from the credential
     *
     * @param string $name The name of the value to get
     * @return mixed The value
     */
    public function getValue(string $name)
    {
        if (!array_key_exists($name, $this->values)) {
            return null;
        }

        return $this->values[$name];
    }

    /**
     * Gets all the values in the credential
     *
     * @return array The mapping of names to values in the credential
     */
    public function getValues(): array
    {
        return $this->values;
    }
}
