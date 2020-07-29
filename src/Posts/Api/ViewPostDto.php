<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Posts\Api;

use App\Posts\Post;
use App\Users\User;
use DateTime;

/**
 * Defines the DTO for viewing a post
 */
final class ViewPostDto
{
    /** @var int The ID of the post */
    public int $id;
    /** @var int The ID of the author user */
    public int $authorId;
    /** @var string The first name of the author */
    public string $authorFirstName;
    /** @var string The last name of the author */
    public string $authorLastName;
    /** @var string The title of the post */
    public string $title;
    /** @var string The text summary */
    public string $textSummary;
    /** @var string The markdown content of the post */
    public string $markdownContent;
    /** @var string The HTML content of the post */
    public string $htmlContent;
    /** @var DateTime The date that the post was created */
    public DateTime $createdDate;
    /** @var DateTime The last updated date */
    public DateTime $lastUpdatedDate;
    /** @var DateTime The date the post was published */
    public DateTime $publishDate;
    /** @var bool Whether or not the post is deleted */
    public bool $isDeleted;

    /**
     * @param Post $post The post this view DTO is being created from
     * @param User $author The author of the post
     */
    public function __construct(Post $post, User $author)
    {
        $this->id = $post->getId();
        $this->authorId = $post->getAuthorId();
        $this->authorFirstName = $author->getFirstName();
        $this->authorLastName = $author->getLastName();
        $this->title = $post->getTitle();
        $this->textSummary = $post->getTextSummary();
        $this->markdownContent = $post->getMarkdownContent();
        $this->htmlContent = $post->getHtmlContent();
        $this->createdDate = $post->getCreatedDate();
        $this->lastUpdatedDate = $post->getLastUpdatedDate();
        $this->publishDate = $post->getPublishDate();
        $this->isDeleted = $post->isDeleted();
    }
}
