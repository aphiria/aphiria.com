<h1 id="doc-title">Exception Handling</h1>

<nav class="toc-nav">

<div class="toc-nav-contents">

<h2 id="table-of-contents">Table of Contents</h2>

<ol>
<li><a href="#global-exception-handler">Global Exception Handler</a></li>
<li><a href="#problem-details-exception-renderer">Problem Details Exception Renderer</a><ol>
<li><a href="#custom-problem-details-mappings">Custom Problem Details Mappings</a></li>
</ol>
<li><a href="#custom-api-exception-renderer">Custom API Exception Renderer</a></li>
<li><a href="#console-exception-renderer">Console Exception Renderer</a><ol>
<li><a href="#output-writers">Output Writers</a></li>
</ol>
</li>
<li><a href="#logging">Logging</a><ol>
<li><a href="#exception-log-levels">Exception Log Levels</a></li>
</ol>
</li>
</ol>

</div>

</nav>

<h2 id="global-exception-handler">Global Exception Handler</h2>

At some point, your application is going to throw an unhandled exception or shut down unexpectedly.  When this happens, it would be nice to log details about the error and present a nicely-formatted response for the user.  Aphiria provides `GlobalExceptionHandler` to do just this.  It can be used to render exceptions for both HTTP and console applications, and is framework-agnostic.

<div class="context-framework">

To learn more about how to configure exceptions in modules, read the [application builders documentation](application-builders.md#component-exception-handler).

</div>
<div class="context-library">

Let's review how to manually configure the exception handler.

```php
use Aphiria\Exceptions\GlobalExceptionHandler;
use Aphiria\Framework\Api\Exceptions\ProblemDetailsExceptionRenderer;

$exceptionRenderer = new ProblemDetailsExceptionRenderer();
$globalExceptionHandler = new GlobalExceptionHandler($exceptionRenderer);
// This registers the handler as the default handler in PHP
$globalExceptionHandler->registerWithPhp();
```

That's it.  Now, whenever an unhandled error or exception is thrown, the global exception handler will catch it, [log it](#logging), and [render it](#problem-details-exception-renderer).  We'll go into more details on how to customize it below.

</div>

<h2 id="problem-details-exception-renderer">Problem Details Exception Renderer</h2>

`ProblemDetailsExceptionRenderer` is provided out of the box to simplify rendering <a href="https://tools.ietf.org/html/rfc7807" target="_blank">problem details</a> API responses for Aphiria applications.  This renderer tries to create a response using the following steps:
  
1. If a [custom mapping](#custom-problem-details-mappings) exists for the thrown exception, it's used to create a problem details response
2. If no mapping exists, a default 500 problem details response will be returned

By default, when the <a href="https://tools.ietf.org/html/rfc7807#section-3.1" target="_blank">type</a> field is `null`, it is automatically populated with a link to the <a href="https://tools.ietf.org/html/rfc7231#section-6" target="_blank">HTTP status code</a> contained in the problem details.  You can override this behavior by extending `ProblemDetailsExceptionRenderer` and implementing your own `getTypeFromException()`.  Similarly, the exception message is used as the title of the problem details.  If you'd like to customize that, implement your own `getTitleFromException()`.

<h3 id="custom-problem-details-mappings">Custom Problem Details Mappings</h3>

You might not want all exceptions to result in a 500.  For example, if you have a `UserNotFoundException`, you might want to map that to a 404.  Here's how:

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Net\Http\HttpStatusCode;
use App\{OverdrawnException, UserNotFoundException};

final class GlobalModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this
            ->withProblemDetails(
                $appBuilder,
                UserNotFoundException::class,
                status: HttpStatusCode::NotFound,
            )
            // Add another more complicated one:
            ->withProblemDetails(
                $appBuilder,
                OverdrawnException::class,
                type: 'https://example.com/errors/overdrawn',
                title: 'This account is overdrawn',
                detail: fn($ex): string => "Account {$ex->accountId} is overdrawn by {$ex->overdrawnAmount}",
                status: HttpStatusCode::BadRequest,
                instance: fn($ex): string => "https://example.com/accounts/{$ex->accountId}/errors/{$ex->id}",
                extensions: fn($ex): array => ['overdrawnAmount' => $ex->overdrawnAmount],
            );
    }
}
```

</div>
<div class="context-library">

```php
use Aphiria\Exceptions\GlobalExceptionHandler;
use Aphiria\Framework\Api\Exceptions\ProblemDetailsExceptionRenderer;
use Aphiria\Net\Http\HttpStatusCode;
use App\UserNotFoundException;

