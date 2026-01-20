<h1 id="doc-title">Authorization</h1>

<h2 id="introduction">Introduction</h2>

Authorization is the act of checking whether or not an action is permitted, and typically goes hand-in-hand with [authentication](authentication.md).  Aphiria provides policy-based authorization.  A policy is a definition of requirements that must be passed for authorization to succeed.  One such example of a requirement is whether or not a user has a particular role.

Let's look at an example of role authorization using attributes:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Authorization\Attributes\AuthorizeRoles;
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Attributes\Post;
use App\Article;

final class ArticleController extends Controller
{
    #[Post('/article')]
    #[AuthorizeRoles(['admin', 'contributor', 'editor'])]
    public function createArticle(Article $article): IResponse
    {
        // ...
    }
}
```

Here's the identical functionality, just using `IAuthority` instead of an attribute:

```php
use Aphiria\Authorization\{AuthorizationPolicy, IAuthority};
use Aphiria\Authorization\RequirementHandlers\RolesRequirement;
use Aphiria\Net\Http\IResponse;
use App\Article;

final class ArticleController extends Controller
{
    public function __construct(private IAuthority $authority) {}

    #[Post('/article')]
    public function createArticle(Article $article): IResponse
    {
        $policy = new AuthorizationPolicy(
            'create-article',
            new RolesRequirement(['admin', 'contributor', 'editor']),
        );
    
        if (!$this->authority->authorize($this->user, $policy)->passed) {
            return $this->forbidden();
        }
        
        // ...
    }
}
```

> **Note:** `IAuthority::authorize()` accepts both a policy name and an `AuthorizationPolicy` instance.

Authorization isn't just limited to checking roles.  In the next section, we'll discuss how policies can be used to authorize against many different types of data.

<h2 id="policies">Policies</h2>

A policy consists of a name, one or more requirements, and the [authentication scheme](authentication.md#authentication-schemes) to use.  A policy can check whether or not a principal's [claims](authentication.md#claims) pass the requirements.

Let's say our application requires users to be at least 13 years old to use it.  In this case, we'll create a policy that checks the `ClaimType::DateOfBirth` claim.  First, let's define our POPO requirement class:

```php
namespace App;

final class MinimumAgeRequirement
{
    public function __construct(public readonly int $minimumAge) {}
}
```

Next, let's create a handler that checks this requirement:

```php
namespace App;

use Aphiria\Authorization\{AuthorizationContext, IAuthorizationRequirementHandler};
use Aphiria\Security\{ClaimType, IPrincipal};

final class MinimumAgeRequirementHandler implements IAuthorizationRequirementHandler
{
    public function function handle(
        IPrincipal $user,
        object $requirement,
        AuthorizationContext $authorizationContext,
    ): void {
        if (!$requirement instanceof MinimumAgeRequirement) {
            throw new \InvalidArgumentException('Requirement must be of type ' . MinimumAgeRequirement::class);
        }
        
        $dateOfBirthClaims = $user->filterClaims(ClaimType::DateOfBirth);
        
        if (\count($dateOfBirthClaims) !== 1) {
            $authorizationContext->fail();
            
            return;
        }
        
        $age = $dateOfBirthClaims[0]->value->diff(new \DateTime('now'))->y;
        
        if ($age < $requirement->minimumAge) {
            $authorizationContext->fail();
            
            return;
        }
        
        // We have to explicitly mark this requirement as having passed
        $authorizationContext->requirementPassed($requirement);
    }
}
```

Finally, let's register this requirement handler and use it in a policy.

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Authorization\AuthorizationPolicy;
use Aphiria\Framework\Application\AphiriaModule;
use App\{MinimumAgeRequirement, MinimumAgeRequirementHandler};

final class GlobalModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this
            ->withAuthorizationRequirementHandler(
                $appBuilder,
                MinimumAgeRequirement::class,
                new MinimumAgeRequirementHandler(),
            )
            ->withAuthorizationPolicy(
                $appBuilder,
                new AuthorizationPolicy('age-check', new MinimumAgeRequirement(13)),
            );
    }
}
```

