<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Documentation\Searching;

/**
 * Defines a document index entry
 */
final class IndexEntry
{
    /** @var string The type of HTML element being index */
    public string $htmlElementType;
    /** @var string The inner text of the HTML element being index */
    public string $innerText;
    /** @var string The weight (eg 'A', 'B', 'C', or 'D') of the tag so we know how relevant it is */
    public string $htmlElementWeight;
    /** @var string The link that will take a user to this part of the documentation */
    public string $link;
    /** @var string The previous h1 sibling's inner text */
    public string $h1InnerText;
    /** @var string|null The previous h2 sibling's inner text */
    public ?string $h2InnerText;
    /** @var string|null The previous h3 sibling's inner text */
    public ?string $h3InnerText;
    /** @var string|null The previous h4 sibling's inner text */
    public ?string $h4InnerText;
    /** @var string|null The previous h5 sibling's inner text */
    public ?string $h5InnerText;

    /**
     * @param string $htmlElementType The type of HTML element being index
     * @param string $innerText The inner text of the HTML element being index
     * @param string $link The link that will take a user to this part of the documentation
     * @param string $weight The weight (eg 'A', 'B', 'C', or 'D') of the tag so we know how relevant it is
     * @param string|null $h1InnerText The previous h1 sibling's inner text
     * @param string|null $h2InnerText The previous h2 sibling's inner text
     * @param string|null $h3InnerText The previous h3 sibling's inner text
     * @param string|null $h4InnerText The previous h4 sibling's inner text
     * @param string|null $h5InnerText The previous h5 sibling's inner text
     */
    public function __construct(
        string $htmlElementType,
        string $innerText,
        string $link,
        string $weight,
        string $h1InnerText,
        string $h2InnerText = null,
        string $h3InnerText = null,
        string $h4InnerText = null,
        string $h5InnerText = null
    ) {
        $this->htmlElementType = $htmlElementType;
        $this->innerText = $innerText;
        $this->link = $link;
        $this->htmlElementWeight = $weight;
        $this->h1InnerText = $h1InnerText;
        $this->h2InnerText = $h2InnerText;
        $this->h3InnerText = $h3InnerText;
        $this->h4InnerText = $h4InnerText;
        $this->h5InnerText = $h5InnerText;
    }
}
