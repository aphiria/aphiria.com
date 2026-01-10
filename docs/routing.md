<h1 id="doc-title">Routing</h1>

<nav class="toc-nav">

<div class="toc-nav-contents">

<h2 id="table-of-contents">Table of Contents</h2>

<ol>
<li><a href="#basics">Basics</a><ol>
<li><a href="#route-variables">Route Variables</a></li>
<li><a href="#optional-route-parts">Optional Route Parts</a></li>
<li><a href="#route-groups">Route Groups</a></li>
<li><a href="#middleware">Middleware</a></li>
<li><a href="#route-constraints">Route Constraints</a></li>
</ol>
</li>
<li><a href="#route-attributes">Route Attributes</a><ol>
<li><a href="#scanning-for-attributes">Scanning For Attributes</a></li>
<li><a href="#route-attributes-example">Example</a></li>
<li><a href="#route-attributes-groups">Route Groups</a></li>
<li><a href="#route-attributes-middleware">Middleware</a></li>
<li><a href="#route-attributes-constraints">Route Constraints</a></li>
</ol>
</li>
<li><a href="#route-builders">Route Builders</a><ol>
<li><a href="#route-builders-groups">Route Groups</a></li>
<li><a href="#route-builders-middleware">Middleware</a></li>
<li><a href="#route-builders-constraints">Route Constraints</a></li>
</ol>
</li>
<li><a href="#versioned-api-example">Versioned API Example</a><ol>
<li class="context-library"><a href="#getting-php-headers">Getting Headers in PHP</a></li>
</ol>
</li>
<li><a href="#route-variable-constraints">Route Variable Constraints</a><ol>
<li><a href="#built-in-constraints">Built-In Constraints</a></li>
<li><a href="#making-your-own-custom-constraints">Making Your Own Custom Constraints</a></li>
</ol>
</li>
<li><a href="#creating-route-uris">Creating Route URIs</a><ol>
<li><a href="#creating-route-requests">Creating Route Requests</a></li>
</ol></li>
<li><a href="#caching">Caching</a><ol>
<li class="context-library"><a href="#route-caching">Route Caching</a></li>
<li class="context-library"><a href="#trie-caching">Trie Caching</a></li>
</ol>
</li>
<li class="context-library"><a href="#using-aphirias-net-library">Using Aphiria&#39;s Net Library</a></li>
<li><a href="#matching-algorithm">Matching Algorithm</a></li>
</ol>

</div>

</nav>

<h2 id="basics">Basics</h2>

Routing is the process of mapping HTTP requests to actions.  You can check out what makes Aphiria's routing library different [here](framework-comparisons.md#aphiria-routing) as well as the [server configuration](installation.md#server-config) necessary to use it.

<div class="context-framework">

Let's look at how to register a route in a [module](application-builders.md#modules).  First, let's define a controller to route to:

```php
use Aphiria\Api\Controllers\Controller;
use App\{Book, IBookService};

final class BookController extends Controller
{
    // Assume we have a book service to retrieve books from
    public function __construct(private IBookService $books) {}

    public function getBookById(int $bookId): Book
    {
        return $this->books->getBookById($bookId);
    }
}
```

Next, let's use a [route builder](#route-builders) to add a route to this controller (you can also use [attribute-based routing](#route-attributes-example)):

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Authorization\Middleware\Authorize;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\RouteCollectionBuilder
use App\BookController;

final class BookModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withRoutes($appBuilder, function (RouteCollectionBuilder $routes): void {
            $routes
                ->get('/books/:bookId')
                ->mapsToMethod(BookController::class, 'getBookById')
                ->withMiddleware(Authorize::class);
        });
    }
}
````

Now, whenever your app receives a request like `GET /books/123`, Aphiria will automatically instantiate `BookController` using the [dependency injection container](dependency-injection.md) and route the request to `getBookById()`.  You can learn more about Aphiria controllers [here](controllers.md).

</div>
<div class="context-library">

