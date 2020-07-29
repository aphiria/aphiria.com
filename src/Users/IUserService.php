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
     * @param int $id The ID of the user to delete
     * @throws UserNotFoundException Thrown if no user exists with the input ID
     */
    public function deleteUser(int $id): void;

    /**
     * Gets many users by ID
     *
     * @param int[] $ids The list of users to get
     * @return User[] The list of users to return
     * @throws UserNotFoundException Thrown if any of the users did not exist
     */
    public function getManyUsersById(array $ids): array;

    /**
     * Gets the user by ID
     *
     * @param int $id The ID of the user to get
     * @return User The retrieved user
     * @throws UserNotFoundException Thrown if the user did not exist
     */
    public function getUserById(int $id): User;
}
