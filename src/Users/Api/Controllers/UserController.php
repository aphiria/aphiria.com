<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Users\Api\Controllers;

use Aphiria\Api\Controllers\Controller;
use Aphiria\Net\Http\HttpException;
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Annotations\Delete;
use Aphiria\Routing\Annotations\Get;
use Aphiria\Routing\Annotations\Middleware;
use Aphiria\Routing\Annotations\Post;
use Aphiria\Routing\Annotations\RouteGroup;
use Aphiria\Routing\UriTemplates\IRouteUriFactory;
use App\Authentication\Api\Middleware\Authenticate;
use App\Users\IUserService;
use App\Users\User;
use App\Users\UserNotFoundException;

/**
 * Defines the user controller
 * @RouteGroup("/users")
 */
final class UserController extends Controller
{
    /** @var IUserService The user service */
    private IUserService $users;
    /** @var IRouteUriFactory The route URI factory */
    private IRouteUriFactory $uriFactory;

    /**
     * @param IUserService $users The user service
     * @param IRouteUriFactory $uriFactory The route URI factory
     */
    public function __construct(IUserService $users, IRouteUriFactory $uriFactory)
    {
        $this->users = $users;
        $this->uriFactory = $uriFactory;
    }

    /**
     * Adds a user
     *
     * @param User $user The user to add
     * @return IResponse The response
     * @Post("")
     * @Middleware(Authenticate::class)
     * @throws HttpException Thrown if the response couldn't be negotiated
     */
    public function addUser(User $user): IResponse
    {
        $createdUser = $this->users->addUser($user);
        $createdUserUri = $this->uriFactory->createRouteUri('GetUserById', ['id' => $user->getId()]);

        return $this->created($createdUserUri, $createdUser);
    }

    /**
     * Deletes a user with the input ID
     *
     * @param int $id The ID of the user to delete
     * @throws UserNotFoundException Thrown if no user was found with the input ID
     * @Delete(":id")
     * @Middleware(Authenticate::class)
     */
    public function deleteUser(int $id): void
    {
        $this->users->deleteUser($id);
    }

    /**
     * Gets a user by ID
     *
     * @param int $id The ID of the user to get
     * @return User The user if one was found
     * @throws UserNotFoundException Thrown if no user was found
     * @Get(":id", name="GetUserById")
     * @Middleware(Authenticate::class)
     */
    public function getUserById(int $id): User
    {
        return $this->users->getUserById($id);
    }
}