You can use a fluent syntax or [attributes](#route-attributes-example) to configure your routes.  We'll look at a complete example that routes a request.  First, let's define a controller that this path routes to using PSR-7 responses and PSR-11 containers:

```php
use Aphiria\Routing\Attributes\Controller;
use App\{Book, IBookService};
use Nyholm\Psr7\Factory\Psr17Factory;
use Psr\Http\Message\ResponseInterface;

#[Controller]
final class BookController
{
    // Assume we have a book service to retrieve books from
    public function __construct(private IBookService $books) {}

    public function getBookById(int $bookId): ResponseInterface
    {
        $book = $this->books->getBookById($bookId);
        $psr17Factory = new Psr17Factory();
        
        // Assume our Book class has a toJson() method
        return $psr17Factory
            ->createResponse(200)
            ->withHeader('Content-Type', 'application/json')
            ->withBody($psr17Factory->createStream($book->toJson()));
    }
}
```

Next, let's add a route to this controller method:

```php
use Aphiria\Routing\Matchers\TrieRouteMatcher;
use Aphiria\Routing\RouteCollectionBuilder;
use Aphiria\Routing\UriTemplates\Compilers\Tries\TrieFactory;
use App\{Authorize, BookController};

// Register the route
$routes = new RouteCollectionBuilder();
$routes
    ->get('/books/:bookId')
    ->mapsToMethod(BookController::class, 'getBookById')
    ->withMiddleware(Authorize::class);

// Set up the route matcher
$routeMatcher = new TrieRouteMatcher(new TrieFactory($routes->build())->createTrie());

// Find a matching route
$result = $routeMatcher->matchRoute(
    $_SERVER['REQUEST_METHOD'],
    $_SERVER['HTTP_HOST'],
    $_SERVER['REQUEST_URI'],
);
```

Let's say the request was `GET /books/123`.  You can route it to the controller:

```php
if (!$result->matchFound) {
    \header('HTTP/1.1 404 Not Found');
    
    exit();
}

if ($result->methodIsAllowed === false) {
    \header('HTTP/1.1 405 Method Not Allowed');
    \header('Allow', implode(', ', $result->allowedMethods));
    
    exit();
}

// Create the controller (assume we already have $container configured)
$controller = $container->get($result->route->action->controllerName);
// Resolve the parameters
$resolvedParameters = [];
$reflectedMethod = new \ReflectionMethod($controller, $result->route->action->methodName);

foreach ($reflectedMethod->getParameters() as $reflectedParameter) {
    $parameterName = $reflectedParameter->getName();
    $routeVariable = $result->routeVariables[$parameterName]
        ?? throw new \Exception("No value for route parameter $parameterName");
    $type = $reflectedParameter->getType();
    $resolvedParameters[] = match ($type) {
        'int' => (int)$routeVariable,
        'bool' => (bool)$routeVariable,
        'float' => (float)$routeVariable,
        'string' => (string)$routeVariable,
        default => throw new \Exception("Unsupported route parameter type $type");
    }
}

// Invoke the controller method
$response = $controller->{$result->route->action->methodName}(...$resolvedParameters);
// Finally, emit our response
\header("HTTP/1.1 {$response->getStatusCode()} {$response->getReasonPhrase()}");

foreach ($response->getHeaders() as $name => $values) {
    foreach ($values as $value) {
        \header("$name: $value");
    }
}

echo $response->getBody();
exit();
```

</div>

<h3 id="route-variables">Route Variables</h3>

Aphiria provides a simple syntax for your URIs.  To capture variables in your host or path, use `:varName`, eg `:subdomain.example.com` in the host or `/users/:userId/profile` in the path.

<h3 id="optional-route-parts">Optional Route Parts</h3>

If part of your route is optional, then surround it with brackets.  For example, the following will match both `/archives/2017` and `/archives/2017/7`: `/archives/:year[/:month]`.  Optional route parts can be nested: `/archives/:year[/:month[/:day]]`.  This would match `/archives/2017`, `/archives/2017/07`, and `/archives/2017/07/24`.

<h3 id="route-groups">Route Groups</h3>

Often times, a lot of your routes will share similar properties, such as hosts and paths to match on, or [middleware](middleware.md).  Route groups can even be nested.  Learn more how to add them as [attributes](#route-attributes-groups) or [route builders](#route-builders-groups).

<h3 id="middleware">Middleware</h3>

Middleware are a great way to modify both the request and the response on an endpoint.  Aphiria lets you define [middleware](middleware.md) on your endpoints without binding you to any particular library/framework's middleware implementations.  Learn how to add them as [attributes](#route-attributes-middleware) or [route builders](#route-builders-middleware).

<h4 id="middleware-parameters">Middleware Parameters</h4>

Some frameworks, such as Aphiria and Laravel, let you bind parameters to middleware.  For example, if you have an `Authorization` middleware, but need to bind the user role that's necessary to access that route, you might want to pass in the required user role.  Learn more about how to specify middleware parameters as [attributes](#route-attributes-middleware) or [route builders](#route-builders-middleware).

<h3 id="route-constraints">Route Constraints</h3>

Sometimes, you might find it useful to add some custom logic for matching routes.  This could involve enforcing anything from only allowing certain HTTP methods for a route (eg `HttpMethodRouteConstraint`) or only allowing HTTPS requests to a particular endpoint.  Learn more how to add them as [attributes](#route-attributes-constraints) or [route builders](#route-builders-constraints).

<h2 id="route-attributes">Route Attributes</h2>

Aphiria provides the optional functionality to define your routes via attributes if you so choose.  A benefit to defining your routes this way is that it keeps the definition of your routes close (literally) to your controller methods, reducing the need to jump around your code base.

<h3 id="scanning-for-attributes">Scanning For Attributes</h3>

Before you can use attributes, you'll need to configure Aphiria to scan for them.

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;

final class GlobalModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withRouteAttributes($appBuilder);
    }
}
```

> **Note:** You can configure the paths to scan for attributes in `aphiria.routing.attributePaths` in your _config.php_.

</div>
<div class="context-library">

You can manually configure the router to scan for attributes:

```php
use Aphiria\Routing\Attributes\AttributeRouteRegistrant;
use Aphiria\Routing\Matchers\TrieRouteMatcher;
use Aphiria\Routing\RouteCollection;
use Aphiria\Routing\UriTemplates\Compilers\Tries\TrieFactory;

$routes = new RouteCollection();
$routeAttributeRegistrant = new AttributeRouteRegistrant(['PATH_TO_SCAN']);
$routeAttributeRegistrant->registerRoutes($routes);
$routeMatcher = new TrieRouteMatcher(new TrieFactory($routes)->createTrie());

// Find a matching route
$result = $routeMatcher->matchRoute(
    $_SERVER['REQUEST_METHOD'],
    $_SERVER['HTTP_HOST'],
    $_SERVER['REQUEST_URI'],
);
```

</div>

<h3 id="route-attributes-example">Example</h3>

Let's actually define a route with attributes:

<div class="context-framework">

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Authentication\Attributes\Authenticate;
use Aphiria\Routing\Attributes\Get;
use App\Book;

final class BookController extends Controller
{
    #[Get('/books/:bookId'), Authenticate]
    public function getBookById(int $bookId): Book
    {
        // ...
    }
}
```

</div>
<div class="context-library">

```php
use Aphiria\Routing\Attributes\{Controller, Get};
use App\{Authenticate, Book};

#[Controller]
final class BookController
{
    #[Get('/books/:bookId'), Authenticate]
    public function getBookById(int $bookId): Book
    {
        // ...
    }
}
```

</div>

> **Note:** Controllers must either extend `Aphiria\Api\Controllers\Controller` or use the `#[Controller]` attribute.

The following HTTP methods have route attributes:

* `#[Any]` (any HTTP method)
* `#[Delete]`
* `#[Get]`
* `#[Head]`
* `#[Options]`
* `#[Patch]`
* `#[Post]`
* `#[Put]`
* `#[Trace]`

Each attribute takes in the same parameters:

```php
use Aphiria\Routing\Attributes\Get;

#[Get(
    path: '/courses/:courseId',
    host: 'api.example.com',
    name: 'getCourse',
    isHttpsOnly: true,
    parameters: ['role' => 'admin'],
)]
```

You can read more about how request parameters are resolved in your controller methods [here](controllers.md#request-parameters).

<h3 id="route-attributes-groups">Route Groups</h3>

You can apply route groups, constraints, and middleware to all endpoints in a controller using attributes.

<div class="context-framework">

```php
use Aphiria\Api\Controllers\Controller as BaseController;
use Aphiria\Authentication\Attributes\Authenticate;
use Aphiria\Routing\Attributes\{Controller, Get, RouteConstraint};
use App\{Course, MyConstraint};

#[Controller(
    path: '/courses/:courseId',
    host: 'api.example.com',
    isHttpsOnly: true,
)]
#[RouteConstraint(MyConstraint::class)]
#[Authenticate]
final class CourseController extends BaseController
{
    #[Get('')]
    public function getCourseById(int $courseId): Course
    {
        // ...
    }
    
    #[Get('/professors')]
    public function getCourseProfessors(int $courseId): array
    {
        // ...
    }
}
```

</div>
<div class="context-library">

```php
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Attributes\{Controller, Get, RouteConstraint};
use App\{Authenticate, Course, MyConstraint};

#[Controller(
    path: '/courses/:courseId',
    host: 'api.example.com',
    isHttpsOnly: true,
)]
#[RouteConstraint(MyConstraint::class)]
#[Authenticate]
final class CourseController
{
    #[Get('')]
    public function getCourseById(int $courseId): IResponse
    {
        // ...
    }
    
    #[Get('/professors')]
    public function getCourseProfessors(int $courseId): IResponse
    {
        // ...
    }
}
```

</div>

When our routes get compiled, the route group path will be prefixed to the path of any route within the controller.  In the above example, this would create a route with path `/courses/:courseId` and another with path `/courses/:courseId/professors`.
  
<h3 id="route-attributes-middleware">Middleware</h3>

Middleware are a separate attribute and can be applied to an entire controller class or to a specific controller method:


<div class="context-framework">

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Routing\Attributes\Middleware;
use App\MyMiddleware;

#[Middleware(MyMiddleware::class, parameters: ['foo' => 'bar'])]
final class BookController extends Controller
{
    // ...
}
```

> **Note:** You can also use the nearly identical `Aphiria\Middleware\Attributes\Middleware` attribute instead of the routing library's.  The two are interchangeable.

</div>
<div class="context-library">

```php
use Aphiria\Routing\Attributes\{Controller, Middleware};
use App\MyMiddleware;

#[Controller]
#[Middleware(MyMiddleware::class, parameters: ['foo' => 'bar'])]
final class BookController
{
    // ...
}
```

</div>

<h3 id="route-attributes-constraints">Route Constraints</h3>

You can specify the name of the route constraint class and any primitive constructor parameter values:

<div class="context-framework">

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Routing\Attributes\{Get, RouteConstraint};
use App\{MyConstraint, User};

final class UserController extends Controller
{
    #[Get('/users/:userId')]
    #[RouteConstraint(MyConstraint::class, constructorParameters: ['param1'])]
    public function getUserById(int $userId): User
    {
        // ...
    }
}
```

</div>
<div class="context-library">

```php
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Attributes\{Controller, Get, RouteConstraint};
use App\{MyConstraint, User};

#[Controller]
final class UserController
{
    #[Get('/users/:userId')]
    #[RouteConstraint(MyConstraint::class, constructorParameters: ['param1'])]
    public function getUserById(int $userId): IResponse
    {
        // ...
    }
}
```

</div>

Similar to [middleware](#route-attributes-middleware), you can add route constraints to a controller class to apply it to all routes in that controller.

<h2 id="route-builders">Route Builders</h2>

Route builders are an alternative to [attributes](#route-attributes) that give you a fluent syntax for mapping your routes to controller methods.  They also let you [bind any middleware](#route-builders-middleware) classes and properties to the route.  The following methods are available to create routes:

<div class="context-framework">

 ```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\RouteCollectionBuilder;

final class FooModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withRoutes($appBuilder, function (RouteCollectionBuilder $routes) {
            $routes->delete('/foo');
            $routes->get('/foo');
            $routes->options('/foo');
            $routes->patch('/foo');
            $routes->post('/foo');
            $routes->put('/foo');
        });
    }
}
```

</div>
<div class="context-library">


 ```php
$routes->delete('/foo');
$routes->get('/foo');
$routes->options('/foo');
$routes->patch('/foo');
$routes->post('/foo');
$routes->put('/foo');
```

</div>

Let's look at the different parameters route builders accept:

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\RouteCollectionBuilder;
use App\UserController;

final class UserModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withRoutes($appBuilder, function (RouteCollectionBuilder $routes) {
            $routes
                ->get(path: '/user', host: 'api.example.com', isHttpsOnly: true)
                ->mapsToMethod(UserController::class, 'getUserById');
        });
    }
}
```

</div>
<div class="context-library">

```php
use App\UserController;

$routes
    ->get(path: '/user', host: 'api.example.com', isHttpsOnly: true)
    ->mapsToMethod(UserController::class, 'getUserById');
```

</div>

You can also call `RouteCollectionBuilder::route()` and pass in the HTTP method(s) you'd like to map to.

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\RouteCollectionBuilder;

final class UserModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withRoutes($appBuilder, function (RouteCollectionBuilder $routes) {
            $routes->route(['GET'], path: '/user', host: 'api.example.com', isHttpsOnly: true);
        });
    }
}
```

</div>
<div class="context-library">

```php
$routes->route(['GET'], path: '/user', host: 'api.example.com', isHttpsOnly: true);
```

</div>

<h3 id="route-builders-groups">Route Groups</h3>

Route groups let you logically group routes with shared parameters, eg path prefixes and middleware.

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Authentication\Attributes\Authenticate;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\Middleware\MiddlewareBinding;
use Aphiria\Routing\{RouteCollectionBuilder, RouteGroupOptions};
use App\{CourseController, MyConstraint};

final class CourseModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withRoutes($appBuilder, function (RouteCollectionBuilder $routes) {
            $routes->group(
                new RouteGroupOptions(
                    path: '/courses/:courseId',
                    host: 'api.example.com',
                    isHttpsOnly: true,
                    constraints: [new MyConstraint()],
                    middlewareBindings: [new MiddlewareBinding(Authenticate::class)],
                    parameters: ['role' => 'admin'],
                ),
                function (RouteCollectionBuilder $routes) {
                    // This route's path will be "courses/:courseId"
                    $routes
                        ->get('')
                        ->mapsToMethod(CourseController::class, 'getCourseById');
            
                    // This route's path will be "courses/:courseId/professors"
                    $routes
                        ->get('/professors')
                        ->mapsToMethod(CourseController::class, 'getCourseProfessors');
                },
            );
        });
    }
}
```

</div>
<div class="context-library">

```php
use Aphiria\Routing\Middleware\MiddlewareBinding;
use Aphiria\Routing\{RouteCollectionBuilder, RouteGroupOptions};
use App\{Authenticate, CourseController, MyConstraint};