$exceptionRenderer = new ProblemDetailsExceptionRenderer();
$exceptionRenderer->mapExceptionToProblemDetails(UserNotFoundException::class, status: HttpStatusCode::NotFound);
$globalExceptionHandler = new GlobalExceptionHandler($exceptionRenderer);
$globalExceptionHandler->registerWithPhp();
```

You can also specify other properties in the problem details:

```php
use App\OverdrawnException;

$exceptionRenderer->mapExceptionToProblemDetails(
    OverdrawnException::class,
    type: 'https://example.com/errors/overdrawn',
    title: 'This account is overdrawn',
    detail: fn($ex): string => "Account {$ex->accountId} is overdrawn by {$ex->overdrawnAmount}",
    status: HttpStatusCode::BadRequest,
    instance: fn($ex): string => "https://example.com/accounts/{$ex->accountId}/errors/{$ex->id}",
    extensions: fn($ex): array => ['overdrawnAmount' => $ex->overdrawnAmount],
);
```

</div>

> **Note:** All parameters that accept closures with the thrown exception can also take hard-coded values.

When a `ProblemDetails` instance is serialized in a response, all of its extensions are serialized as top-level properties - not as key-value pairs under an `extensions` property.

<h2 id="custom-api-exception-renderer">Custom API Exception Renderer</h2>

You may prefer to use a different renderer than `ProblemDetailsExceptionRenderer` for your API exceptions.  For example, let's say you want to return a response with the following shape:

```json
{
    "error": "THE_EXCEPTION_MESSAGE"
}
```

First, create the exception renderer:

<div class="context-framework">

```php
namespace App;

use Aphiria\ContentNegotiation\NegotiatedResponseFactory;
use Aphiria\Framework\Api\Exceptions\IApiExceptionRenderer;
use Aphiria\Net\Http\Headers;
use Aphiria\Net\Http\HttpStatusCode;
use Aphiria\Net\Http\IResponse;
use Aphiria\Net\Http\IResponseFactory;
use Aphiria\Net\Http\Response;
use Aphiria\Net\Http\StringBody;

final class CustomApiExceptionRenderer implements IApiExceptionRenderer
{   
    public function __construct(
        private ?IRequest $request = null,
        private IResponseFactory $responseFactory = new NegotiatedResponseFactory(),
        private IResponseWriter $responseWriter = new StreamResponseWriter(),
    ) {}

    public function createResponse(Exception $ex): IResponse
    {
        if ($this->request === null) {
            // The exception must've been thrown very early in the app
            $headers = new Headers();
            $headers->add('Content-Type', 'application/json');
            
            return new Response(
                HttpStatusCode::InternalServerError,
                $headers
                new StringBody(\json_encode(['error' => $ex->getMessage()])),
            );
        }
        
        // We can negotiate the response
        return $this->responseFactory->createResponse(
            $this->request,
            HttpStatusCode::InternalServerError,
            rawBody: ['error' => $ex->getMessage()],
        );
    }
    
    public function render(Exception $ex): void
    {
        $this->responseWriter->writeResponse($this->createResponse($ex));
    }
}
```

Then, to use `CustomApiExceptionRenderer`, just set `aphiria.exceptions.apiExceptionRenderer` in _config.php_ to its fully-qualified class name.

</div>
<div class="context-library">

```php
namespace App;

use Aphiria\ContentNegotiation\NegotiatedResponseFactory;
use Aphiria\Exceptions\IExceptionRenderer;
use Aphiria\Net\Http\Headers;
use Aphiria\Net\Http\HttpStatusCode;
use Aphiria\Net\Http\IResponseFactory;
use Aphiria\Net\Http\Response;
use Aphiria\Net\Http\StringBody;

final class CustomApiExceptionRenderer implements IExceptionRenderer
{   
    public function __construct(
        private ?IRequest $request = null,
        private IResponseFactory $responseFactory = new NegotiatedResponseFactory(),
        private IResponseWriter $responseWriter = new StreamResponseWriter(),
    ) {}
    
    public function render(Exception $ex): void
    {
        if ($this->request === null) {
            // The exception must've been thrown very early in the app
            $headers = new Headers();
            $headers->add('Content-Type', 'application/json');
            $response = new Response(
                HttpStatusCode::InternalServerError,
                $headers,
                new StringBody(\json_encode(['error' => $ex->getMessage()])),
            );
        } else {
            // We can negotiate the response
            $response = $this->responseFactory->createResponse(
                $this->request,
                HttpStatusCode::InternalServerError,
                rawBody: ['error' => $ex->getMessage()],
            );
        }
        
        $this->responseWriter->writeResponse($response);
    }
}
```

Then, to use `CustomApiExceptionRenderer`, pass it into `GlobalExceptionHandler`:

```php
use App\CustomApiExceptionRenderer;