</div>
<div class="context-library">

```php
use Aphiria\Authorization\{AuthorityBuilder, AuthorizationPolicy};
use App\{MinimumAgeRequirement, MinimumAgeRequirementHandler};

$authority = new AuthorityBuilder()
    ->withRequirementHandler(MinimumAgeRequirement::class, new MinimumAgeRequirementHandler())
    // We can access this policy by its name ("age-check")
    ->withPolicy(new AuthorizationPolicy('age-check', new MinimumAgeRequirement(13)))
    ->build();
```

> **Note:** By default, authorization will continue even if there was a failure.  If you want to change it to stop the moment there's a failure, call `AuthorityBuilder::withContinueOnFailure(false)`.

</div>

Now, we can use this policy through an attribute:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Authorization\Attributes\AuthorizePolicy;
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Attributes\Post;
use App\Rental;

final class RentalController extends Controller
{
    #[Post('/rentals')]
    #[AuthorizePolicy('age-check')]
    public function createRental(Rental $rental): IResponse
    {
        // ...
    }
}
```

Similarly, we could authorize this by composing `IAuthority`:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Authentication\Attributes\Authenticate;
use Aphiria\Authorization\IAuthority;
use Aphiria\Net\Http\IResponse;
use App\Rental;

#[Authenticate]
final class RentalController extends Controller
{
    public function __construct(private IAuthority $authority) {}

    #[Post('/rentals')]
    public function createRental(Rental $rental): IResponse
    {
        if (!$this->authority->authorize($this->user, 'age-check')->passed) {
            return $this->forbidden();
        }
        
        // ...
    }
}
```

<h2 id="resource-authorization">Resource Authorization</h2>

Resource authorization is the process of checking if a user has the authority to take an action on a particular resource.  For example, if we have built a comment section, and want users to be able to delete their own comments and admins to be able to delete anyone's, we can use resource authorization to do so.

First, let's start by defining a requirement for our policy:

```php
namespace App;

final class AuthorizedDeleterRequirement
{
    public function __construct(public readonly array $authorizedRoles) {}
}
```

Next, let's define a handler for this requirement:

```php
namespace App;

use Aphiria\Authorization\{AuthorizationContext, IAuthorizationRequirementHandler};
use Aphiria\Security\{ClaimType, IPrincipal};
use App\Comment;

final class AuthorizedDeleterRequirementHandler implements IAuthorizationRequirementHandler
{
    public function function handle(
        IPrincipal $user,
        object $requirement,
        AuthorizationContext $authorizationContext,
    ): void {
        if (!$requirement instanceof AuthorizedDeleterRequirement) {
            throw new \InvalidArgumentException('Requirement must be of type ' . AuthorizedDeleterRequirement::class);
        }
    
        $comment = $authorizationContext->resource;
    
        // We'll assume Comment is a class in our application
        if (!$comment instanceof Comment) {
            throw new \InvalidArgumentException('Resource must be of type ' . Comment::class);
        }
        
        if ($comment->authorId === $user->primaryId?->nameIdentifier) {
            // The deleter of the comment is the comment's author
            $authorizationContext->requirementPassed($requirement);
            
            return;
        }
        
        foreach ($requirement->authorizedRoles as $authorizedRole) {
            if ($user->hasClaim(ClaimType::Role, $authorizedRole)) {
                // This user had one of the authorized roles
                $authorizationContext->requirementPassed($requirement);
                
                return;
            }
        }
        
        // This requirement failed
        $authorizationContext->fail();
    }
}
```

Now, let's register this policy.

<div class="context-framework">

