# grunt-version-build

> Create and manage 'portal' branches that contain only subdirectories of your main branch. Useful for publishing built code to Github Pages.

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

### Setting up .gitignore

<!-- // one time setup
Must manually add dist dir to app gitignore.
If desired, must manually create new gitignore in app, to be copied to dist.
 -->

## version_build task

_Run this task with the `grunt version_build` command._

This task helps you version and deploy your project's built code alongside your project's source code. 

The grunt task can commit, generates automated commit messages, and push the branches containing built code to your source code repo or to a remote repositiory for deployment.

<!-- - This is not a general node git tool. Use grunt-git-xxxwhatever for that
- Preserves commit history in non-local branch
- Works with clean and build task, or as part of build task. 
- can be the same dir for multiple portal branches
- works with existing branches, won't overwrite previous cm history 
 -->

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

The remote to push your branch to. This can be any repository, including your source code repository.

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

TyType: `String`
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

<!-- ## Similar projects with limitations

https://npmjs.org/package/grunt-github-pages
https://npmjs.org/package/grunt-git-dist
https://npmjs.org/package/grunt-git-selective-deploy
 -->
