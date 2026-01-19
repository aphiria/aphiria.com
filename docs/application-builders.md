<h1 id="doc-title">Application Builders</h1>

<h2 id="basics">Basics</h2>

Application builders provide an easy way to configure your application.  They are passed into [modules](#modules) where you can decorate them with the [components](#components) a part of your business domain needs (eg routes, binders, global middleware, console commands, validators, etc).  For example, if you are running a site where users can buy books, you might have a user module, a book module, and a shopping cart module.  Each of these modules will have separate binders, routes, console commands, etc.  So, why not bundle all the configuration logic by module?

Let's look at an example of a module:

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Console\Commands\{Command, CommandRegistry};
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\RouteCollectionBuilder;
use App\{GenerateUserReportCommandHandler, UserController, UserServiceBinder};

final class UserModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this
            ->withBinders($appBuilder, new UserServiceBinder())
            ->withRoutes($appBuilder, function (RouteCollectionBuilder $routes) {
                $routes
                    ->get('/users/:id')
                    ->mapsToMethod(UserController::class, 'getUserById');
            })
            ->withCommands($appBuilder, function (CommandRegistry $commands) {
                $commands->registerCommand(
                    new Command('report:generate'),
                    GenerateUserReportCommandHandler::class,
                );
            });
    }
}
```

Here's the best part of how Aphiria was built - there's nothing special about Aphiria-provided components.  You can [write your own components](#adding-custom-components) to be just as powerful and easy to use as Aphiria's.

Another great thing about Aphiria's application builders is that they allow you to abstract away the runtime of your application (eg PHP-FPM or Swoole) without having to touch your domain logic.  We'll get into more details on how to do this [below](#custom-applications).

<h3 id="modules">Modules</h3>

Modules are a great place to configure each domain of your application.  To create one, either extend `AphiriaModule` or use the `AphiriaComponents` trait to register a module:

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use App\{MyModule1, MyModule2};

final class GlobalModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withModules($appBuilder, new MyModule1());

        // Or register many modules

        $this->withModules($appBuilder, [new MyModule1(), new MyModule2()]);
    }
}
```

<h2 id="components">Components</h2>

A component is a piece of your application that is shared across business domains.  Below, we'll go over the components that are bundled with Aphiria and some decoration methods to help configure them.

<h3 id="component-binders">Binders</h3>

You can configure your module to require [binders](dependency-injection.md#binders).

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use App\UserServiceBinder;

final class UserModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        // Add a binder
        $this->withBinders($appBuilder, new UserServiceBinder());

        // Or use an array of binders
        $this->withBinders($appBuilder, [new UserServiceBinder()]);
    }
}
```

<h3 id="component-routes">Routes</h3>

You can manually register [routes](routing.md) for your module, and you can enable route attributes.

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\RouteCollectionBuilder;
use App\UserController;

final class UserModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this
            ->withRoutes($appBuilder, function (RouteCollectionBuilder $routes) {
                $routes
                    ->get('/users/:id')
                    ->mapsToMethod(UserController::class, 'getUserById');
            })
            ->withRouteAttributes($appBuilder);
    }
}
```

You can also register [custom route variable constraints](routing.md#making-your-own-custom-constraints):

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Routing\UriTemplates\Constraints\IRouteVariableConstraint;
use App\MinLengthConstraint;

final class UserModule extends AphiriaModule
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

<h3 id="component-middleware">Middleware</h3>

Some modules might need to add global [middleware](middleware.md) to your application.

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Middleware\MiddlewareBinding;
use App\Cors;

final class UserModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        // Add global middleware (executed before each route in your app)
        $this->withGlobalMiddleware($appBuilder, new MiddlewareBinding(Cors::class));

        // Or use an array of bindings
        $this->withGlobalMiddleware($appBuilder, [new MiddlewareBinding(Cors::class)]);

        // Or with a priority (lower number == higher priority)
        $this->withGlobalMiddleware($appBuilder, new MiddlewareBinding(Cors::class), priority: 1);
    }
}
```

<h3 id="component-console-commands">Console Commands</h3>

You can manually register [console commands](console.md#creating-commands), and enable command attributes from your modules.

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Console\Commands\{Command, CommandRegistry};
use Aphiria\Console\Output\Compilers\Elements\{Color, Element, Style};
use Aphiria\Framework\Application\AphiriaModule;
use App\GenerateUserReportCommandHandler;

final class UserModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this
            ->withCommands($appBuilder, function (CommandRegistry $commands) {
                $commands->registerCommand(
                    new Command('report:generate'),
                    GenerateUserReportCommandHandler::class,
                );
            })
            ->withCommandAttributes($appBuilder)
            // Register a custom element to style text, eg <foo>bar</foo>
            ->withConsoleElement($appBuilder, new Element('foo', new Style(Color::Magenta)))
            ->withFrameworkCommands($appBuilder)
            // Or, if you wish to exclude certain built-in commands:
            ->withFrameworkCommands($appBuilder, commandNamesToExclude: ['app:serve']);
    }
}
```

