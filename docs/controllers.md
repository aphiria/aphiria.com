<h1 id="doc-title">Controllers</h1>

<nav class="toc-nav">

<div class="toc-nav-contents">

<h2 id="table-of-contents">Table of Contents</h2>

<ol>
<li><a href="#basics">Basics</a></li>
<li><a href="#parameter-resolution">Parameter Resolution</a><ol>
<li><a href="#request-body-parameters">Request Bodies</a></li>
<li><a href="#request-parameters">Request Parameters</a></li>
<li><a href="#arrays-in-request-bodies">Arrays in Request Bodies</a></li>
<li><a href="#validating-request-bodies">Validating Request Bodies</a></li>
</ol>
</li>
<li><a href="#parsing-request-data">Parsing Request Data</a></li>
<li><a href="#formatting-response-data">Formatting Response Data</a></li>
<li><a href="#getting-the-current-user">Getting the Current User</a></li>
</ol>

</div>

</nav>

<h2 id="basics">Basics</h2>

A controller contains the methods that are invoked when your app [handles a request](routing.md).  Your controllers must extend `Controller`.  Let's say you needed an endpoint to get a user.  Simple:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Routing\Attributes\Get;
use App\{IUserService, User};

final class UserController extends Controller
{
    public function __construct(private IUserService $users) {}

    #[Get('/users/:userId')]
    public function getUserById(int $userId): User
    {
        return $this->users->getById($userId);
    }
}
```

Aphiria will instantiate `UserController` via [dependency injection](dependency-injection.md) and invoke the matched route.  The `$userId` parameter will be set from the URI (preference is given to route variables, and then to query string variables).  It will also detect that a `User` object was returned by the method, and create a 200 response whose body is the serialized user object.  It uses [content negotiation](content-negotiation.md) to determine the media type to serialize to (eg JSON).  The current request is automatically set in the controller, and is accessible via `$this->request`.

You can also be a bit more explicit and return a response yourself.  For example, the following controller method is functionally identical to the previous example:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Net\Http\IResponse;
use App\IUserService;

final class UserController extends Controller
{
    public function __construct(private IUserService $users) {}
    
    #[Get('/users/:userId')]
    public function getUserById(int $userId): IResponse
    {
        $user = $this->users->getById($userId);

        return $this->ok($user);
    }
}
```

The `ok()` helper method uses a `NegotiatedResponseFactory` to build a response using the current request and [content negotiation](content-negotiation.md).  You can pass in a POPO as the response body, and the factory will use content negotiation to determine how to serialize it.