$routes->group(
    new RouteGroupOptions(
        path: '/courses/:courseId',
        host: 'api.example.com',
        isHttpsOnly: true,
        constraints: [new MyConstraint()],
        middlewareBindings: [new MiddlewareBinding(Authenticate::class)],
        parameters: ['role' => 'admin'],
    ),
    function (RouteCollectionBuilder $routes) {
        // This route's path will be "courses/:courseId"
        $routes
            ->get('')
            ->mapsToMethod(CourseController::class, 'getCourseById');

        // This route's path will be "courses/:courseId/professors"
        $routes
            ->get('/professors')
            ->mapsToMethod(CourseController::class, 'getCourseProfessors');
    },
);
```

</div>

<h3 id="route-builders-middleware">Middleware</h3>

To bind a single middleware class to your route, call:

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\RouteCollectionBuilder;
use App\{FooMiddleware, MyController};

final class FooModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withRoutes($appBuilder, function (RouteCollectionBuilder $routes) {
            $routes
                ->get('/foo')
                ->mapsToMethod(MyController::class, 'myMethod')
                ->withMiddleware(FooMiddleware::class);
        });
    }
}
```

</div>
<div class="context-library">

```php
use App\{FooMiddleware, MyController};

$routes
    ->get('/foo')
    ->mapsToMethod(MyController::class, 'myMethod')
    ->withMiddleware(FooMiddleware::class);
```

