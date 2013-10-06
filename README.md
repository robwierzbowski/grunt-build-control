# grunt-version-build

<!-- > Version built code next to your project's source. -->
> Version control your built code.

## Getting started

This plugin requires [Grunt](http://gruntjs.com/) `~0.4.0` and [Git](http://git-scm.com/).

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide which explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with Grunt you can install the plugin with the command:

```shell
npm install grunt-version-build --save-dev
```

After the plugin has been installed, load it in your Gruntfile with:

```js
grunt.loadNpmTasks('grunt-version-build');
```

## Setting up your project

To use this plugin your project must have a compile or build process that outputs code to a subdirectory of the main project:

```
project/
  .gitignore   <- source code
  Gruntfile.js <- source code
  app/         <- source code
  dist/        <- build process outputs here
```

Before you start:

1. Make sure the build directory is added to the main project's .gitignore.
1. Make sure the build process does not delete the .git directory inside the build directory.

If you're using a [Yeoman](http://yeoman.io) generator these are probably taken care of already.

## version_build task

_Run this task with the `grunt version_build` command._

This task automates version control tasks for a project's built code. You can use it to:

- Commit your built code with messages that reference the corresponding commit of the main project.
- Version multiple branches of built code.
- Push built code branches to a remote, for example the Github pages branch of your main project repository or Heroku.

### Options

#### dir

Type: `String`  
Default: *Required*  

The directory that contains your built code.

#### branch

Type: `String`  
Default: *Required*  

The branch to commit to.

#### remote

Type: `String`  
Default: *Required*  

The remote to push to. Common examples include a distribution repository (Heroku or Scalr), your main project's remote (gh-pages branch on Github), or the local project repository itself (`../`).

#### commit

Type: `Boolean`  
Default: `false`  

Commits built code to `branch`. A new commit is only created if the built code has changed.

<!-- #### tag -->

#### push

Type: `Boolean`  
Default: `false`  

Pushes the `branch` to `remote`.

<!-- #### force

Type: `Boolean`  
Default: `false`  

Force push to the remote repository. Not recommended but here if you need it. -->

#### commitMsg

Type: `String`  
Default: `Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%  `

The commit message to use when `commit` is true. It must be a safe commit message for the command line, with special characters and double quotes escaped.

You can use the following tokens to print information about the main project:

- `%sourceName%`: The main project's name taken from package.json
- `%sourceBranch%`: The main project's current branch
- `%sourceCommit%`: The main project's most recent commit

### Usage

A common use of grunt-version-build is to commit and push built code to the Github pages branch of the main repository, or to the master branch of a git-based deployment server like Heroku. 

```js
// Project configuration.
grunt.initConfig({
  
  // Various Grunt tasks...

  version_build: {
    options: {
      dir: 'dist',
      commit: true,
      push: true,
      message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%'
    },
    gh_pages: {
      options: {
        remote: 'git@github.com:example_user/example_webapp.git',
        branch: 'gh-pages'
      }
    },
    heroku: {
      options: {
        remote: 'git@heroku.com:example-heroku-webapp-1988.git',
        branch: 'master'
      }
    }
  }
});

grunt.registerTask('build', [
  // Collection of tasks that build code to the 'dist' directory...
]);
```

In the above example a user is working on a Yeoman-based web app, with source code hosted at `git@github.com:example_user/example_webapp.git`. When they're ready to deploy they first run `grunt build` to build a minified, optimized version of their app into the 'dist' directory. 

Running `grunt version_build:gh_pages` will commit the built code to the gh-pages branch of the 'dist/.git' repository and push to the gh-pages branch `git@github.com:example_user/example_webapp.git`. 

Running `grunt version_build:heroku` will commit the built code to the master branch of the 'dist/.git' repository and push to the master branch of `git@heroku.com:example-heroku-webapp-1988.git`.

#### Usage notes

Don't check out built code branches while in the main project directory.

`version_build` is a synchronous task, and fetches commits from your remote before committing or pushing. Depending on the location of your remote, the size of commits, and network speed it can be a long running task.

You should run `version_build` manually or after all other tasks in your build process.

If a git conflict occurs, manually resolve it inside the built code directory.

`version_build` won't erase history, and will add commits on top of the history of the remote branch if available. This makes it easy to start and stop using `version_build` at any time.

<!-- 
## Todo:

- replace as many porcelain commands as possible with plumbing.
- describe or list similar projects with limitations?  
  https://npmjs.org/package/grunt-github-pages  
  https://npmjs.org/package/grunt-git-dist  
  https://npmjs.org/package/grunt-git-selective-deploy  

-->
 
## Contribute

Post bugs and feature requests to the [Github issue tracker](https://github.com/robwierzbowski/grunt-version-build/issues). In lieu of a formal styleguide, take care to maintain the existing coding style. Lint and test your code using [Grunt](https://github.com/gruntjs/grunt).

## Release History

- 2013-10-X v0.0.0

## License

[MIT](http://en.wikipedia.org/wiki/MIT_License)