Similarly, Aphiria can [automatically deserialize request bodies](#request-body-parameters).

The following helper methods come bundled with `Controller`:

Method | Status Code
------ | ------
`accepted()` | 202
`badRequest()` | 400
`conflict()` | 409
`created()` | 201
`forbidden()` | 403
`found()` | 302
`internalServerError()` | 500
`movedPermanently()` | 301
`noContent()` | 204
`notFound()` | 404
`ok()` | 200
`unauthorized()` | 401

If your controller method has a `void` return type, a 204 "No Content" response will be created automatically.

Setting headers is simple, too:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Net\Http\{Headers, IResponse};
use App\IUserService;

final class UserController extends Controller
{
    public function __construct(private IUserService $users) {}
    
    #[Get('/users/:userId')]
    public function getUserById(int $userId): IResponse
    {
        $user = $this->users->getById($userId);
        $headers = new Headers();
        $headers->add('Cache-Control', 'no-cache');
        
        return $this->ok($user, $headers);
    }
}
```

<h2 id="parameter-resolution">Parameter Resolution</h2>

Your controller methods will frequently need to do things like deserialize the request body or read route/query string values.  Aphiria simplifies this process enormously by allowing your method signatures to be expressive.  

<h3 id="request-body-parameters">Request Bodies</h3>

Object type hints are always assumed to be the request body, and can be automatically deserialized to any POPO:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Net\Http\IResponse;
use App\{IUserService, UserDto};

final class UserController extends Controller
{
    public function __construct(private IUserService $users) {}
    
    #[Post('/users')]
    public function createUser(UserDto $userDto): IResponse
    {
        $user = $this->users->createUser($userDto->email, $userDto->password);
        
        return $this->created("users/{$user->id}", $user);
    }
}
```

This works for any media type (eg JSON) that you've registered to your [content negotiator](content-negotiation.md).

<h3 id="request-parameters">Request Parameters</h3>

Aphiria also supports resolving request parameters (eg values from the request URI or headers) in your controller methods.  It will scan route variables, and then, if no matches are found, the query string for scalar parameters.  For example, this method will grab the user ID from the route path and `includeAvatar` from the query string and cast it to a `bool`:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Routing\Attributes\Get;
use App\User;

final class UserController extends Controller
{
    // ...
    
    // Assume the query string is "?includeAvatar=1"
    #[Get('/users/:userId')]
    public function getUser(int $userId, bool $includeAvatar): User
    {
        return $this->users->getUserById($userId, $includeAvatar);
    }
}
```

Nullable parameters and parameters with default values are also supported.  If a query string parameter is optional, it _must_ be either nullable or have a default value.

Aphiria uses `RequestParameterDeserializer` to deserialize raw request parameters to values.  By default, booleans, `DateTime`s, `DateTimeImmutable`s, floats, integers, and strings are configured for you.  By default, Aphiria attempts to deserialize `DateTime` and `DateTimeImmutable` values using the `aphiria.serialization.dateTimeFormat`, then the `aphiria.serialization.dateFormat` config value in _config.php_ if the former fails.  If you'd like to register your own deserializers, extend `Aphiria\Framework\Api\Binders\ControllerBinder` and implement your own `getRequestParameterDeserializer()` method and [register that binder](dependency-injection.md#binders).  Adding a custom deserializer is easy:

```php
use Aphiria\Api\Controllers\{IRequestParameterDeserializer, RequestParameterDeserializer};
use Aphiria\DependencyInjection\IContainer;
use Aphiria\Framework\Api\Binders\ControllerBinder;
use App\YourType;

final class CustomControllerBinder extends ControllerBinder
{
    protected function getRequestParameterDeserializer(IContainer $container): IRequestParameterDeserializer
    {
        $deserializer = new RequestParameterDeserializer();
        $deserializer->registerDeserializer(
            YourType::class,
            fn(mixed $value): YourType => /* ... */,
        );
        
        return $deserializer;
    }
}
```

<h4 id="parameter-attributes">Parameter Attributes</h4>

You may find yourself wanting to be more explicit about where to resolve request parameters from in your controller.  For this, Aphiria provides `#[Header]`, `#[QueryString]`, and `#[RouteVariable]` attributes.  Not specifying an attribute will default to the resolution rules <a href="#request-parameters">above</a>.  Here's an example that's functionally identical to the above:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Routing\Attributes\{Get, QueryString, RouteVariable};
use App\User;

final class UserController extends Controller
{
    // ...
    
    // Assume the query string is "?includeAvatar=1"
    #[Get('/users/:userId')]
    public function getUser(#[RouteVariable] int $userId, #[QueryString] bool $includeAvatar): User
    {
        return $this->users->getUserById($userId, $includeAvatar);
    }
}
```

Each attribute also allows you to map the controller method parameter to the name of a route variable, query string parameter, or header.  This allows you to decouple the parameter names from the URI.  The following is identical to the previous example:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Routing\Attributes\{Get, QueryString, RouteVariable};
use App\User;

final class UserController extends Controller
{
    // ...
    
    // Assume the query string is "?includeAvatar=1"
    #[Get('/users/:userId')]
    public function getUser(
        #[RouteVariable('userId')] int $id,
        #[QueryString('includeAvatar')] bool $showAvatar,
    ): User {
        // $id will map to the "userId" route variable
        // $showAvatar will map to the "includeAvatar" query string parameter
        return $this->users->getUserById($id, $showAvatar);
    }
}
```

<h3 id="arrays-in-request-bodies">Arrays in Request Bodies</h3>

Request bodies might contain an array of values.  Because PHP doesn't support generics or typed arrays, you cannot use type-hints alone to deserialize arrays of values.  However, it's still easy to do within your controller methods:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Routing\Attributes\Post;
use App\User;

final class UserController extends Controller
{
    // ...

    #[Post('/users')]
    public function createManyUsers(): IResponse
    {
        $users = $this->readRequestBodyAs(User::class . '[]');
        $this->users->createManyUsers($users);
        
        return $this->created();
    }
}
```

<h3 id="validating-request-bodies">Validating Request Bodies</h3>

[Aphiria's validation library](validation.md) automatically validates request bodies on every request.  By default, when an invalid request body is detected, a <a href="https://tools.ietf.org/html/rfc7807" target="_blank">problem details</a> response is returned as a 400.  If you'd like to change the response body to something different, you may do so by [creating a custom mapping](exception-handling.md#custom-problem-details-mappings) for an `InvalidRequestBodyException`.

If a request body cannot be automatically deserialized, as in the case of [arrays of objects in request bodies](#arrays-in-request-bodies), you must manually perform validation.

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Api\Validation\IRequestBodyValidator;
use Aphiria\Net\Http\IResponse;
use App\User;

final class UserController extends Controller
{
    public function __construct(private IRequestBodyValidator $validator) {}

    #[Post('/users')]
    public function createManyUsers(): IResponse
    {
        $users = $this->readRequestBodyAs(User::class . '[]');
        $this->validator->validate($this->request, $users);

        // Continue processing the users...
    }
}
```

<h2 id="parsing-request-data">Parsing Request Data</h2>

Your controllers might need to do more advanced reading of [request data](http-requests.md), such as reading cookies, reading multipart bodies, or determining the content type of the request.  To simplify this kind of work, an instance of `RequestParser` is automatically set in your controller:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Net\Http\Headers;
use Aphiria\Net\Http\HttpStatusCode;
use Aphiria\Net\Http\IResponse;
use Aphiria\Net\Http\Response;
use Aphiria\Net\Http\StringBody;

final class JsonPrettifierController extends Controller
{
    #[Post('/prettyjson')]
    public function prettifyJson(): IResponse
    {
        if (!$this->requestParser->isJson($this->request)) {
            return $this->badRequest();
        }
        
        $bodyAsString = $this->request->body->readAsString();
        $prettyJson = json_encode($bodyAsString, JSON_PRETTY_PRINT);
        $headers = new Headers();
        $headers->add('Content-Type', 'application/json');
        $response = new Response(HttpStatusCode::Ok, $headers, new StringBody($prettyJson));
        
        return $response;
    }
}
```

<h2 id="formatting-response-data">Formatting Response Data</h2>

If you need to write data back to the [response](http-responses.md), eg cookies or creating a redirect, an instance of `ResponseFormatter` is automatically available in the controller:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Net\Http\Headers\Cookie;
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Attributes\Put;
use App\{IPreferenceService, Preferences};

final class PreferencesController extends Controller
{
    public function __construct(private IPreferenceService $preferences) {}

    #[Put('/preferences')]
    public function savePreferences(Preferences $preferences): IResponse
    {
        // Store the preferences
        $this->preferences->save($preferences);
    
        // Write a cookie containing the preferences for a better UX
        $response = $this->ok();
        $preferencesCookie = new Cookie('preferences', $preferences->toJson(), 60 * 60 * 24 * 30);
        $this->responseFormatter->setCookie($response, $preferencesCookie);
        
        return $response;
    }
}
```

<h2 id="getting-the-current-user">Getting the Current User</h2>

If you're using the [authentication library](authentication.md), you can grab the current [user](authentication.md#principals):

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Authentication\Attributes\Authenticate;
use Aphiria\Routing\Attributes\Get;
use App\Book;

final class BookController extends Controller
{
    #[Get('/books/:id')]
    #[Authenticate]
    public function getBook(int $id): Book
    {
        // This can be null if the user was not set by authentication middleware
        $user = $this->user;
        
        // ...
    }
}
```
