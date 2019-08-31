<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Searching;

/**
 * Defines a search result
 */
final class SearchResult
{
    /** @var string The link that the result points to */
    public string $link;
    /** @var string The type of HTML element that was matched */
    public string $htmlElementType;
    /** @var string The highlighted h1 text */
    public string $highlightedH1;
    /** @var string|null The highlighted h2 text, or null if there is none */
    public ?string $highlightedH2;
    /** @var string|null The highlighted h3 text, or null if there is none */
    public ?string $highlightedH3;
    /** @var string|null The highlighted h4 text, or null if there is none */
    public ?string $highlightedH4;
    /** @var string|null The highlighted h5 text, or null if there is none */
    public ?string $highlightedH5;
    /** @var string The highlighted inner text */
    public string $highlightedInnerText;

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
        string $link,
        string $htmlElementType,
        string $highlightedH1,
        ?string $highlightedH2,
        ?string $highlightedH3,
        ?string $highlightedH4,
        ?string $highlightedH5,
        string $highlightedInnerText
    ) {
        $this->link = $link;
        $this->htmlElementType = $htmlElementType;
        $this->highlightedH1 = $highlightedH1;
        $this->highlightedH2 = $highlightedH2;
        $this->highlightedH3 = $highlightedH3;
        $this->highlightedH4 = $highlightedH4;
        $this->highlightedH5 = $highlightedH5;
        $this->highlightedInnerText = $highlightedInnerText;
    }
}
