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
      tag: false,
      push: false,
      message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%',
      connectCommits: true
    });

    var tokens = {
      branch: '(unavailable)',
      commit: '(unavailable)',
      name:   '(unavailable)'
    };

    var localBranchExists;
    var remoteBranchExists;

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
      // Check that build directory exists
      if (!fs.existsSync(options.dir)) {
        throw('Build directory "' + options.dir + '" doesn\'t exist. Nothing to version.');
      }

      // Check that build directory conteins files
      if (fs.readdirSync(options.dir).length === 0) {
        throw('Build directory "' + options.dir + '" is empty. Nothing to version.');
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

      if (shelljs.exec('git remote', {silent: true}).output.indexOf(remoteName) === -1) {
        grunt.log.subhead('Creating remote.');
        execWrap('git remote add ' + remoteName + ' ' + options.remote);
      }
    }

    // Check if local branch can safely merge upstream (requires fetched refs)
    function shouldUpdate() {
      var status = shelljs.exec('git status -sb --porcelain', {silent: true});
      var ahead = false;
      var behind = false;

      if (status.code === 0) {
        ahead = status.output.indexOf('ahead') === -1 ? false : true;
        behind = status.output.indexOf('behind') === -1 ? false : true;

        if (ahead && behind) {
          throw('The remote and local branches have diverged; please\n' +
            'resolve manually. Deleting the local **built code**\n' +
            '.git directory will usually fix things up.');
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

      // `--update-head-ok` allows fetch on a branch with uncommited changes
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
      if (shelljs.exec('git config branch.' + options.branch + '.remote', {silent: true}).output.replace(/\n/g, '') !== remoteName) {
        execWrap('git branch --set-upstream-to=' + remoteName + '/' + options.branch + ' ' + options.branch);
      }
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

      grunt.log.subhead('Committing changes to ' + options.branch + '.');
      execWrap('git add -A .');
      execWrap('git commit -m "' + message + '"');
    }

    // Tag local branch
    function gitTag () {
      // If the tag exists, skip tagging
      if (shelljs.exec('git rev-parse --revs-only ' + options.tag, {silent: true}).output !== '') {
        grunt.log.subhead('The tag "' + options.tag + '" already exists. Skipping tagging.');
        return;
      }

      grunt.log.subhead('Tagging the local repository with ' + options.tag);
      execWrap('git tag ' + options.tag);
    }

    // Push branch to remote
    function gitPush () {
      grunt.log.subhead('Pushing ' + options.branch + ' to ' + options.remote);
      execWrap('git push ' + remoteName + ' ' + options.branch);

      if (options.tag) {
        execWrap('git push ' + remoteName + ' ' + options.tag);
      }
    }

    // Run task
    try {

      // Prepare
      checkRequirements();
      assignTokens();

      // Change working directory
      shelljs.cd(options.dir);

      // Set up repository
      initGit();

      remoteName = options.remote;
      
      // Regex to test for remote url
      var remoteUrlRegex = new RegExp('.+[\\/:].+');
      if(remoteUrlRegex.test(remoteName)) {
        initRemote();
      }

      // Set up local branch
      localBranchExists = shelljs.exec('git show-ref --verify --quiet refs/heads/' + options.branch, {silent: true}).code === 0;
      remoteBranchExists = shelljs.exec('git ls-remote --exit-code ' + remoteName + ' ' + options.branch, {silent: true}).code === 0;

      if (remoteBranchExists) {
        gitFetch();
      }

      if (remoteBranchExists && localBranchExists) {
        // Make sure local is tracking remote
        gitTrack();

        // Update local branch history if necessary
        if (shouldUpdate()) {
          safeUpdate();
        }
      }
      else if (remoteBranchExists && !localBranchExists) { //// TEST THIS ONE
        // Create local branch that tracks remote
        execWrap('git branch --track ' + options.branch  + ' ' + remoteName + '/' + options.branch);
      }
      else if (!remoteBranchExists && !localBranchExists) {
        // Create local branch
        grunt.log.subhead('Creating branch "' + options.branch + '".');
        execWrap('git checkout --orphan ' + options.branch);
      }

      // Perform actions
      safeCheckout();
      gitReset();

      if (options.commit) {
        gitCommit();
      }

      if (options.tag) {
        gitTag();
      }

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
