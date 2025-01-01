<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2025 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Searching;

/**
 * Defines a document index entry
 */
final readonly class IndexEntry
{
    /**
     * @param string $htmlElementType The type of HTML element being index
     * @param string $innerText The inner text of the HTML element being index
     * @param string $link The link that will take a user to this part of the documentation
     * @param string $htmlElementWeight The weight (eg 'A', 'B', 'C', or 'D') of the tag so we know how relevant it is
     * @param string $h1InnerText The previous h1 sibling's inner text
     * @param string|null $h2InnerText The previous h2 sibling's inner text
     * @param string|null $h3InnerText The previous h3 sibling's inner text
     * @param string|null $h4InnerText The previous h4 sibling's inner text
     * @param string|null $h5InnerText The previous h5 sibling's inner text
     */
    public function __construct(
        public string $htmlElementType,
        public string $innerText,
        public string $link,
        public string $htmlElementWeight,
        public string $h1InnerText,
        public ?string $h2InnerText = null,
        public ?string $h3InnerText = null,
        public ?string $h4InnerText = null,
        public ?string $h5InnerText = null
    ) {
    }
}
