<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2024 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

$requestUri = \urldecode(\parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH));

if ($requestUri !== '/' && \file_exists(__DIR__ . "/public-api$requestUri")) {
    return false;
}

require_once __DIR__ . '/public-api/index.php';
