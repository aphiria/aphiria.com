<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Posts;

use App\Posts\Api\CreatePostDto;
use App\Posts\Api\UpdatePostDto;
use DateTime;
use ParsedownExtra;
use PDO;

/**
 * Defines the SQL post service
 */
final class SqlPostService implements IPostService
{
    /** @var string The format to use for dates */
    private const DATE_FORMAT = 'Y-m-d H:i:s';
    /** @var PDO The PDO instance */
    private PDO $pdo;
    /** @var ParsedownExtra The markdown parser */
    private ParsedownExtra $markdownParser;

    /**
     * @param PDO $pdo The PDO instance
     */
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->markdownParser = new ParsedownExtra();
    }

    /**
     * @inheritdoc
     */
    public function createPost(int $authorId, CreatePostDto $post): Post
    {
        $createdDate = $lastUpdatedDate = new DateTime();
        $publishDate = $post->publishDate ?? $createdDate;
        $htmlContent = $this->markdownParser->parse($post->markdownContent);
        $sql = <<<SQL
INSERT INTO posts
(author_id, title, text_summary, markdown_content, html_content, created_date, last_updated_date, publish_date)
VALUES
(:authorId, :title, :textSummary, :markdownContent, :htmlContent, :createdDate, :lastUpdatedDate, :publishDate)
SQL;
        $statement = $this->pdo->prepare($sql);
        $this->pdo->beginTransaction();
        $statement->execute([
            'authorId' => $authorId,
            'title' => $post->title,
            'textSummary' => $post->textSummary,
            'markdownContent' => $post->markdownContent,
            'htmlContent' => $htmlContent,
            'createdDate' => $createdDate->format(self::DATE_FORMAT),
            'lastUpdatedDate' => $lastUpdatedDate->format(self::DATE_FORMAT),
            'publishDate' => $publishDate->format(self::DATE_FORMAT)
        ]);
        $createdPost = new Post(
            (int)$this->pdo->lastInsertId(),
            $authorId,
            $post->title,
            $post->textSummary,
            $post->markdownContent,
            $htmlContent,
            $createdDate,
            $lastUpdatedDate,
            $publishDate,
            false
        );
        $this->pdo->commit();

        return $createdPost;
    }

    /**
     * @inheritdoc
     */
    public function deletePost(int $id): void
    {
        $statement = $this->pdo->prepare('DELETE FROM posts WHERE id = :id');
        $statement->execute(['id' => $id]);

        if ($statement->rowCount() === 0) {
            throw new PostNotFoundException("No post with ID $id was found");
        }
    }

    /**
     * @inheritdoc
     */
    public function getAllPosts(int $pageNum = 1, int $pageSize = 10): array
    {
        if ($pageNum < 1) {
            throw new InvalidPagingParameterException('Page number cannot be less than 1');
        }

        if ($pageSize < 1 || $pageSize > 10) {
            throw new InvalidPagingParameterException('Page size must be between 1 and 10');
        }

        $sql = <<<SQL
SELECT id, author_id, title, text_summary, markdown_content, html_content, created_date, last_updated_date, publish_date, is_deleted
FROM posts
WHERE is_deleted = FALSE
ORDER BY publish_date DESC
LIMIT :pageSize
OFFSET :offset
SQL;
        $statement = $this->pdo->prepare($sql);
        $statement->execute(['offset' => ($pageNum - 1) * $pageSize, 'pageSize' => $pageSize]);
        $posts = [];

        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $posts[] = $this->createPostFromSqlRow($row);
        }

        return $posts;
    }

    /**
     * @inheritdoc
     */
    public function getPostById(int $id): Post
    {
        $sql = <<<SQL
SELECT id, author_id, title, text_summary, markdown_content, html_content, created_date, last_updated_date, publish_date, is_deleted
FROM posts
WHERE id = :id AND is_deleted = FALSE
SQL;
        $statement = $this->pdo->prepare($sql);
        $statement->execute(['id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        if ($row === false) {
            throw new PostNotFoundException("No post with ID $id was found");
        }

        return $this->createPostFromSqlRow($row);
    }

    /**
     * @inheritdoc
     */
    public function updatePost(UpdatePostDto $post): Post
    {
        $lastUpdatedDate = new DateTime();
        $htmlContent = $this->markdownParser->parse($post->markdownContent);
        $sql = <<<SQL
UPDATE posts
SET title = :title, text_summary = :textSummary, markdown_content = :markdownContent, html_content = :htmlContent, last_updated_date = :lastUpdatedDate, publish_date = :publish_date
WHERE id = :id
SQL;
        $params = [
            'id' => $post->id,
            'title' => $post->title,
            'textSummary' => $post->textSummary,
            'markdownContent' => $post->markdownContent,
            'htmlContent' => $htmlContent,
            'lastUpdatedDate' => $lastUpdatedDate->format(self::DATE_FORMAT),
            'publishDate' => ($post->publishDate ?? $lastUpdatedDate)->format(self::DATE_FORMAT)
        ];
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);

        return $this->getPostById($post->id);
    }

    /**
     * Creates a post from a SQL row
     *
     * @param array $row The SQL row
     * @return Post The post
     */
    private function createPostFromSqlRow(array $row): Post
    {
        return new Post(
            (int)$row['id'],
            (int)$row['author_id'],
            $row['title'],
            $row['text_summary'],
            $row['markdown_content'],
            $row['html_content'],
            DateTime::createFromFormat(self::DATE_FORMAT, $row['created_date'], ),
            DateTime::createFromFormat(self::DATE_FORMAT, $row['last_updated_date']),
            DateTime::createFromFormat(self::DATE_FORMAT, $row['publish_date']),
            (bool)$row['is_deleted']
        );
    }
}
