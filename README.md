# Aphiria.com

[![Build Status](https://travis-ci.com/aphiria/aphiria.com.svg)](https://travis-ci.com/aphiria/aphiria.com)

## About

This repository contains the code for both https://www.aphiria.com and https://api.aphiria.com.

## Running Locally

To run this site locally, you must:

* [Install npm](https://www.npmjs.com/get-npm)
* Install SCSS via `npm install -g sass`
  * [Instructions for setting up file watchers in PHPStorm](https://www.jetbrains.com/help/phpstorm/transpiling-sass-less-and-scss-to-css.html#less_sass_scss_compiling_to_css)
* Run `composer install`
* Edit your hosts file to be able to run the website and API
  * For *nix users, add `127.0.0.1 api.localhost` to _/etc/hosts_
  * For Windows users, add `127.0.0.1 api.localhost` to _C:\Windows\System32\drivers\etc\hosts_
* Run `php aphiria app:serve` to start the website and API