// Assume $request is already set
$customApiExceptionRenderer = new CustomApiExceptionHandler($request);
$globalExceptionHandler = new GlobalExceptionHandler($customApiExceptionRenderer);
$globalExceptionHandler->registerWithPhp();
```

</div>

<h2 id="console-exception-renderer">Console Exception Renderer</h2>

<div class="context-framework">

> **Note:** Please refer to the [application builders documentation](application-builders.md#component-exception-handler) to learn more about configuring exceptions in console apps.

</div>

`ConsoleExceptionRenderer` renders exceptions for Aphiria console applications.  To render the exception, it goes through the following steps:

1. If an [output writer](#output-writers) is registered for the thrown exception, it's used
2. Otherwise, the exception message and stack trace is output to the console

<h3 id="output-writers">Output Writers</h3>

Output writers allow you to write errors to the output and return a status code.

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Console\Output\IOutput;
use Aphiria\Console\StatusCode;
use Aphiria\Framework\Application\AphiriaModule;
use App\DatabaseNotFoundException;

final class GlobalModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withConsoleExceptionOutputWriter(
            $appBuilder,
            DatabaseNotFoundException::class,
            function (DatabaseNotFoundException $ex, IOutput $output) {
                $output->writeln('<fatal>Contact a sysadmin</fatal>');
        
                return StatusCode::Fatal;
            },
        );
    }
}
```

</div>
<div class="context-library">

```php
use Aphiria\Console\Output\IOutput;
use Aphiria\Console\StatusCode;
use Aphiria\Exceptions\GlobalExceptionHandler;
use Aphiria\Framework\Console\Exceptions\ConsoleExceptionRenderer;
use App\DatabaseNotFoundException;

$exceptionRenderer = new ConsoleExceptionRenderer();
$exceptionRenderer->registerOutputWriter(
    DatabaseNotFoundException::class,
    function (DatabaseNotFoundException $ex, IOutput $output) {
        $output->writeln('<fatal>Contact a sysadmin</fatal>');

        return StatusCode::Fatal;
    },
);

// You can also register many exceptions-to-output writers
$exceptionRenderer->registerManyOutputWriters([
    DatabaseNotFoundException::class => function (DatabaseNotFoundException $ex, IOutput $output) {
        $output->writeln('<fatal>Contact a sysadmin</fatal>');

        return StatusCode::Fatal;
    },
    // ...
]);

$globalExceptionHandler = new GlobalExceptionHandler($exceptionRenderer);
$globalExceptionHandler->registerWithPhp();
```

</div>

<h2 id="logging">Logging</h2>

<div class="context-framework">

You can configure the PSR-3 logger used in the global exception handler by editing the `aphiria.logging` values in _config.php_.

</div>
<div class="context-library">

To configure your logger, you must add a handler:

```php
use Aphiria\Exceptions\GlobalExceptionHandler;
use Aphiria\Framework\Api\Exceptions\ApiExceptionRenderer;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Psr\Log\LogLevel;

$exceptionRenderer = new ApiExceptionRenderer();
$logger = new Logger('app');
$logger->pushHandler(new StreamHandler('/etc/logs/errors.txt', LogLevel::DEBUG));
$globalExceptionHandler = new GlobalExceptionHandler($exceptionRenderer, $logger);
$globalExceptionHandler->registerWithPhp();
```

</div>

<h3 id="exception-log-levels">Exception Log Levels</h3>

It's possible to map certain exceptions to a PSR-3 log level.  For example, if you have an exception that means your infrastructure might be down, you can cause it to log as an emergency.

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use App\DatabaseNotFoundException;
use Psr\Log\LogLevel;

final class GlobalModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withLogLevelFactory(
            $appBuilder,
            DatabaseNotFoundException::class,
            fn(DatabaseNotFoundException $ex): LogLevel => LogLevel::EMERGENCY,
        );
    }
}
```

</div>

<div class="context-library">

```php
use Aphiria\Exceptions\GlobalExceptionHandler;
use Aphiria\Framework\Api\Exceptions\ApiExceptionRenderer;
use App\DatabaseNotFoundException;
use Psr\Log\LogLevel;

$globalExceptionHandler = new GlobalExceptionHandler(new ApiExceptionRenderer());
$globalExceptionHandler->registerLogLevelFactory(
    DatabaseNotFoundException::class,
    fn(DatabaseNotFoundException $ex): LogLevel => LogLevel::EMERGENCY,
);

// You can also register multiple exceptions-to-log-level factories
$globalExceptionHandler->registerManyLogLevelFactories([
    DatabaseNotFoundException::class => fn(DatabaseNotFoundException $ex): LogLevel => LogLevel::EMERGENCY,
    // ...
]);
```

</div>
