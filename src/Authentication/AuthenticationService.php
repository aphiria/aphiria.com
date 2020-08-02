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

use DateInterval;
use DateTime;
use PDO;

/**
 * Defines the authentication service
 */
final class AuthenticationService implements IAuthenticationService
{
    public const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
    private const ACCESS_TOKEN_COOKIE_TTL_SECONDS = 30 * 60;
    /** @var PDO The DB instance */
    private PDO $pdo;
    /** @var string The  */

    /**
     * @param PDO $pdo The DB instance
     */
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * @inheritdoc
     */
    public function authenticateAccessToken(int $userId, string $accessToken): bool
    {
        $sql = <<<SQL
SELECT count(id)
FROM user_access_tokens
WHERE user_id = :userId AND is_active = TRUE AND expiration_date > NOW() AND hashed_access_token = SHA256(CONCAT(salt, :accessToken))
SQL;
        $statement = $this->pdo->prepare($sql);
        $statement->execute(['userId' => $userId, 'accessToken' => $accessToken]);
        $row = $statement->fetchColumn();

        return $row === 1;
    }

    /**
     * @inheritdoc
     */
    public function logIn(string $email, string $password): AuthenticationResult
    {
        if ($email === '' || $password === '') {
            return new AuthenticationResult(false, 'Email/password cannot be empty');
        }

        $this->pdo->beginTransaction();
        $authenticateCredentialsSql = <<<SQL
SELECT c.user_id, c.hashed_password
FROM user_credentials c
INNER JOIN users u ON u.user_id = c.user_id
WHERE u.is_deleted = FALSE AND c.is_active = TRUE and LOWER(u.email) = :email
SQL;
        $authenticateCredentialsStatement = $this->pdo->prepare($authenticateCredentialsSql);
        $authenticateCredentialsStatement->execute(['email' => mb_strtolower(trim($email))]);
        $authenticateCredentialsRow = $authenticateCredentialsStatement->fetch(PDO::FETCH_ASSOC);

        if ($authenticateCredentialsRow === false || $authenticateCredentialsRow === []) {
            return new AuthenticationResult(false, 'Invalid credentials');
        }

        $userId = (int)$authenticateCredentialsRow['user_id'];

        if (!\password_verify($password, $authenticateCredentialsRow['hashed_password'])) {
            return new AuthenticationResult(false, 'Invalid credentials');
        }

        $salt = \bin2hex(\random_bytes(32));
        $accessToken = \bin2hex(\random_bytes(32));
        $expiration = (new DateTime())->add(new DateInterval('P' . self::ACCESS_TOKEN_COOKIE_TTL_SECONDS . 'S'));
        $addAccessTokenSql = <<<SQL
INSERT INTO user_access_tokens
(user_id, salt, hashed_access_token, expiration_date, is_active)
VALUES
(:userId, :salt, :hashedAccessToken, :expiration, true)
SQL;
        $addAccessTokenStatement = $this->pdo->prepare($addAccessTokenSql);
        $addAccessTokenStatement->execute([
            'userId' => $userId,
            'salt' => $salt,
            'hashedAccessToken' => \hash('sha256', $salt . $accessToken),
            'expiration' => $expiration->format('Y-m-d H:i:s')
        ]);
        $this->pdo->commit();

        return new AuthenticationResult(
            true,
            null,
            $userId,
            $accessToken,
            $expiration
        );
    }

    /**
     * @inheritdoc
     */
    public function logOut(int $userId, string $accessToken): void
    {
        $sql = <<<SQL
UPDATE user_access_tokens
SET is_active = FALSE
WHERE user_id = :userId AND hashed_access_token = SHA256(CONCAT(salt, :accessToken))
SQL;
        $statement = $this->pdo->prepare($sql);
        $statement->execute(['userId' => $userId, 'accessToken' => $accessToken]);
    }

    /**
     * @inheritdoc
     */
    public function requestPasswordReset(string $email): void
    {
        // TODO: How would we prevent spamming of this endpoint?
    }

    /**
     * @inheritdoc
     */
    public function updatePassword(int $userId, string $newPassword): void
    {
        // TODO: What should this return?
    }
}
