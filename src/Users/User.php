<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Users;

/**
 * Defines a user
 */
final class User
{
    /**
     * @param int $id The user ID
     * @param string $email The email address of the user
     * @param string $firstName The first name of the user
     * @param string $lastName The last name of the user
     */
    public function __construct(
        private int $id,
        private string $email,
        private string $firstName,
        private string $lastName
    ) {
    }

    /**
     * Gets the ID
     *
     * @return int The ID
     */
    public function getId(): int
    {
        return $this->id;
    }

    /**
     * Gets the email address
     *
     * @return string The email address
     */
    public function getEmail(): string
    {
        return $this->email;
    }

    /**
     * Gets the first name
     *
     * @return string The first name
     */
    public function getFirstName(): string
    {
        return $this->firstName;
    }

    /**
     * Gets the last name
     *
     * @return string The last name
     */
    public function getLastName(): string
    {
        return $this->lastName;
    }
}