```php
use Aphiria\Application\IApplicationBuilder;
use Aphiria\Authorization\AuthorizationPolicy;
use Aphiria\Framework\Application\AphiriaModule;
use App\{AuthorizedDeleterRequirement, AuthorizedDeleterRequirementHandler};

final class GlobalModule extends AphiriaModule
{
    public function configure(IApplicationBuilder $appBuilder): void
    {
        $this
            ->withAuthorizationRequirementHandler(
                $appBuilder,
                AuthorizedDeleterRequirement::class,
                new AuthorizedDeleterRequirementHandler(),
            )
            ->withAuthorizationPolicy(
                $appBuilder,
                new AuthorizationPolicy(
                    'authorized-deleter',
                    new AuthorizedDeleterRequirement(['admin'])
                ),
            );
    }
}
```

</div>
<div class="context-library">

```php
use Aphiria\Authorization\{AuthorityBuilder, AuthorizationPolicy};
use App\{AuthorizedDeleterRequirement, AuthorizedDeleterRequirementHandler};

$authority = new AuthorityBuilder()
    ->withRequirementHandler(AuthorizedDeleterRequirement::class, new AuthorizedDeleterRequirementHandler())
    ->withPolicy(new AuthorizationPolicy('authorized-deleter', new AuthorizedDeleterRequirement(['admin'])))
    ->build();
```

</div>

Finally, let's use `IAuthority` to do resource authorization in our controller:

```php
use Aphiria\Api\Controllers\Controller;
use Aphiria\Authentication\Attributes\Authenticate;
use Aphiria\Authorization\IAuthority;
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Attributes\Delete;
use App\ICommentRepository;

#[Authenticate]
final class CommentController extends Controller
{
    public function __construct(
        private ICommentRepository $comments,
        private IAuthority $authority,
    ) {}

    #[Delete('/comments/:id')]
    public function deleteComment(int $id): IResponse
    {
        if (($comment = $this->comments->getById($id)) === null) {
            return $this->notFound();
        }
        
        if (!$this->authority->authorize($this->user, 'authorized-deleter', $comment)->passed) {
            return $this->forbidden();
        }
    
        // ...
    }
}
```

<h2 id="authorization-results">Authorization Results</h2>

Authorization returns an instance of `AuthorizationResult`.  You can grab info about whether or not it was successful:

```php
$authorizationResult = $authority->authorize($user, 'some-policy');

if (!$authorizationResult->passed) {
    print_r($authorizationResult->failedRequirements);
}
```

<h2 id="customizing-failed-authorization-responses">Customizing Failed Authorization Responses</h2>

By default, authorization done in the `Authorize` middleware invokes [`IAuthenticator::challenge()`](authentication.md) when a user is not authenticated, and `IAuthenticator::forbid()` when they are not authorized.  If you would like to customize these responses, simply override `Authorize::handleUnauthenticatedUser()` and `Authorize::handleFailedAuthorizationResult()`.  Let's look at an example:

```php
use Aphiria\Authorization\{AuthorizationPolicy, AuthorizationResult};
use Aphiria\Authorization\Middleware\Authorize as BaseAuthorize;
use Aphiria\Net\Http\{HttpStatusCode, IRequest, IResponse, Response, StringBody};

final class Authorize extends BaseAuthorize
{
    protected function handleFailedAuthorizationResult(
        IRequest $request,
        AuthorizationPolicy $policy,
        AuthorizationResult $authorizationResult,
    ): IResponse {
        // Let's return a response with body "You are not authorized"
        $response = new Response(HttpStatusCode::Forbidden);
        $response->body = new StringBody('You are not authorized');
        
        return $response;
    }

    protected function handleUnauthenticatedUser(IRequest $request, AuthorizationPolicy $policy): IResponse
    {
        // Let's return a response with body "You are not logged in"
        $response = new Response(HttpStatusCode::Unauthorized);
        $response->body = new StringBody('You are not logged in');
        
        return $response;
    }
}
```

Then, use your custom `Authorize` middleware instead of the built-in one.
