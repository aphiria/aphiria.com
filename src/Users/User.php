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
    /** @var int The user ID */
    private int $id;
    /** The email address of the user */
    private string $email;
    /** @var string The first name of the user */
    private string $firstName;
    /** @var string The last name of the user */
    private string $lastName;

    /**
     * @param int $id The user ID
     * @param string $email The email address of the user
     * @param string $firstName The first name of the user
     * @param string $lastName The last name of the user
     */
    public function __construct(int $id, string $email, string $firstName, string $lastName)
    {
        $this->id = $id;
        $this->email = $email;
        $this->firstName = $firstName;
        $this->lastName = $lastName;
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
