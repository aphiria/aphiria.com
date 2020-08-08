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
    /** @var int The length of the access token salt */
    private const ACCESS_TOKEN_SALT_LENGTH = 32;
    /** @var int The length of the access token */
    private const ACCESS_TOKEN_LENGTH = 32;
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
    public function changePassword(int $userId, string $currPassword, string $newPassword): void
    {
        $this->pdo->beginTransaction();
        $sql = <<<SQL
SELECT hashed_password
FROM user_credentials
WHERE user_id = :userId AND is_active = TRUE
SQL;
        $authenticatePasswordStatement = $this->pdo->prepare($sql);
        $authenticatePasswordStatement->execute(['userId' => $userId]);
        $authenticatePasswordRow = $authenticatePasswordStatement->fetchColumn();

        if (
            \count($authenticatePasswordRow) !== 1
            || !\password_verify($currPassword, $authenticatePasswordRow[0])
        ) {
            $this->pdo->rollBack();
            throw new IncorrectPasswordException('Current password was invalid');
        }

        // We know the user's password was valid, so disable all previous passwords, and add this new one
        $this->setPassword($userId, $newPassword);
        $this->pdo->commit();
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

        $salt = \bin2hex(\random_bytes(self::ACCESS_TOKEN_SALT_LENGTH));
        $accessToken = \bin2hex(\random_bytes(self::ACCESS_TOKEN_LENGTH));
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

    /**
     * Sets a user's password
     *
     * @param int $userId The ID of the user
     * @param string $newPassword The new password
     * @throws InvalidPasswordException Thrown if the new password was invalid
     */
    private function setPassword(int $userId, string $newPassword): void
    {
        if (\mb_strlen($newPassword) < 8 || trim($newPassword) === '') {
            throw new InvalidPasswordException('Passwords must be at least 8 characters long');
        }

        $sql = <<<SQL
UPDATE user_credentials
SET is_active = false
WHERE user_id = :userId;
SQL;
        $deactiveOldPasswordsStatement = $this->pdo->prepare($sql);
        $deactiveOldPasswordsStatement->execute(['userId' => $userId]);
        $sql = <<<SQL
INSERT INTO user_credentials
(user_id, hashed_password)
VALUES
(:userId, :hashedPassword)
SQL;
        $addPasswordStatement = $this->pdo->prepare($sql);
        $addPasswordStatement->execute(['userId' => $userId, \password_hash($newPassword, PASSWORD_ARGON2ID)]);
    }
}