<h3 id="component-authenticators">Authenticators</h3>

Aphiria provides methods for configuring your [authenticator](authentication.md).

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Authentication\AuthenticationScheme;
use Aphiria\Authentication\Schemes\BasicAuthenticationHandler;
use Aphiria\Authentication\Schemes\BasicAuthenticationOptions;
use Aphiria\Authentication\Schemes\CookieAuthenticationHandler;
use Aphiria\Authentication\Schemes\CookieAuthenticationOptions;
use Aphiria\Framework\Application\AphiriaModule;

final class GlobalModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this
            ->withAuthenticationScheme($appBuilder, new AuthenticationScheme(
                'basic',
                BasicAuthenticationHandler::class,
                new BasicAuthenticationOptions(realm: 'example.com', claimsIssuer: 'https://example.com'),
            ))
            ->withAuthenticationScheme($appBuilder, new AuthenticationScheme(
                'cookie',
                CookieAuthenticationHandler::class,
                new CookieAuthenticationOptions(cookieName: 'authToken', claimsIssuer: 'https://example.com'),
            ), isDefault: true);
    }
}
```

<h3 id="component-authorities">Authorities</h3>

Customizing your [authority](authorization.md) is also simple.

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Authorization\AuthorizationPolicy;
use Aphiria\Authorization\Requirements\{RolesRequirement, RolesRequirementHandler};
use Aphiria\Framework\Application\AphiriaModule;

final class GlobalModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this
            ->withAuthorizationPolicy($appBuilder, new AuthorizationPolicy(
                'requires-admin',
                new RolesRequirement('admin'),
                'cookie',
            ))
            ->withAuthorizationRequirementHandler(
                $appBuilder,
                RolesRequirement::class,
                new RolesRequirementHandler(),
            );
    }
}
```

<h3 id="component-validator">Validator</h3>

You can also manually configure [constraints](validation.md#constraints) for your models and enable [validator attributes](validation.md#creating-a-validator).

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Validation\Constraints\EmailConstraint;
use Aphiria\Validation\ObjectConstraintsRegistryBuilder;
use App\User;

final class UserModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this
            ->withObjectConstraints($appBuilder, function (ObjectConstraintsRegistryBuilder $objectConstraintsBuilder) {
                $objectConstraintsBuilder
                    ->class(User::class)
                    ->hasPropertyConstraints('email', new EmailConstraint());
            })
            ->withValidatorAttributes($appBuilder);
    }
}
```

<h3 id="component-exception-handler">Exception Handler</h3>

Exceptions may be mapped to [custom problem details](exception-handling.md#custom-problem-details-mappings) and [PSR-3 log levels](exception-handling.md#exception-log-levels).

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Console\Output\IOutput;
use Aphiria\Console\StatusCode;
use Aphiria\Framework\Application\AphiriaModule;
use Aphiria\Net\Http\HttpStatusCode;
use App\{OverdrawnException, UserCorruptedException, UserNotFoundException};
use Psr\Log\LogLevel;

final class UserModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this
            ->withProblemDetails(
                $appBuilder,
                UserNotFoundException::class,
                status: HttpStatusCode::NotFound,
            )
            ->withProblemDetails(
                $appBuilder,
                OverdrawnException::class,
                type: 'https://example.com/errors/overdrawn',
                title: 'This account is overdrawn',
                detail: fn($ex): string => "Account {$ex->accountId} is overdrawn by {$ex->overdrawnAmount}",
                status: HttpStatusCode::BadRequest,
                instance: fn($ex): string => "https://example.com/accounts/{$ex->accountId}/errors/{$ex->id}",
                extensions: fn($ex): array => ['overdrawnAmount' => $ex->overdrawnAmount],
            )
            ->withConsoleExceptionOutputWriter(
                $appBuilder,
                UserNotFoundException::class,
                function (UserNotFoundException $ex, IOutput $output) {
                    $output->writeln('Missing user');
    
                    return StatusCode::Fatal;
                },
            )
            ->withLogLevelFactory(
                $appBuilder,
                UserCorruptedException::class,
                fn(UserCorruptedException $ex): LogLevel => LogLevel::CRITICAL,
            );
    }
}
```

