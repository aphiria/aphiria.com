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
 * Defines a search result
 */
final class SearchResult
{
    /**
     * @param string $link The link that the results point to
     * @param string $htmlElementType The type of element that was matched
     * @param string $highlightedH1 The highlighted h1 text, or null if there was none
     * @param string|null $highlightedH2 The highlighted h2 text, or null if there was none
     * @param string|null $highlightedH3 The highlighted h3 text, or null if there was none
     * @param string|null $highlightedH4 The highlighted h4 text, or null if there was none
     * @param string|null $highlightedH5 The highlighted h5 text, or null if there was none
     * @param string $highlightedInnerText The highlighted inner text
     */
    public function __construct(
        public readonly string $link,
        public readonly string $htmlElementType,
        public readonly string $highlightedH1,
        public readonly ?string $highlightedH2,
        public readonly ?string $highlightedH3,
        public readonly ?string $highlightedH4,
        public readonly ?string $highlightedH5,
        public readonly string $highlightedInnerText
    ) {
    }
}
