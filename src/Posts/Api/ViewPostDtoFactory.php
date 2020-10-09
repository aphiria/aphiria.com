<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2020 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Posts\Api;

use App\Posts\Post;
use App\Users\IUserService;
use App\Users\UserNotFoundException;

/**
 * Defines the factory for view post DTOs
 */
final class ViewPostDtoFactory
{
    /**
     * @param IUserService $users The user service to get authors from
     */
    public function __construct(private IUserService $users)
    {
    }

    /**
     * Creates many view post DTOs from models
     *
     * @param Post[] $posts The post models to create DTOs from
     * @return ViewPostDto[] The view post DTOs
     * @throws UserNotFoundException Thrown if an author was not found
     */
    public function createManyViewPostDtosFromModels(array $posts): array
    {
        $authorIds = $authorsById = $viewPostDtos = [];

        foreach ($posts as $post) {
            $authorIds[] = $post->getAuthorId();
        }

        foreach ($this->users->getManyUsersById($authorIds) as $author) {
            $authorsById[$author->getId()] = $author;
        }

        foreach ($posts as $post) {
            $viewPostDtos[] = new ViewPostDto($post, $authorsById[$post->getAuthorId()]);
        }

        return $viewPostDtos;
    }

    /**
     * Creates a view post DTO from a model
     *
     * @param Post $post The post model to create a DTO from
     * @return ViewPostDto The view post DTO
     * @throws UserNotFoundException Thrown if the author was not found
     */
    public function createViewPostDtoFromModel(Post $post): ViewPostDto
    {
        return $this->createManyViewPostDtosFromModels([$post])[0];
    }
}
