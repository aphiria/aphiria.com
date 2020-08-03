<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Posts;

use App\Posts\Api\CreatePostDto;
use App\Posts\Api\UpdatePostDto;

/**
 * Defines the interface for post services to implement
 */
interface IPostService
{
    /**
     * Creates a post
     *
     * @param int $authorId The ID of the author user
     * @param CreatePostDto $post The DTO for creating a post
     * @return Post The created post
     */
    public function createPost(int $authorId, CreatePostDto $post): Post;

    /**
     * Deletes a post
     *
     * @param int $id The ID of the post to delete
     * @throws PostNotFoundException Thrown if the post was not found
     */
    public function deletePost(int $id): void;

    /**
     * Gets all the posts
     *
     * @param int $pageNum The page number to use
     * @param int $pageSize The page size to use
     * @return Post[] The list of posts
     * @throws InvalidPagingParameterException Thrown if the paging parameters were invalid
     */
    public function getAllPosts(int $pageNum = 1, int $pageSize = 10): array;

    /**
     * Gets a post by ID
     *
     * @param int $id The ID of the post to look for
     * @return Post The post
     * @throws PostNotFoundException Thrown if the post was not found
     */
    public function getPostById(int $id): Post;

    /**
     * Updates a post
     *
     * @param UpdatePostDto $post The DTO for updating a post
     * @return Post The updated post
     * @throws PostNotFoundException Thrown if the post was not found
     */
    public function updatePost(UpdatePostDto $post): Post;
}
