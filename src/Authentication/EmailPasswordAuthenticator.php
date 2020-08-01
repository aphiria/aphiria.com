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

use InvalidArgumentException;
use PDO;

/**
 * Defines the authenticator for email and passwords
 */
final class EmailPasswordAuthenticator implements IAuthenticator
{
    /** @var PDO The DB instance */
    private PDO $pdo;

    /**
     * @param PDO $pdo The DB instance
     */
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * @inheritdoc
     * @throws InvalidArgumentException Thrown if the credential was not the correct type
     */
    public function authenticate(Credential $credential, ?int &$userId): void
    {
        // Reset the user ID, just in case
        $userId = null;

        if ($credential->getType() !== Credential::TYPE_EMAIL_PASSWORD) {
            throw new InvalidArgumentException('Expected email/password credential');
        }

        if (
            ($email = $credential->getValue('email')) === ''
            || ($password = $credential->getValue('password')) === ''
        ) {
            throw new InvalidArgumentException('Email/password cannot be empty');
        }

        $sql = <<<SQL
SELECT c.user_id, c.hashed_password
FROM user_credentials c
INNER JOIN users u ON u.user_id = c.user_id
WHERE u.is_deleted = FALSE AND c.is_active = TRUE and LOWER(u.email) = :email
SQL;
        $statement = $this->pdo->prepare($sql);
        $statement->execute(['email' => mb_strtolower(trim($email))]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        if ($row === false || $row === []) {
            throw new AuthenticationException('Invalid credentials');
        }

        if (!\password_verify($password, $row['hashed_password'])) {
            throw new InvalidArgumentException('Invalid credentials');
        }

        $userId = (int)$row['user_id'];
    }
}