<h2 id="adding-custom-components">Adding Custom Components</h2>

You can add your own custom components to application builders.  They typically have `with*()` methods to let you configure the component, and a `build()` method (called internally) that actually finishes building the component.

> **Note:** Binders aren't dispatched until just before `build()` is called on the components.  This means you can't inject dependencies from binders into your components - they won't have been bound yet.  So, if you need any dependencies inside the `build()` method, use the [DI container](dependency-injection.md) to resolve them.

Let's say you prefer to use Symfony's router, and want to be able to add routes from your modules.  This requires a few simple steps:

1. Create a binder for the Symfony services
2. Create a component to let you add routes from modules
3. Register the binder and component to your app
4. Start using the component

First, let's create a binder for the router so that the DI container can resolve it:

```php
namespace App;

use Aphiria\DependencyInjection\Binders\Binder;
use Aphiria\DependencyInjection\IContainer;
use Symfony\Component\Routing\Matcher\{UrlMatcher, UrlMatcherInterface};
use Symfony\Component\Routing\{RequestContext, RouteCollection};

final class SymfonyRouterBinder extends Binder
{
    public function bind(IContainer $container): void
    {
        $routes = new RouteCollection();
        $requestContext = new RequestContext(/* ... */);
        $matcher = new UrlMatcher($routes, $requestContext);

        $container->bindInstance(RouteCollection::class, $routes);
        $container->bindInstance(UrlMatcherInterface::class, $matcher);
    }
}
```

Next, let's define a component to let us add routes.

```php
namespace App;

use Aphiria\Api\Application;
use Aphiria\Application\IComponent;
use Aphiria\DependencyInjection\IContainer;
use Aphiria\Net\Http\IRequestHandler;
use Symfony\Component\Routing\{Route, RouteCollection};

final class SymfonyRouterComponent implements IComponent
{
    private array $routes = [];

    public function __construct(private IContainer $container) {}

    public function build(): void
    {
        $routes = $this->container->resolve(RouteCollection::class);

        foreach ($this->routes as $name => $route) {
            $routes->add($name, $route);
        }

        // Tell our app to use a request handler that supports Symfony
        // Note: You'd have to write this request handler
        $this->container->for(Application::class, function (IContainer $container) {
            $container->bindInstance(IRequestHandler::class, new SymfonyRouterRequestHandler());
        });
    }

    // Define a method for adding routes from modules
    public function withRoute(string $name, Route $route): self
    {
        $this->routes[$name] = $route;

        return $this;
    }
}
```

Let's register the binder and component to our app:

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\DependencyInjection\IContainer;
use Aphiria\Framework\Application\AphiriaModule;
use App\{SymfonyRouterBinder, SymfonyRouterComponent};

final class GlobalModule extends AphiriaModule
{
    public function __construct(private IContainer $container) {}

    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this
            ->withComponent($appBuilder, new SymfonyRouterComponent($this->container))
            ->withBinders($appBuilder, new SymfonyRouterBinder());
    }
}
```

All that's left is to start using the component from a module:

```php
use Aphiria\Application\{IApplicationBuilder, IModule};
use App\SymfonyRouterComponent;
use Symfony\Component\Routing\Route;

final class MyModule implements IModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $appBuilder
            ->getComponent(SymfonyRouterComponent::class)
            ->withRoute('GetUserById', new Route('users/{id}'));
    }
}
```

If you'd like a more fluent syntax like the Aphiria components, just use a trait:

```php
namespace App;