</div>

To bind many middleware classes, call:

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\RouteCollectionBuilder;
use App\{BarMiddleware, FooMiddleware, MyController};

final class FooModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withRoutes($appBuilder, function (RouteCollectionBuilder $routes) {
            $routes
                ->get('/foo')
                ->mapsToMethod(MyController::class, 'myMethod')
                ->withManyMiddleware([
                    FooMiddleware::class,
                    BarMiddleware::class,
                ]);
        });
    }
}
```

</div>
<div class="context-library">

```php
use App\{BarMiddleware, FooMiddleware, MyController};

$routes
    ->get('/foo')
    ->mapsToMethod(MyController::class, 'myMethod')
    ->withManyMiddleware([
        FooMiddleware::class,
        BarMiddleware::class,
    ]);
```

</div>

Under the hood, these class names get converted to instances of `MiddlewareBinding`.

You can also add [parameters to your middleware](#middleware-parameters):

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Authorization\Middleware\Authorize;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\Middleware\MiddlewareBinding;
use Aphiria\Routing\RouteCollectionBuilder;
use App\MyController;

final class FooModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withRoutes($appBuilder, function (RouteCollectionBuilder $routes) {
            $routes
                ->get('/foo')
                ->mapsToMethod(MyController::class, 'myMethod')
                ->withMiddleware(Authorize::class, ['role' => 'admin']);
            
            // Or...
            
            $routes
                ->get('/foo')
                ->mapsToMethod(MyController::class, 'myMethod')
                ->withManyMiddleware([
                    new MiddlewareBinding(Authorize::class, ['role' => 'admin']),
                    // Other middleware...
                ]);
        });
    }
}
```

