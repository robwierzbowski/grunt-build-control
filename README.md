# grunt-build-control

> Version control built code.

### HELP WRITE TESTS FOR THIS TASK

For continued development, this library needs test coverage. If you like writing tests and like this Grunt task, please take a look at [issue #19](https://github.com/robwierzbowski/grunt-build-control/issues/19) and consider helping with a pull request. Any assistance is appreciated.

## Getting started

This plugin requires [Grunt](http://gruntjs.com/) `~0.4.0` and [Git](http://git-scm.com/) `> 1.8`.

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide which explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with Grunt you can install the plugin with the command:

```shell
npm install grunt-build-control --save-dev
```

After the plugin has been installed, load it in your Gruntfile with:

```js
grunt.loadNpmTasks('grunt-build-control');
```

## buildcontrol task

_Run this task with the `grunt buildcontrol` command._

Automate version control tasks for your project's built code. 

Keep built code in sync with source code, maintain multiple branches of built code, commit with automatic messages, and push to remote repositories.

### Setup

Your project must have a compile or build process that outputs code to a subdirectory of the main project.

Add the build directory to the main project's .gitignore, and make sure the build process doesn't delete .git directories inside the build directory. If you're using a [Yeoman](http://yeoman.io) generator these steps are taken care of for you already.

### Options

#### dir

Type: `String`  
Default: `dist`  

The directory that contains your built code.

#### branch

Type: `String`  
Default: `dist`  

The branch to commit to.

#### remote

Type: `String`  
Default: `../`  

The remote to push to. Common examples include a distribution repository (Heroku or Scalr), your main project's remote (gh-pages branch on Github), or the local project repository itself (`../`).

#### commit

Type: `Boolean`  
Default: `false`  

Commits built code to `branch`. A new commit is only created if the built code has changed.

#### tag

Type: `Boolean` or `String`  
Default: `false`  

If set to a string, adds its value as a lightweight git tag to the local built repo. Try loading your project's package.json as a variable and tagging with `pkg.version`.

#### push

Type: `Boolean`  
Default: `false`  

Pushes `branch` to `remote`. If `tag` is set, pushes the specified tag as well.

#### message

Type: `String`  
Default: `Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%  `

The commit message to use when committing. It must be a safe commit message for the command line, with special characters and double quotes escaped.

You can use the following tokens to print information about the main project:

- `%sourceName%`: The main project's name, read from package.json or the project directory
- `%sourceBranch%`: The main project's current branch
- `%sourceCommit%`: The main project's most recent commit

#### connectCommits

Type: `Boolean`  
Default: `true`  

Make sure that every commit on the built code branch matches a commit on the main project branch. If the main project's working directory has uncommitted changes, a commit task will throw an error.

### Usage

A common use of grunt-build-control is to commit and push built code to the GitHub pages branch of the main repository, or to the master branch of a git-based deployment server like Heroku. 

```js
// Project configuration.
var pkg = require('./package.json');

grunt.initConfig({

  // Various Grunt tasks...

  buildcontrol: {
    options: {
      dir: 'dist',
      commit: true,
      push: true,
      message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%'
    },
    pages: {
      options: {
        remote: 'git@github.com:example_user/example_webapp.git',
        branch: 'gh-pages'
      }
    },
    heroku: {
      options: {
        remote: 'git@heroku.com:example-heroku-webapp-1988.git',
        branch: 'master',
        tag: pkg.version
      }
    },
    local: {
      options: {
        remote: '../',
        branch: 'build'
      }
    }
  }
});

grunt.registerTask('build', [
  // Collection of tasks that build code to the 'dist' directory...
]);
```

In this example a user is working on a Yeoman-based web app, with their project's source code hosted at `git@github.com:example_user/example_webapp.git`. To deploy they first run `grunt build` to build a minified, optimized version of their app into the 'dist' directory. 

Running `grunt buildcontrol:pages` commits the built code to the gh-pages branch of the 'dist/.git' repository and pushes to the gh-pages branch of `git@github.com:example_user/example_webapp.git`. 

Running `grunt buildcontrol:heroku` will commit the built code to the master branch of the 'dist/.git' repository, tag the latest commit in 'dist/.git' with the value of `pkg.version` if the tag doesn't already exist, and push refs and tags to the master branch of `git@heroku.com:example-heroku-webapp-1988.git`.

Running `grunt buildcontrol:local` will commit the built code to the build branch of the 'dist/.git' repository and push to the build branch of the local source code repository. The local project repository can then be synced with a remote.

#### Working with .gitignores

You may wish to commit files or directories that are ignored globally or in the source repository (e.g., bower_compontents), or make file inclusion and exclusion the responsibility of the build process alone.

In order to scope gitignore rules to the build directory only, create a file named 'gitignore' in your source directory: 

```shell
# Unignore everything
!**/*

# Re-ignore things
...your ignore rules here
```

Then copy it to the build directory during your build process as '.gitignore'.

#### Notes

Grunt-build-control deploys to git endpoints. If you want to deploy to a private server [this tutorial by @curtisblackwell ](http://curtisblackwell.com/blog/my-deploy-method-brings-most-of-the-boys-to-the-yard) is a good place to start.

`buildcontrol` will add commits on top of the existing history of the remote branch if available.

`buildcontrol` is a synchronous task, and fetches from your remote before each commit or push. Depending on the location of your remote, the size of commits, and network speed it can be a long running task.

It's best to run `buildcontrol` manually after your build process or as the last step in a build and deploy task.

If a git conflict occurs (usually because another user has force-pushed to the deployment server) delete the built code directory and run build and build control again.

Don't check out built code branches while in the main project directory. Differences in untracked files will cause issues.

<!-- 
## Todo:

- replace as many porcelain commands as possible with plumbing.
- describe or list similar projects with limitations?  
  https://npmjs.org/package/grunt-github-pages  
  https://npmjs.org/package/grunt-git-dist  
  https://npmjs.org/package/grunt-git-selective-deploy  

-->
 
## Contribute

Post bugs and feature requests to the [Github issue tracker](https://github.com/robwierzbowski/grunt-build-control/issues). In lieu of a formal styleguide, take care to maintain the existing coding style. Lint and test your code using [Grunt](https://github.com/gruntjs/grunt).

## Release History

- 2013-11-29 v0.1.2: Add defaults for all properties.
- 2013-10-19 v0.1.1: Stable initial release.

## License

[MIT](http://en.wikipedia.org/wiki/MIT_License)



[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/robwierzbowski/grunt-build-control/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