use Aphiria\Application\IApplicationBuilder;
use Aphiria\DependencyInjection\Container;
use App\SymfonyRouterComponent;
use Symfony\Component\Routing\Route;

trait SymfonyComponents
{
    protected function withSymfonyRoute(IApplicationBuilder $appBuilder, string $name, Route $route): static
    {
        // Make sure the component is registered
        if (!$appBuilder->hasComponent(SymfonyRouterComponent::class)) {
            $appBuilder->withComponent(new SymfonyRouterComponent(Container::$globalInstance));
        }
        
        $appBuilder
            ->getComponent(SymfonyRouterComponent::class)
            ->withRoute($name, $route);
            
        return $this;
    }
}
```

Then, use that trait inside your module:

```php
use Aphiria\Application\{IApplicationBuilder, IModule};
use App\SymfonyComponents;
use Symfony\Component\Routing\Route;

final class MyModule implements IModule
{
    use SymfonyComponents;

    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this->withSymfonyRoute($appBuilder, 'GetUserById', new Route('users/{id}'));
    }
}
```

Your global configuration is created for you in the constructor of `GlobalModule` in the skeleton app.

<h2 id="custom-applications">Custom Applications</h2>

This is more of an advanced topic.  Applications are specific to their runtimes, eg PHP-FPM or Swoole.  They typically take the input (eg an HTTP request or console input) and pass it to  a "gateway" object (eg `ApiGateway` or `ConsoleGateway`), which is the highest layer of application code that is agnostic to the PHP runtime.  So, if you switch from PHP-FPM to Swoole, you'd have to change the `IApplication` instance you're running, but the gateway would not have to change because it does not care what the PHP runtime is.

By default, API and console applications are built with `SynchronousApiApplicationBuilder` and `ConsoleApplicationBuilder`, respectively.  Which application builder you're using depends on the `APP_BUILDER_API` and `APP_BUILDER_CONSOLE` environment variables set in your _.env_ file.  Application builder classes return a simple `IApplication` interface that looks like this:

```php
interface IApplication
{
    public function run(): int;
}
```

The simplest way to change the `IApplication` you're running is to create your own `IApplicationBuilder` and update the appropriate environment variable to use it.  For example, let's say we wanted to switch our Aphiria app to use Swoole instead:

```php
namespace App;

use Aphiria\Application\IApplication;
use Aphiria\Net\Http\{IRequest, IRequestHandler, IResponse};
use Swoole\Http\{Request, Response, Server};

final class SwooleApplication implements IApplication
{
    public function __construct(private Server $server, private IRequestHandler $apiGateway) {}

    public function run(): int
    {
        $server->on('request', function (Request $swooleRequest, Response $swooleResponse) use ($this) {
            $aphiriaRequest = $this->createAphiriaRequest($swooleRequest);
            $aphiriaResponse = $this->apiGateway->handle($aphiriaRequest);
            $this->copyToSwooleResponse($aphiriaResponse, $swooleResponse);
        });
        $server->start();
        
        return 0;
    }
    
    private function copyToSwooleResponse(IResponse $aphiriaResponse, Response $swooleResponse): void
    {
        // ...
    }
    
    private function createAphiriaRequest(Request $request): IRequest
    {
        // ...
    }
}
```

Next, create an `IApplicationBuilder` that builds an instance of our `SwooleApplication`:

```php
namespace App;

use Aphiria\Application\ApplicationBuilder;
use Aphiria\DependencyInjection\IServiceResolver;
use Aphiria\Net\Http\IRequestHandler;
use App\SwooleApplication;
use Swoole\Http\Server;

final class SwooleApplicationBuilder extends ApplicationBuilder
{
    public function __construct(private IServiceResolver $serviceResolver) {}

    public function build(): SwooleApplication
    {
        $this->configureModules();
        $this->buildComponents();
        $server = new Server(/* ... */);
        
        return new SwooleApplication($server, $this->serviceResolver->resolve(IRequestHandler::class));
    }
}
```

Finally, update `APP_BUILDER_API` in your _.env_ file, and your application will now support running asynchronously via Swoole.

```
APP_BUILDER_API=\App\SwooleApplicationBuilder
```