</div>
<div class="context-library">

```php
use Aphiria\Routing\Middleware\MiddlewareBinding;
use App\{Authorize, MyController};

$routes
    ->get('/foo')
    ->mapsToMethod(MyController::class, 'myMethod')
    ->withMiddleware(Authorize::class, ['role' => 'admin']);

// Or...

$routes
    ->get('/foo')
    ->mapsToMethod(MyController::class, 'myMethod')
    ->withManyMiddleware([
        new MiddlewareBinding(Authorize::class, ['role' => 'admin']),
        // Other middleware...
    ]);
```

</div>

<h3 id="route-builders-constraints">Route Constraints</h3>

To add a single route constraint to a route, call:

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\RouteCollectionBuilder;
use App\{FooConstraint, PostController};

final class PostModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withRoutes($appBuilder, function (RouteCollectionBuilder $routes) {
            $routes
                ->get('/posts')
                ->mapsToMethod(PostController::class, 'getAllPosts')
                ->withConstraint(new FooConstraint());
        });
    }
}
```

</div>
<div class="context-library">

```php
use App\{FooConstraint, PostController};

$routes
    ->get('/posts')
    ->mapsToMethod(PostController::class, 'getAllPosts')
    ->withConstraint(new FooConstraint());
```

</div>

To add many route constraints, call:

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\RouteCollectionBuilder;
use App\{BarConstraint, FooConstraint, PostController};

final class PostModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withRoutes($appBuilder, function (RouteCollectionBuilder $routes) {
            $routes
                ->get('/posts')
                ->mapsToMethod(PostController::class, 'getAllPosts')
                ->withManyConstraints([new FooConstraint(), new BarConstraint()]);
        });
    }
}
```

</div>
<div class="context-library">

```php
use App\{BarConstraint, FooConstraint, PostController};

$routes
    ->get('/posts')
    ->mapsToMethod(PostController::class, 'getAllPosts')
    ->withManyConstraints([new FooConstraint(), new BarConstraint()]);
```

</div>

<h2 id="versioned-api-example">Versioned API Example</h2>

Let's say your app sends an API version header, and you want to match an endpoint that supports that version.  You could do this by using a route "parameter" and a route constraint.  Let's create some routes that have the same path, but support different versions of the API:

<div class="context-framework">

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Routing\Attributes\{Get, RouteConstraint};
use App\ApiVersionConstraint;

final class CommentController extends Controller
{
    #[Get('/comments', parameters: ['Api-Version' => 'v1.0'])]
    #[RouteConstraint(ApiVersionConstraint::class)]
    public function getAllComments1_0(): array
    {
        // This route will require an Api-Version value of 'v1.0'
    }
    
    #[Get('/comments', parameters: ['Api-Version' => 'v2.0'])]
    #[RouteConstraint(ApiVersionConstraint::class)]
    public function getAllComments2_0(): array
    {
        // This route will require an Api-Version value of "v2.0"
    }
}
```

</div>
<div class="context-library">

```php
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Attributes\{Controller, Get, RouteConstraint};
use App\ApiVersionConstraint;

