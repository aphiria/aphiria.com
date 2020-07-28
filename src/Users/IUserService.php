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
 * Defines the interface for user services to implement
 */
interface IUserService
{
    /**
     * Adds a user
     *
     * @param User $user The user to add
     * @return User The created user
     */
    public function addUser(User $user): User;

    /**
     * Deletes a user
     *
     * @param int $userId The ID of the user to delete
     * @throws UserNotFoundException Thrown if no user exists with the input ID
     */
    public function deleteUser(int $userId): void;

    /**
     * Gets the user by ID
     *
     * @param int $userId The ID of the user to get
     * @return User The retrieved user
     * @throws UserNotFoundException Thrown if the user did not exist
     */
    public function getUserById(int $userId): User;
}
