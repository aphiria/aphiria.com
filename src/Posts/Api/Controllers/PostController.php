<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Posts\Api\Controllers;

use Aphiria\Api\Controllers\Controller;
use Aphiria\Net\Http\HttpException;
use Aphiria\Net\Http\HttpStatusCodes;
use Aphiria\Routing\Annotations\Delete;
use Aphiria\Routing\Annotations\Get;
use Aphiria\Routing\Annotations\Middleware;
use Aphiria\Routing\Annotations\Post;
use Aphiria\Routing\Annotations\Put;
use Aphiria\Routing\Annotations\RouteGroup;
use App\Authentication\Api\AccessTokenParser;
use App\Authentication\Api\Middleware\Authenticate;
use App\Posts\Api\CreatePostDto;
use App\Posts\Api\UpdatePostDto;
use App\Posts\Api\ViewPostDto;
use App\Posts\Api\ViewPostDtoFactory;
use App\Posts\InvalidPagingParameterException;
use App\Posts\IPostService;
use App\Posts\PostNotFoundException;
use App\Users\UserNotFoundException;

/**
 * Defines the post controller
 * @RouteGroup("/posts")
 */
final class PostController extends Controller
{
    /** @var IPostService The post service */
    private IPostService $posts;
    /** @var ViewPostDtoFactory The view post DTO factory */
    private ViewPostDtoFactory $viewPostDtoFactory;
    /** @var AccessTokenParser The access token parser */
    private AccessTokenParser $accessTokenParser;

    /**
     * @param IPostService $posts The post service
     * @param ViewPostDtoFactory $viewPostDtoFactory The view post DTO factory
     * @param AccessTokenParser $accessTokenParser The access token parser
     */
    public function __construct(
        IPostService $posts,
        ViewPostDtoFactory $viewPostDtoFactory,
        AccessTokenParser $accessTokenParser
    ) {
        $this->posts = $posts;
        $this->viewPostDtoFactory = $viewPostDtoFactory;
        $this->accessTokenParser = $accessTokenParser;
    }

    /**
     * Creates a post
     *
     * @param CreatePostDto $createPostDto the create post DTO
     * @return ViewPostDto The created post
     * @throws UserNotFoundException Thrown if the author was not found
     * @throws HttpException Thrown if there was no valid access token set (shouldn't happen because of the middleware)
     * @Post("")
     * @Middleware(Authenticate::class)
     */
    public function createPost(CreatePostDto $createPostDto): ViewPostDto
    {
        if (($accessToken = $this->accessTokenParser->parseAccessToken($this->request)) === null) {
            throw new HttpException(HttpStatusCodes::HTTP_UNAUTHORIZED, 'No valid access token set');
        }

        $createdPost = $this->posts->createPost($accessToken->userId, $createPostDto);

        return $this->viewPostDtoFactory->createViewPostDtoFromModel($createdPost);
    }

    /**
     * Deletes a post
     *
     * @param int $id The post to delete
     * @Delete(":id")
     * @Middleware(Authenticate::class)
     * @throws PostNotFoundException Thrown if the post was not found
     */
    public function deletePost(int $id): void
    {
        $this->posts->deletePost($id);
    }

    /**
     * Gets all posts
     *
     * @param int $pageNum The current page number
     * @param int $pageSize The page size
     * @return ViewPostDto[] The list of posts
     * @throws InvalidPagingParameterException Thrown if the page params were invalid
     * @throws UserNotFoundException Thrown if any of the authors could not be found
     * @Get("")
     */
    public function getAllPosts(int $pageNum = 1, int $pageSize = 10): array
    {
        return $this->viewPostDtoFactory->createManyViewPostDtosFromModels($this->posts->getAllPosts($pageNum, $pageSize));
    }

    /**
     * Gets a post by ID
     *
     * @param int $id The ID of the post to look for
     * @return ViewPostDto The post
     * @throws PostNotFoundException Thrown if the post was not found
     * @throws UserNotFoundException Thrown if the author was not found
     * @Get(":id")
     */
    public function getPostById(int $id): ViewPostDto
    {
        return $this->viewPostDtoFactory->createViewPostDtoFromModel($this->posts->getPostById($id));
    }

    /**
     * Updates a post
     *
     * @param int $id The ID of the post to update
     * @param UpdatePostDto $updatePostDto the updated post DTO
     * @return ViewPostDto The updated post
     * @throws HttpException Thrown if the post was not valid
     * @throws PostNotFoundException Thrown if the post was not found
     * @throws UserNotFoundException Thrown if the author was not found
     * @Put(":id")
     * @Middleware(Authenticate::class)
     */
    public function updatePost(int $id, UpdatePostDto $updatePostDto): ViewPostDto
    {
        if ($id !== $updatePostDto->id) {
            throw new HttpException(HttpStatusCodes::HTTP_BAD_REQUEST, 'ID in route does not match ID in post');
        }

        return $this->viewPostDtoFactory->createViewPostDtoFromModel($this->posts->updatePost($updatePostDto));
    }
}
