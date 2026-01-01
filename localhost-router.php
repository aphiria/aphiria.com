<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2026 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

$parsedPath = \parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$requestUri = \urldecode($parsedPath !== false && $parsedPath !== null ? $parsedPath : '');

if ($requestUri !== '/' && \file_exists(__DIR__ . "/public-api$requestUri")) {
    return false;
}

require_once __DIR__ . '/public-api/index.php';
