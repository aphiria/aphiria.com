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
use Aphiria\Net\Http\IResponse;
use Aphiria\Routing\Attributes\Delete;
use Aphiria\Routing\Attributes\Get;
use Aphiria\Routing\Attributes\Middleware;
use Aphiria\Routing\Attributes\Post;
use Aphiria\Routing\Attributes\Put;
use Aphiria\Routing\Attributes\RouteGroup;
use Aphiria\Routing\UriTemplates\IRouteUriFactory;
use App\Authentication\Api\AuthenticationContext;
use App\Authentication\Api\Middleware\Authenticate;
use App\Posts\Api\CreatePostDto;
use App\Posts\Api\UpdatePostDto;
use App\Posts\Api\ViewPostDto;
use App\Posts\Api\ViewPostDtoFactory;
use App\Posts\InvalidPagingParameterException;
use App\Posts\InvalidPostUpdateException;
use App\Posts\IPostService;
use App\Posts\PostNotFoundException;
use App\Users\UserNotFoundException;

/**
 * Defines the post controller
 */
#[RouteGroup('posts')]
final class PostController extends Controller
{
    /**
     * @param IPostService $posts The post service
     * @param ViewPostDtoFactory $viewPostDtoFactory The view post DTO factory
     * @param AuthenticationContext $authContext The current auth context
     * @param IRouteUriFactory $uriFactory The route URI factory
     */
    public function __construct(
        private IPostService $posts,
        private ViewPostDtoFactory $viewPostDtoFactory,
        private AuthenticationContext $authContext,
        private IRouteUriFactory $uriFactory
    ) {
    }

    /**
     * Creates a post
     *
     * @param CreatePostDto $createPostDto the create post DTO
     * @return IResponse The response
     * @throws UserNotFoundException Thrown if the author was not found
     * @throws HttpException Thrown if the response could not be negotiated
     */
    #[Post(''), Middleware(Authenticate::class)]
    public function createPost(CreatePostDto $createPostDto): IResponse
    {
        $createdPost = $this->posts->createPost($this->authContext->userId, $createPostDto);

        return $this->created(
            $this->uriFactory->createRouteUri('GetPostById', ['id' => $createdPost->getId()]),
            $this->viewPostDtoFactory->createViewPostDtoFromModel($createdPost)
        );
    }

    /**
     * Deletes a post
     *
     * @param int $id The post to delete
     * @throws PostNotFoundException Thrown if the post was not found
     */
    #[Delete(':id'), Middleware(Authenticate::class)]
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
     */
    #[Get('')]
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
     */
    #[Get(':id', name: 'GetPostById')]
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
     * @throws InvalidPostUpdateException Thrown if the post update was not valid
     * @throws PostNotFoundException Thrown if the post was not found
     * @throws UserNotFoundException Thrown if the author was not found
     */
    #[Put(':id'), Middleware(Authenticate::class)]
    public function updatePost(int $id, UpdatePostDto $updatePostDto): ViewPostDto
    {
        if ($id !== $updatePostDto->id) {
            throw new InvalidPostUpdateException('ID in route does not match ID in post');
        }

        return $this->viewPostDtoFactory->createViewPostDtoFromModel($this->posts->updatePost($updatePostDto));
    }
}