#[Controller]
final class CommentController
{
    #[Get('/comments', parameters: ['Api-Version' => 'v1.0'])]
    #[RouteConstraint(ApiVersionConstraint::class)]
    public function getAllComments1_0(): IResponse
    {
        // This route will require an Api-Version value of 'v1.0'
    }
    
    #[Get('/comments', parameters: ['Api-Version' => 'v2.0'])]
    #[RouteConstraint(ApiVersionConstraint::class)]
    public function getAllComments2_0(): IResponse
    {
        // This route will require an Api-Version value of "v2.0"
    }
}
```

</div>

Now, let's add a route constraint to match the "Api-Version" header to the parameter on our route:

```php
use Aphiria\Routing\Matchers\Constraints\IRouteConstraint;
use Aphiria\Routing\Matchers\MatchedRouteCandidate;

final class ApiVersionConstraint implements IRouteConstraint
{
    public function passes(
        MatchedRouteCandidate $matchedRouteCandidate,
        string $httpMethod,
        string $host,
        string $path,
        array $headers,
    ): bool {
        $parameters = $matchedRouteCandidate->route->parameters;

        if (!isset($parameters['Api-Version'])) {
            return false;
        }

        return \in_array($parameters['Api-Version'], $headers['Api-Version'], true);
    }
}
```

If we hit `/comments` with an "Api-Version" header value of "v2.0", we'd match the second route in our example.

<div class="context-library">

<h3 id="getting-php-headers">Getting Headers in PHP</h3>

PHP is irritatingly difficult to extract headers from `$_SERVER`, which is why the routing library includes `HeaderParser`:

```php
use Aphiria\Routing\Requests\RequestHeaderParser;

$headers = new RequestHeaderParser()->parseHeaders($_SERVER);
echo $headers['Content-Type']; // "application/json"
```

</div>

<h2 id="route-variable-constraints">Route Variable Constraints</h2>

You can enforce certain constraints to pass before matching on a route.  These constraints come after variables, and must be enclosed in parentheses.  For example, if you want an integer to fall between two values, you can specify a route of

```php
:month(int,min(1),max(12))
```

> **Note:** If a constraint does not require any parameters, then the parentheses after the constraint slug are optional.

<h3 id="built-in-constraints">Built-In Constraints</h3>

The following constraints are built-into Aphiria:

Name | Description
------ | ------
`alpha` | The value must only contain alphabet characters
`alphanumeric` | The value must only contain alphanumeric characters
`between` | The value must fall between a min and max (takes in whether or not the min and max values are inclusive)
`date` | The value must match a date-time format
`in` | The value must be in a list of acceptable values
`int` | The value must be an integer
`notIn` | The value must not be in a list of values
`numeric` | The value must be numeric
`regex` | The value must satisfy a regular expression
`uuidv4` | The value must be a UUID v4

<h3 id="making-your-own-custom-constraints">Making Your Own Custom Constraints</h3>

You can register your own constraint by implementing `IRouteVariableConstraint`.  Let's make a constraint that enforces a certain minimum string length:

```php
namespace App;

use Aphiria\Routing\UriTemplates\Constraints\IRouteVariableConstraint;

final class MinLengthConstraint implements IRouteVariableConstraint
{
    public function __construct(private int $minLength) {}

    public static function getSlug(): string
    {
        return 'minLength';
    }

    public function passes($value): bool
    {
        return \mb_strlen($value) >= $this->minLength;
    }
}
```

<div class="context-framework">

Let's register our constraint with the constraint factory.  You can use a [component](application-builders.md#component-routes):

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\UriTemplates\Constraints\IRouteVariableConstraint;
use App\MinLengthConstraint;

final class GlobalModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withRouteVariableConstraint(
            $appBuilder,
            MinLengthConstraint::getSlug(),
            fn(int $minLength): IRouteVariableConstraint => new MinLengthConstraint($minLength),
        );
    }
}
```

</div>
<div class="context-library">

Let's register our constraint with the constraint factory.  You can register the constraint manually:

```php
use Aphiria\Routing\UriTemplates\Constraints\IRouteVariableConstraint;
use Aphiria\Routing\UriTemplates\Constraints\RouteVariableConstraintFactory;
use Aphiria\Routing\UriTemplates\Constraints\RouteVariableConstraintFactoryRegistrant;
use App\MinLengthConstraint;

// Register some built-in constraints to our factory
$constraintFactory = new RouteVariableConstraintFactoryRegistrant()
    ->registerConstraintFactories(new RouteVariableConstraintFactory());

// Register our custom constraint
$constraintFactory->registerConstraintFactory(
    MinLengthConstraint::getSlug(),
    fn(int $minLength): IRouteVariableConstraint => new MinLengthConstraint($minLength),
);
```

Finally, register this constraint factory with the trie compiler:

