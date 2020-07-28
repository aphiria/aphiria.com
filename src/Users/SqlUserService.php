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

use PDO;

/**
 * Defines the user service that is backed by SQL
 */
final class SqlUserService implements IUserService
{
    /** @var PDO The PDO instance that SQL queries will use */
    private PDO $pdo;

    /**
     * @param PDO $pdo The PDO instance that SQL queries will use
     */
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * @inheritdoc
     */
    public function addUser(User $user): User
    {
        $statement = $this->pdo->prepare('INSERT INTO users (email, first_name, last_name) VALUES (:email, :firstName, :lastName)');
        $this->pdo->beginTransaction();
        $statement->execute([
            'email' => $user->getEmail(),
            'firstName' => $user->getFirstName(),
            'lastName' => $user->getLastName()
        ]);
        $createdUser = new User((int)$this->pdo->lastInsertId(), $user->getEmail(), $user->getFirstName(), $user->getLastName());
        $this->pdo->commit();

        return $createdUser;
    }

    /**
     * @inheritdoc
     */
    public function deleteUser(int $userId): void
    {
        $statement = $this->pdo->prepare('DELETE ROM users WHERE id = :id');
        $statement->execute(['id' => $userId]);

        if ($statement->rowCount() === 0) {
            throw new UserNotFoundException("No user with ID $userId was found");
        }
    }

    /**
     * @inheritdoc
     */
    public function getUserById(int $userId): User
    {
        $statement = $this->pdo->prepare('SELECT id, email, first_name, last_name FROM users WHERE id = :id');
        $statement->execute(['id' => $userId]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        if ($row === false) {
            throw new UserNotFoundException("No user with ID $userId was found");
        }

        return new User((int)$row['id'], $row['email'], $row['first_name'], $row['last_name']);
    }
}
