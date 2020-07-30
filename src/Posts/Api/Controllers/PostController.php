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
use Aphiria\Routing\Annotations\Post;
use Aphiria\Routing\Annotations\Put;
use Aphiria\Routing\Annotations\RouteGroup;
use App\Posts\Api\CreatePostDto;
use App\Posts\Api\UpdatePostDto;
use App\Posts\Api\ViewPostDto;
use App\Posts\Api\ViewPostDtoFactory;
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

    /**
     * @param IPostService $posts The post service
     * @param ViewPostDtoFactory $viewPostDtoFactory The view post DTO factory
     */
    public function __construct(IPostService $posts, ViewPostDtoFactory $viewPostDtoFactory)
    {
        $this->posts = $posts;
        $this->viewPostDtoFactory = $viewPostDtoFactory;
    }

    /**
     * Creates a post
     *
     * @param CreatePostDto $createPostDto the create post DTO
     * @return ViewPostDto The created post
     * @throws UserNotFoundException Thrown if the author was not found
     * @Post("")
     */
    public function createPost(CreatePostDto $createPostDto): ViewPostDto
    {
        // TODO: Add middleware
        // TODO: Add way of extracting current user's ID
        $createdPost = $this->posts->createPost(0, $createPostDto);

        return $this->viewPostDtoFactory->createViewPostDtoFromModel($createdPost);
    }

    /**
     * Deletes a post
     *
     * @param int $id The post to delete
     * @Delete(":id")
     * @throws PostNotFoundException Thrown if the post was not found
     */
    public function deletePost(int $id): void
    {
        // TODO: Add middleware
        $this->posts->deletePost($id);
    }

    /**
     * Gets all posts
     *
     * @param bool $includeDeletedPosts Whether or not to include deleted posts
     * @param int $pageNum The current page number
     * @param int $pageSize The page size
     * @return ViewPostDto[] The list of posts
     * @throws HttpException Thrown if the page params were invalid
     * @throws UserNotFoundException Thrown if any of the authors could not be found
     * @Get("")
     */
    public function getAllPosts(bool $includeDeletedPosts = false, int $pageNum = 1, int $pageSize = 10): array
    {
        if ($pageNum < 1) {
            throw new HttpException(HttpStatusCodes::HTTP_BAD_REQUEST, 'Page number cannot be less than 1');
        }

        if ($pageSize < 1 || $pageSize > 10) {
            throw new HttpException(HttpStatusCodes::HTTP_BAD_REQUEST, 'Page size must be between 1 and 10');
        }

        // TODO: Only let the user get deleted posts if they're an admin
        // TODO: Add support for paging, and thread that through to the post service
        return $this->viewPostDtoFactory->createManyViewPostDtosFromModels($this->posts->getAllPosts($includeDeletedPosts));
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
        // TODO: Do not return the post if it was deleted
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
     */
    public function updatePost(int $id, UpdatePostDto $updatePostDto): ViewPostDto
    {
        // TODO: Add middleware
        if ($id !== $updatePostDto->id) {
            throw new HttpException(HttpStatusCodes::HTTP_BAD_REQUEST, 'ID in route does not match ID in post');
        }

        return $this->viewPostDtoFactory->createViewPostDtoFromModel($this->posts->updatePost($updatePostDto));
    }
}