```php
use Aphiria\Routing\Matchers\TrieRouteMatcher;
use Aphiria\Routing\RouteCollectionBuilder;
use Aphiria\Routing\UriTemplates\Compilers\Tries\{TrieCompiler, TrieFactory};
use App\PartController;

$routes = new RouteCollectionBuilder();
$routes
    ->get('parts/:serialNumber(minLength(6))')
    ->mapsToMethod(PartController::class, 'getPartBySerialNumber');

$trieCompiler = new TrieCompiler($constraintFactory);
$trieFactory = new TrieFactory($routes->build(), null, $trieCompiler);
$routeMatcher = new TrieRouteMatcher($trieFactory->createTrie());
```

Our route will now enforce a serial number with minimum length 6.

</div>

<h2 id="creating-route-uris">Creating Route URIs</h2>

You might find yourself wanting to create a link to a particular route within your app.  Let's say you have a route named `GetUserById` with a URI template of `/users/:userId`.  We can generate a link to get a particular user.  The best way is to inject an instance of `IRouteUriFactory` into your controller:

<div class="context-framework">

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Attributes\{Get, Post};
use Aphiria\Routing\UriTemplates\{AstRouteUriFactory, IRouteUriFactory};
use App\User;

final class UserController extends Controller
{
    public function __construct(private IRouteUriFactory $routeUriFactory) {}
    
    #[Post('/users')]
    public function createUser(User $user): IResponse
    {
        // Create the user...
        
        $location = $this->routeUriFactory->createRouteUri('GetUserById', ['userId' => $user->id]);
        
        return $this->created($location);
    }
    
    #[Get('/users/:userId', name: 'GetUserById')]
    public function getUserById(int $userId): User
    {
        // Get the user...
    }
}

// Assume you've already created your routes
$routeUriFactory = new AstRouteUriFactory($routes);

// Will create "/users/123"
$uriForUser123 = $routeUriFactory->createRouteUri('GetUserById', ['userId' => 123]);
```

</div>
<div class="context-library">

```php
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Attributes\{Controller, Get, Post};
use Aphiria\Routing\UriTemplates\{AstRouteUriFactory, IRouteUriFactory};

#[Controller]
final class UserController
{
    public function __construct(private IRouteUriFactory $routeUriFactory) {}
    
    #[Post('/users')]
    public function createUser(): IResponse
    {
        // Create the user...
        
        $location = $this->routeUriFactory->createRouteUri('GetUserById', ['userId' => $user->id]);
        
        // Create response with the location...
        
    }
    
    #[Get('/users/:userId', name: 'GetUserById')]
    public function getUserById(int $userId): IResponse
    {
        // Get the user...
    }
}

// Assume you've already created your routes
$routeUriFactory = new AstRouteUriFactory($routes);

// Will create "/users/123"
$uriForUser123 = $routeUriFactory->createRouteUri('GetUserById', ['userId' => 123]);
```

</div>

Generated URIs will be a relative path unless the URI template specified a host.  Absolute URIs are assumed to be HTTPS unless the URI template is specifically set to not be HTTPS-only.

Optional route variables can be specified, too.  Let's assume the URI template for `GetBooksFromArchive` is `/archives/:year[/:month]`:

<div class="context-framework">

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Routing\Attributes\Get;
use Aphiria\Routing\UriTemplates\IRouteUriFactory;

final class BookController extends Controller
{
    public function __construct(private IRouteUriFactory $routeUriFactory) {}
    
    #[Get('/books/links')]
    public function getArchiveLinks(): array
    {
        $links = [
            // Will create "/archives/2019"
            $this->routeUriFactory->createRouteUri('GetBooksFromArchive', ['year' => 2019]),
            // Will create "/archives/2019/12"
            $this->routeUriFactory->createRouteUri('GetBooksFromArchive', ['year' => 2019, 'month' => 12]),
        ];
        
        return $links;
    }
}
```

</div>
<div class="context-library">

```php
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Attributes\{Controller, Get};
use Aphiria\Routing\UriTemplates\IRouteUriFactory;

#[Controller]
final class BookController
{
    public function __construct(private IRouteUriFactory $routeUriFactory) {}
    
    #[Get('/books/links')]
    public function getArchiveLinks(): IResponse
    {
        $links = [
            // Will create "/archives/2019"
            $this->routeUriFactory->createRouteUri('GetBooksFromArchive', ['year' => 2019]),
            // Will create "/archives/2019/12"
            $this->routeUriFactory->createRouteUri('GetBooksFromArchive', ['year' => 2019, 'month' => 12]),
        ];
        
        return $links;
    }
}
```

</div>

