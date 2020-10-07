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

use DateTime;

/**
 * Defines a post
 */
final class Post
{
    /**
     * @param int $id The Id of the post
     * @param int $authorId The ID of the author user
     * @param string $title The title of the post
     * @param string $textSummary The text summary of the post
     * @param string $markdownContent The markdown content of the post
     * @param string $htmlContent The HTML content of the post
     * @param DateTime $createdDate The date that the post was created
     * @param DateTime $lastUpdatedDate The last updated date
     * @param DateTime $publishDate The date the post was published
     * @param bool $isDeleted Whether or not the post is deleted
     */
    public function __construct(
        private int $id,
        private int $authorId,
        private string $title,
        private string $textSummary,
        private string $markdownContent,
        private string $htmlContent,
        private DateTime $createdDate,
        private DateTime $lastUpdatedDate,
        private DateTime $publishDate,
        private bool $isDeleted
    ) {
    }

    /**
     * Gets the post ID
     *
     * @return int The post ID
     */
    public function getId(): int
    {
        return $this->id;
    }

    /**
     * Gets the author user ID
     *
     * @return int The author user ID
     */
    public function getAuthorId(): int
    {
        return $this->authorId;
    }

    /**
     * Gets the title
     *
     * @return string The title
     */
    public function getTitle(): string
    {
        return $this->title;
    }

    /**
     * Gets the text summary
     *
     * @return string The text summary
     */
    public function getTextSummary(): string
    {
        return $this->textSummary;
    }

    /**
     * Gets the markdown content
     *
     * @return string The markdown content
     */
    public function getMarkdownContent(): string
    {
        return $this->markdownContent;
    }

    /**
     * Gets the HTML content
     *
     * @return string The HTML content
     */
    public function getHtmlContent(): string
    {
        return $this->htmlContent;
    }

    /**
     * Gets the created date
     *
     * @return DateTime The created date
     */
    public function getCreatedDate(): DateTime
    {
        return $this->createdDate;
    }

    /**
     * Gets the last updated date
     *
     * @return DateTime The last updated date
     */
    public function getLastUpdatedDate(): DateTime
    {
        return $this->lastUpdatedDate;
    }

    /**
     * Gets the publish date
     *
     * @return DateTime The publish date
     */
    public function getPublishDate(): DateTime
    {
        return $this->publishDate;
    }

    /**
     * Gets whether or not the post is deleted
     *
     * @return bool True if the post is deleted, otherwise false
     */
    public function isDeleted(): bool
    {
        return $this->isDeleted;
    }

    /**
     * Sets the title
     *
     * @param string $title The new title
     */
    public function setTitle(string $title): void
    {
        $this->title = $title;
    }

    /**
     * Gets whether or not the post is deleted
     *
     * @param bool $isDeleted True if the post is deleted, otherwise false
     */
    public function setIsDeleted(bool $isDeleted): void
    {
        $this->isDeleted = $isDeleted;
    }

    /**
     * Sets the text summary
     *
     * @param string $textSummary The new text summary
     */
    public function setTextSummary(string $textSummary): void
    {
        $this->textSummary = $textSummary;
    }

    /**
     * Sets the markdown content
     *
     * @param string $markdownContent The markdown content
     */
    public function setMarkdownContent(string $markdownContent): void
    {
        $this->markdownContent = $markdownContent;
    }

    /**
     * Sets the HTML content
     *
     * @param string $htmlContent The new HTML content
     */
    public function setHtmlContent(string $htmlContent): void
    {
        $this->htmlContent = $htmlContent;
    }

    /**
     * Sets the last updated date
     *
     * @param DateTime $lastUpdatedDate The last updated date
     */
    public function setLastUpdatedDate(DateTime $lastUpdatedDate): void
    {
        $this->lastUpdatedDate = $lastUpdatedDate;
    }

    /**
     * Sets the publish date
     *
     * @param DateTime $publishDate The new publish date
     */
    public function setPublishDate(DateTime $publishDate): void
    {
        $this->publishDate = $publishDate;
    }
}
