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
 * Defines the authentication service backed by SQL
 */
final class SqlAuthenticationService implements IAuthenticationService
{
    /** @var string The name of the cookie that contains the access token */
    public const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
    /** @var int The TTL for the access token cookie */
    private const ACCESS_TOKEN_COOKIE_TTL_SECONDS = 30 * 60;
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
     */
    public function authenticateAccessToken(int $userId, string $accessToken): bool
    {
        return $this->getActiveAccessTokenDataForUser($userId, $accessToken) !== null;
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
        $this->pdo->beginTransaction();

        if (($row = $this->getActiveAccessTokenDataForUser($userId, $accessToken)) !== null) {
            $sql = <<<SQL
UPDATE user_access_tokens
SET is_active = FALSE
WHERE id = :id
SQL;
            $statement = $this->pdo->prepare($sql);
            $statement->execute(['id' => $row['id']]);
        }

        $this->pdo->commit();
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

    /**
     * Gets data about a current access token for a user
     *
     * @param int $userId The ID whose access token we're trying to find
     * @param string $accessToken The access token whose data we want
     * @return array|null The array containing 'id', 'salt', and 'hashed_access_token' keys if a matching token was found, otherwise null
     */
    private function getActiveAccessTokenDataForUser(int $userId, string $accessToken): ?array
    {
        $sql = <<<SQL
SELECT id, salt, hashed_access_token
FROM user_access_tokens
WHERE user_id = :userId AND is_active = TRUE AND expiration_date > NOW()
SQL;
        $statement = $this->pdo->prepare($sql);
        $statement->execute(['userId' => $userId]);

        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            if (\hash_equals($row['hashed_access_token'], hash('sha256', $row['salt'] . $accessToken))) {
                return $row;
            }
        }

        return null;
    }
}
