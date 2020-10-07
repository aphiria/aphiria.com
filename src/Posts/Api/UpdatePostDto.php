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

use Aphiria\Validation\Constraints\Attributes\Required;
use DateTime;

/**
 * The update post DTO
 */
final class UpdatePostDto
{
    /** @var int The ID of the post to update */
    public int $id;
    /** @var string The title of the post */
    #[Required]
    public string $title;
    /** @var string The text summary of the post */
    #[Required]
    public string $textSummary;
    /** @var string The markdown content of the post */
    #[Required]
    public string $markdownContent;
    /** @var DateTime|null The publish date of the post, if there is one */
    public ?DateTime $publishDate = null;
}
