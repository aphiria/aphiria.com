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

use Aphiria\Validation\Constraints\Annotations\Required;
use DateTime;

/**
 * The update post DTO
 */
final class UpdatePostDto
{
    /** @var int The ID of the post to update */
    public int $id;
    /**
     * The title of the post
     *
     * @Required
     * @var string
     */
    public string $title;
    /**
     * The text summary of the post
     *
     * @Required
     * @var string
     */
    public string $textSummary;
    /**
     * The markdown content of the post
     *
     * @Required
     * @var string
     */
    public string $markdownContent;
    /**
     * The publish date of the post, if there is one
     *
     * @var DateTime|null
     */
    public ?DateTime $publishDate = null;
}
