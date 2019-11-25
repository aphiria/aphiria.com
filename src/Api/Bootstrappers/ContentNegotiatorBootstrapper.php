<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2019 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Api\Bootstrappers;

use Aphiria\DependencyInjection\Bootstrappers\Bootstrapper;
use Aphiria\DependencyInjection\IContainer;
use Aphiria\Net\Http\ContentNegotiation\ContentNegotiator;
use Aphiria\Net\Http\ContentNegotiation\IContentNegotiator;
use Aphiria\Net\Http\ContentNegotiation\INegotiatedResponseFactory;
use Aphiria\Net\Http\ContentNegotiation\MediaTypeFormatters\FormUrlEncodedMediaTypeFormatter;
use Aphiria\Net\Http\ContentNegotiation\MediaTypeFormatters\HtmlMediaTypeFormatter;
use Aphiria\Net\Http\ContentNegotiation\MediaTypeFormatters\JsonMediaTypeFormatter;
use Aphiria\Net\Http\ContentNegotiation\MediaTypeFormatters\PlainTextMediaTypeFormatter;
use Aphiria\Net\Http\ContentNegotiation\NegotiatedResponseFactory;
use Aphiria\Serialization\FormUrlEncodedSerializer;
use Aphiria\Serialization\JsonSerializer;

/**
 * Defines the bootstrapper that registers the content negotiator
 */
final class ContentNegotiatorBootstrapper extends Bootstrapper
{
    /**
     * @inheritdoc
     */
    public function registerBindings(IContainer $container): void
    {
        /**
         * ----------------------------------------------------------
         * Media type formatters
         * ----------------------------------------------------------
         *
         * Specify the media type formatters you support
         * Note: The first registered media type formatter will be considered the default one
         */
        $mediaTypeFormatters = [
            new JsonMediaTypeFormatter($container->resolve(JsonSerializer::class)),
            new FormUrlEncodedMediaTypeFormatter($container->resolve(FormUrlEncodedSerializer::class)),
            new HtmlMediaTypeFormatter(),
            new PlainTextMediaTypeFormatter()
        ];

        /**
         * ----------------------------------------------------------
         * Supported languages
         * ----------------------------------------------------------
         *
         * Specify the language tags you support
         * @link https://tools.ietf.org/html/rfc5646
         */
        $supportedLanguages = [
            'en-US'
        ];

        $contentNegotiator = new ContentNegotiator($mediaTypeFormatters, $supportedLanguages);
        $negotiatedResponseFactory = new NegotiatedResponseFactory($contentNegotiator);
        $container->bindInstance(IContentNegotiator::class, $contentNegotiator);
        $container->bindInstance(INegotiatedResponseFactory::class, $negotiatedResponseFactory);
    }
}
