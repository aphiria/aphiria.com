<?php

/**
 * Aphiria
 *
 * @link      https://www.aphiria.com
 * @copyright Copyright (C) 2026 David Young
 * @license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
 */

declare(strict_types=1);

namespace App\Web\Console\Commands;

use Aphiria\Console\Commands\Attributes\Command;
use Aphiria\Console\Commands\ICommandHandler;
use Aphiria\Console\Input\Input;
use Aphiria\Console\Output\IOutput;
use Aphiria\Console\StatusCode;
use RuntimeException;

/**
 * Defines the handler for the serve command
 */
#[Command('app:serve', description: 'Runs the website and API locally')]
final class ServeCommandHandler implements ICommandHandler
{
    /**
     * @inheritdoc
     */
    public function handle(Input $input, IOutput $output)
    {
        $publicApiPath = \realpath(__DIR__ . '/../../../../public');
        $publicWebPath = \realpath(__DIR__ . '/../../../../../web/public');
        $localhostRouterPath = \realpath(__DIR__ . '/../../../../localhost-router.php');

        if (!\is_string($publicApiPath)) {
            throw new RuntimeException('Public API path does not exist');
        }

        if (!\is_string($publicWebPath)) {
            throw new RuntimeException('Public web path does not exist');
        }

        if (!\is_string($localhostRouterPath)) {
            throw new RuntimeException('Localhost router path does not exist');
        }

        $runApiCommand = \sprintf(
            '%s -S %s -t "%s" "%s"',
            PHP_BINARY,
            \str_replace(['http://', 'https://'], ['', ''], (string) \getenv('APP_API_URL')),
            $publicApiPath,
            $localhostRouterPath,
        );
        $runWebCommand = \sprintf(
            '%s -S %s -t "%s"',
            PHP_BINARY,
            \str_replace(['http://', 'https://'], ['', ''], (string) \getenv('APP_WEB_URL')),
            $publicWebPath,
        );

        $this->runCommandsInBackground([$runApiCommand, $runWebCommand], $output);

        return StatusCode::Ok;
    }

    /**
     * Runs commands in the background, which allows blocking commands to be run in parallel
     *
     * @param list<string> $commands The commands to run
     * @param IOutput $output The output to write to
     */
    private function runCommandsInBackground(array $commands, IOutput $output): void
    {
        foreach ($commands as $command) {
            $output->writeln("<info>Running command:</info> $command");

            if (\strpos(\php_uname(), 'Windows') === 0) {
                $openProcess = \popen("start /B $command", 'r');

                if ($openProcess === false) {
                    throw new RuntimeException("Failed to run command: $command");
                }

                \pclose($openProcess);
            } else {
                \exec("$command> /dev/null &");
            }
        }
    }
}
