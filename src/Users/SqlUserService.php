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

use App\Authentication\IAuthenticationService;
use PDO;

/**
 * Defines the user service that is backed by SQL
 */
final class SqlUserService implements IUserService
{
    /**
     * @param PDO $pdo The PDO instance that SQL queries will use
     * @param IAuthenticationService $auth The auth service
     */
    public function __construct(private PDO $pdo, private IAuthenticationService $auth)
    {
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
        $this->auth->requestPasswordReset($user->getEmail());
        $this->pdo->commit();

        return $createdUser;
    }

    /**
     * @inheritdoc
     */
    public function deleteUser(int $id): void
    {
        $statement = $this->pdo->prepare('UPDATE users SET is_active = FALSE WHERE id = :id');
        $statement->execute(['id' => $id]);

        if ($statement->rowCount() === 0) {
            throw new UserNotFoundException("No user with ID $id was found");
        }
    }

    /**
     * @inheritdoc
     */
    public function getManyUsersById(array $ids): array
    {
        if (\count($ids) === 0) {
            return [];
        }

        $uniqueIds = \array_unique($ids);
        $in = str_repeat('?,', \count($uniqueIds) - 1) . '?';
        $statement = $this->pdo->prepare("SELECT id, email, first_name, last_name FROM users WHERE id IN ($in)");
        $statement->execute($uniqueIds);
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);

        if (\count($rows) !== \count($uniqueIds)) {
            throw new UserNotFoundException('One or more users did not exist');
        }

        $users = [];

        /** @var array{id: int, email: string, first_name: string, last_name: string} $row */
        foreach ($rows as $row) {
            $users[] = $this->createUserFromRow($row);
        }

        return $users;
    }

    /**
     * @inheritdoc
     */
    public function getUserById(int $id): User
    {
        $statement = $this->pdo->prepare('SELECT id, email, first_name, last_name FROM users WHERE id = :id');
        $statement->execute(['id' => $id]);
        /** @var array{id: int, email: string, first_name: string, last_name: string}|false $row */
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        if ($row === false) {
            throw new UserNotFoundException("No user with ID $id was found");
        }

        return $this->createUserFromRow($row);
    }

    /**
     * Creates a user from a SQL row
     *
     * @param array{id: int, email: string, first_name: string, last_name: string} $row The SQL row
     * @return User The user
     */
    private function createUserFromRow(array $row): User
    {
        return new User((int)$row['id'], $row['email'], $row['first_name'], $row['last_name']);
    }
}
