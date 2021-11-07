<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2021 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Searching;

/**
 * Defines a document index entry
 */
final class IndexEntry
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
        public readonly string $htmlElementType,
        public readonly string $innerText,
        public readonly string $link,
        public readonly string $htmlElementWeight,
        public readonly string $h1InnerText,
        public readonly ?string $h2InnerText = null,
        public readonly ?string $h3InnerText = null,
        public readonly ?string $h4InnerText = null,
        public readonly ?string $h5InnerText = null
    ) {
    }
}
