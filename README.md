# grunt-version-build

> Version built code next to your project's source.

## Getting started

This plugin requires [Grunt](http://gruntjs.com/) `~0.4.0` and [Git](http://git-scm.com/).

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide which explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process you may install this plugin with the command:

```shell
npm install grunt-version-build --save-dev
```

After the plugin has been installed, load it in your Gruntfile with:

```js
grunt.loadNpmTasks('grunt-version-build');
```

### Setting up your project

Grunt-version-build requires a [Yeoman](http://yeoman.io) style directory structure where a build process outputs compiled and minified code to a subdirectory inside the main project. 

```
project/
  .gitignore   <- source code
  Gruntfile.js <- source code
  app/         <- source code
  dist/        <- build process outputs code in this unversioned directory
```

Before you start:

1. Make sure the build directory is added to the main project's .gitignore.
1. Make sure the build process does not delete the .git directory inside the build directory.

## version_build task

_Run this task with the `grunt version_build` command._

This task helps you version and deploy a project's built code alongside its source code. You can use it to keep source code and built code on different branches of the same repository, and to deploy built code to git based services like Github Pages, Heroku, and Scalr.

### Options

#### dir

Type: `String`
Default: *No default, required*

The directory that your code is built to.

#### branch

Type: `String`
Default: *No default, required*

The branch to commit to.

#### remote

Type: `String`
Default: *No default, required*

The remote to push your branch to. Common choices include a remote built code repository (Heroku or Scalr), your source code repository's remote (Github), or the local source code repository itself (`../`).

#### commit

Type: `Boolean`
Default: `false`

Commit built code to the specified `branch`.

<!-- #### tag -->

#### push

Type: `Boolean`
Default: `false`

Push the `branch` to the specified `remote`.

<!-- #### force

Type: `Boolean`
Default: `false`

Force push to your remote repo. Not recommended but here if you need it. -->

#### commitMsg

Type: `String`
Default: `Built from %sourceName%, commit %sourceCommit% on branch %sourceBranch%`

The commit message to use when `commit` is true. It must be a safe commit message for the command line.

There are three tokens available:

- `%sourceName%`: The source code repository's name from package.json 
- `%sourceBranch%`: The source code repository's current branch
- `%sourceCommit%`: The source code repository's most recent commit

### Usage



#### Example config 

```js
// Project configuration.
grunt.initConfig({
  version_build: {
    options: {
      dir: 'dist',
      remote: 'git@github.com:robwierzbowski/grunt-portal-branch.git',
      message: 'Built from %sourceName%, commit %sourceCommit% on branch %sourceBranch%'
    },
    gh_pages: {
      options: {
        branch: 'gh-pages',
        commit: true,
        push: true
      }
    }
  },
  heroku: {
    options: {
      remote: 'git@heroku.com:my-heroku-project-1988.git',
      branch: 'master',
      commit: true,
      push: true
    }
  }
});
```

#### Example usage

<!-- ## Todo:
 - replace as many porcelain commands as possible with plumbing.
 -->

<!-- ## Similar projects with limitations

https://npmjs.org/package/grunt-github-pages
https://npmjs.org/package/grunt-git-dist
https://npmjs.org/package/grunt-git-selective-deploy
 -->