If you use [parameter attributes](controllers.md#parameter-attributes), Aphiria will respect them when determining where to apply the route variables (eg by putting them in the route path/host or in the query string).

<h3 id="creating-route-requests">Creating Route Requests</h3>

If your routes include a `#[Header]` variable that you'd like to auto-populate or you want to create an [HTTP request](http-requests.md) for your route and not just a URI, you can use `RouteRequestFactory`:

<div class="context-framework">

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Framework\Routing\{IRouteRequestFactory, RouteRequestFactory};
use Aphiria\Routing\Attributes\Get;

final class BookController extends Controller
{
    public function __construct(private IRouteRequestFactory $routeRequestFactory) {}
    
    #[Get('/books/dump-request')]
    public function dumpRequest(): string
    {
        // For demonstration's sake, we'll just dump the raw HTTP request
        return (string)$this->routeRequestFactory->createRouteRequest(
            'GetBooksFromArchive',
            ['year' => 2019],
        );
    }
}
```

</div>
<div class="context-library">

```php
use Aphiria\Framework\Routing\{IRouteRequestFactory, RouteRequestFactory};
use Aphiria\Net\Http\{IResponse, Response};
use Aphiria\Routing\Attributes\{Controller, Get};

#[Controller]
final class BookController
{
    public function __construct(private IRouteRequestFactory $routeRequestFactory) {}
    
    #[Get('/books/dump-request')]
    public function dumpRequest(): IResponse
    {
        // For demonstration's sake, we'll just dump the raw HTTP request
        $body = (string)$this->routeRequestFactory->createRouteRequest(
            'GetBooksFromArchive',
            ['year' => 2019],
        );
        
        return new Response(body: $body);
    }
}
```

</div>

> **Note:** If your route supports multiple HTTP methods, you must specify the HTTP method to use as a third parameter in `createRouteRequest()`.  If your route supports GET requests, it will automatically also support HEAD requests.  In this case, the factory will default to creating a GET request unless you specify 'HEAD' as the method.

<h2 id="caching">Caching</h2>

The process of building your routes and compiling the trie is a relatively slow process, and isn't necessary in a production environment where route definitions aren't changing.  Aphiria provides both the ability to cache the results of your route builders and the compiled trie.

<div class="context-framework">

Aphiria will automatically cache important data when `APP_ENV` equals "production".

</div>
<div class="context-library">

<h3 id="route-caching">Route Caching</h3>

To enable caching, pass in an `IRouteCache` (`FileRouteCache` is provided) to the first parameter of `RouteRegistrantCollection`:

```php
use Aphiria\Routing\Caching\FileRouteCache;
use Aphiria\Routing\{RouteCollection, RouteRegistrantCollection};

$routes = new RouteCollection();
$routeRegistrant = new RouteRegistrantCollection(new FileRouteCache('/tmp/routeCache.txt'));

// Once you're done configuring your route registrant...

$routeRegistrant->registerRoutes($routes);
```

<h3 id="trie-caching">Trie Caching</h3>

To enable caching, pass in an `ITrieCache` (`FileTrieCache` comes with Aphiria) to your trie factory (passing in `null` will disable caching).  If you want to enable caching for a particular environment, you could do so:

```php
use Aphiria\Routing\UriTemplates\Compilers\Tries\Caching\FileTrieCache;
use Aphiria\Routing\UriTemplates\Compilers\Tries\TrieFactory;

// Let's say that your environment name is stored in an environment var named "ENV_NAME"
$trieCache = \getenv('ENV_NAME') === 'production'
    ? new FileTrieCache('/tmp/trieCache.txt')
    : null;
$trieFactory = new TrieFactory($routes, $trieCache);

// Finish setting up your route matcher...
```

<h2 id="using-aphirias-net-library">Using Aphiria's Net Library</h2>

You can use [Aphiria's net library](http-requests.md) to route the request instead of relying on PHP's superglobals:

```php
use Aphiria\Net\Http\RequestFactory;

$request = new RequestFactory()->createRequestFromSuperglobals($_SERVER);

// Set up your route matcher like before...

$result = $routeMatcher->matchRoute(
    $request->method,
    $request->ur->host,
    $request->uri->path,
);
```

</div>

<h2 id="matching-algorithm">Matching Algorithm</h2>

Rather than the typical regex approach to route matching, we decided to go with a <a href="https://en.wikipedia.org/wiki/Trie" target="_blank">trie-based</a> approach.  Each node maps to a segment in the path, and could either contain a literal or a variable value.  We try to proceed down the tree to match what's in the request URI, always giving preference to literal matches over variable ones, even if variable segments are declared first in the routing config.  This logic not only applies to the first segment, but recursively to all subsequent segments.  The benefit to this approach is that it doesn't matter what order routes are defined.  Additionally, literal segments use simple hash table lookups.  What determines performance is the length of a path and the number of variable segments.

The matching algorithm goes as follows:

1. Incoming request data is passed to `TrieRouteMatcher::matchRoute()`, which loops through each segment of the URI path and proceeds only if there is either a literal or variable match in the URI tree
   * If there's a match, then we scan all child nodes against the next segment of the URI path and repeat step 1 until we don't find a match or we've matched the entire URI path
   * `TrieRouteMatcher::matchRoute()` uses <a href="http://php.net/manual/en/language.generators.syntax.php" target="_blank">generators</a> so we only descend the URI tree as many times as we need to find a match candidate
2. If the match candidate passes constraint checks (eg HTTP method constraints), then it's our matching route, and we're done.  Otherwise, repeat step 1, which will yield the next possible match candidate.
