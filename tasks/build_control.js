/*
 * grunt-build-control
 * https://github.com/robwierzbowski/grunt-build-control
 *
 * Copyright (c) 2013 Rob Wierzbowski
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
  var fs = require('fs');
  var path = require('path');
  var crypto = require('crypto');
  var shelljs = require('shelljs');

  grunt.registerMultiTask('buildcontrol', 'Version control built code.', function() {

    var done = this.async();
    var gruntDir = shelljs.pwd();
    var remoteName = null;

    var options = this.options({
      branch: 'dist',
      dir: 'dist',
      remote: '../',
      commit: false,
      // tag: false,
      push: false,
      message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%',
      connectCommits: true
    });

    var tokens = {
      branch: '(unavailable)',
      commit: '(unavailable)',
      name:   '(unavailable)'
    };

    // Wraps shellJs calls that act on the file structure to give better Grunt
    // output and error handling
    // Args:
    // - command: the shell command
    // - verbose: show output on the cli, defaults to true
    function execWrap(command, verbose) {
      var shellResult = shelljs.exec(command, {silent: true});
      verbose = typeof verbose === 'undefined' ? true : verbose;

      if (shellResult.code === 0) {
        if (verbose) {
          grunt.log.write(shellResult.output);
        }
      }
      else {
        throw shellResult.output;
      }
    }

    // Check requirements
    function checkRequirements () {
      // Check that the build directory exists
      if (!fs.existsSync(options.dir)) {
        throw('Build directory "' + options.dir + '" doesn\'t exist. Nothing to version.');
      }

      // If connectCommits is true check that the main project's working
      // directory is clean
      if (options.connectCommits && shelljs.exec('git diff', {silent: true}).output !== '') {
        throw ('There are uncommitted changes in your working directory. \n' +
          'Please commit changes to the main project before you commit to \n' +
          'the built code.\n');
      }
    }

    // Assign %token% values if available
    function assignTokens () {
      var sourceBranch = shelljs.exec('git symbolic-ref --quiet HEAD', {silent: true});
      var sourceCommit = shelljs.exec('git rev-parse --short HEAD', {silent: true});

      if (sourceBranch.code === 0) {
        tokens.branch = sourceBranch.output.split('/').pop().replace(/\n/g, '');
      }
      if (sourceCommit.code === 0) {
        tokens.commit = sourceCommit.output.replace(/\n/g, '');
      }
      if (shelljs.test('-f', 'package.json', {silent: true})) {
        tokens.name = JSON.parse(fs.readFileSync('package.json', 'utf8')).name;
      }
      else {
        tokens.name = process.cwd().split('/').pop();
      }
    }

    // Initialize git repo if one doesn't exist
    function initGit () {
      if (!fs.existsSync(path.join(gruntDir, options.dir, '.git'))) {
        grunt.log.subhead('Creating git repository in ' + options.dir + '.');

        execWrap('git init');
      }
    }

    // Create a named remote if one doesn't exist
    function initRemote () {
      remoteName = "remote-" + crypto.createHash('md5').update(options.remote).digest('hex').substring(0, 6);

      // Alternative: query by git config
      // if (shelljs.exec('git config remote.' + remoteName + '.url').output !== '') {
      if (shelljs.exec('git remote', {silent: true}).output.indexOf(remoteName) === -1) {
        grunt.log.subhead('Creating remote.');

        execWrap('git remote add ' + remoteName + ' ' + options.remote);
      }
    }

    // Create branch if it doesn't exist
    function initBranch () {
      // If branch exists
      if (shelljs.exec('git show-ref --verify --quiet refs/heads/' + options.branch, {silent: true}).code === 0) {

        // If it's not tracking the remote
        if (shelljs.exec('git config branch.' + options.branch + '.remote', {silent: true}).output.replace(/\n/g, '') !== remoteName) {

          // If remote doesn't exist
          if (shelljs.exec('git ls-remote --exit-code ' + remoteName + ' ' + options.branch, {silent: true}).code !== 0) {
            gitPush();
          }

          gitTrack();
        }
        return;
      }
      // If branch doesn't exist locally but exists on remote
      else if (shelljs.exec('git ls-remote --exit-code ' + remoteName + ' ' + options.branch, {silent: true}).code === 0) {

        // Create tracking local branch
        execWrap('git branch --track ' + options.branch  + ' ' + remoteName + '/' + options.branch);
        return;
      }
      // If branch doesn't exist anywhere
      else {
        grunt.log.subhead('Creating branch "' + options.branch + '".');

        // Create local branch
        execWrap('git checkout --orphan ' + options.branch);

        // Initialize branch so we can move the HEAD ref around
        execWrap('git commit --allow-empty -m "Initial commit."');

        // Push and track upstream branch
        gitPush();
        gitTrack();
      }
    }

    // Check if local branch should safeUpdate
    // Requires fetched local refs
    function shouldUpdate() {
      var status = shelljs.exec('git status -sb --porcelain', {silent: true});
      var ahead = false;
      var behind = false;

      if (status.code === 0) {
        ahead = status.output.indexOf('ahead') === -1 ? false : true;
        behind = status.output.indexOf('behind') === -1 ? false : true;

        if (ahead && behind) {
          throw('The remote and local branches have diverged. Please \n' +
            'resolve manually before attempting again.');
        }
        else if (ahead) {
          return false;
        }
        else if (behind) {
          return true;
        }
      }
    }

    // Fetch remote refs to a specific branch, equivalent to a pull without
    // checkout
    function safeUpdate () {
      grunt.log.subhead('Fetching ' + options.branch + ' history from ' + options.remote + '.');

      // `--update-head-ok` allows fetch on the current branch
      execWrap('git fetch --verbose --update-head-ok ' + remoteName + ' ' + options.branch + ':' + options.branch);
    }

    // Make the current working tree the branch HEAD without checking out files
    function safeCheckout () {
      execWrap('git symbolic-ref HEAD refs/heads/' + options.branch);
    }

    // Make sure the stage is clean
    function gitReset () {
      execWrap('git reset', false);
    }

    // Fetch remote refs
    function gitFetch () {
      execWrap('git fetch ' + remoteName, false);
    }

    // Set branch to track remote
    function gitTrack () {
      execWrap('git branch --set-upstream-to=' + remoteName + '/' + options.branch + ' ' + options.branch);
    }

    // Stage and commit to a branch
    function gitCommit () {
      var message = options.message
        .replace(/%sourceName%/g, tokens.name)
        .replace(/%sourceCommit%/g, tokens.commit)
        .replace(/%sourceBranch%/g, tokens.branch);

      // If there are no changes, skip commit
      if (shelljs.exec('git status --porcelain', {silent: true}).output === '') {
        grunt.log.subhead('No changes to your branch. Skipping commit.');
        return;
      }

      // Stage and commit
      grunt.log.subhead('Committing changes to ' + options.branch + '.');
      execWrap('git add -A .');
      execWrap('git commit -m "' + message + '"');
    }

    // TODO: Implement tag option
    // Pronounced "gihttag"
    // function gitTag () {
    // }

    // Push branch to remote
    function gitPush () {
      grunt.log.subhead('Pushing ' + options.branch + ' to ' + options.remote);
      execWrap('git push ' + remoteName + ' ' + options.branch);
    }

    // Run task
    try {

      // Preperatory tasks
      checkRequirements();
      assignTokens();

      // Change working directory
      shelljs.cd(options.dir);

      // Git setup
      initGit();
      initRemote();

      // Tasks for pushing and committing
      gitFetch();
      initBranch();

      if (shouldUpdate()) {
        safeUpdate();
      }

      safeCheckout();
      gitReset();

      if (options.commit) {
        gitCommit();
      }

      // if (options.tag) {
      //   gitCommit();
      // }

      if (options.push) {
        gitPush();
      }
    }
    catch (e) {
      grunt.fail.warn(e);
      done(false);
    }
    finally {
      // Revert working directory
      shelljs.cd(gruntDir);
      done(true);
    }
  });
};
