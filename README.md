# Aphiria.com

[![Build Status](https://travis-ci.com/aphiria/aphiria.com.svg)](https://travis-ci.com/aphiria/aphiria.com)

## About

This repository contains the code for both https://www.aphiria.com and https://api.aphiria.com.

## Running Locally

To run this site locally, you must:

* Edit your hosts file to be able to run the website and API
  * For *nix users, add `127.0.0.1 api.localhost` to _/etc/hosts_
  * For Windows users, add `127.0.0.1 api.localhost` to _C:\Windows\System32\drivers\etc\hosts_
* [Install npm](https://www.npmjs.com/get-npm)
* [Install Yarn](https://yarnpkg.com/lang/en/docs/install)
* Run `yarn install` to install JavaScript dependencies
* Run `composer install` to install PHP dependencies
* Run `php aphiria docs:build` to build the documentation
* Run `php aphiria docs:index` to index the documentation for searchability
* Run `gulp build` to compile the CSS and JS assets
  * You can also set up [file watchers](https://www.jetbrains.com/help/phpstorm/settings-tools-startup-tasks.html) to automate the running of gulp commands when assets are updated by configuring your IDE to run `gulp watch-assets` at startup
* Run `php aphiria app:serve` to start the website and API

## Updating Pages

If you make any updates to the pages in _resources/views_, you can recompile the views:

* Run `php aphiria views:build` to build the views
* Run `gulp rewrite-references` to update any references to assets in the HTML
