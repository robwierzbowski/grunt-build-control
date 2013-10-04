/*
 * grunt-version-build
 * https://github.com/robwierzbowski/grunt-version-build
 *
 * Copyright (c) 2013 Rob Wierzbowski
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
  var fs = require('fs');
  var path = require('path');
  var shelljs = require('shelljs');


  grunt.registerMultiTask('version_build', 'Work with branches that version a single directory.', function() {

    var done = this.async();
    var options = this.options({
      commit: false,
      // tag: false,
      push: false,
      commitMsg: 'Built from %sourceName%, commit %sourceCommit% on branch %sourceBranch%',
      force: false
    });
    var sourceInfo = {};

    // Check requirements
    function checkRequirements (next) {
      // Check that required options are set.
      ['branch', 'dir', 'remote'].forEach( function (element) {
        if (!options.hasOwnProperty(element)) {
          throw('The "' + element + '" option is required.');
        }
      });

      // Check that the dist directory exists
      if(!shelljs.test('-d', options.dir)) {
        grunt.log.writeln('The target directory "' + options.dir + '" doesn\'t exist. Creating it.');

        if(shelljs.mkdir(options.dir)) {
          throw('Unable to create the target directory "' + options.dir + '".');
        }
      }
    }

    // Initialize git repo if one doesn't exist
    function initGit () {
      if(!shelljs.test('-d', path.join(options.dir, '.git'))) {
        grunt.log.writeln("Creating local git repo.");

        if(shelljs.exec('git init').code !== 0) {
          throw("Could not initialize the local git repo.");
        }
      }
    }

    // Create the portal branch if it doesn't exist
    function initBranch () {
      if(shelljs.exec('git show-ref --verify --quiet refs/heads/' + options.branch).code === 0) {
        return;
      }

      if(shelljs.exec('git checkout --orphan ' + options.branch).code !== 0) {
        throw("Could not create branch.");
      }

      grunt.log.writeln('Checking to see if the branch exists remotely...');

      if(shelljs.exec('git ls-remote --exit-code ' + options.remote + ' ' + options.branch).code === 0) {
        grunt.log.writeln('Remote branch exists.');
        return;
      }

      grunt.log.writeln('Remote branch does not exist. Adding an initial commit.');
      if(shelljs.exec('git commit --allow-empty -m "Initial Commit."').code !== 0) {
        throw('Could not create an initial commit.');
      }

      if(shelljs.exec('git push --set-upstream ' + options.remote + ' HEAD:' + options.branch).code !== 0) {
        throw('Could not push initial branch.');
      }
    }

    // Make the current working tree the branch HEAD without checking out files
    function safeCheckout () {
      grunt.log.writeln('Pulling latest from remote.');

      if(shelljs.exec('git pull ' + options.remote + ' ' + options.branch).code !== 0) {
        throw('Could not pull local branch.');
      }
    }

    // Stage and commit to a branch
    function gitCommit () {
    // TODO: Pull/fetch before each commit
      var commitMsg;

      // Unstage any changes, just in case
      if(shelljs.exec('git reset').code !== 0) {
        grunt.log.writeln('Could not unstage local changes.');
      }

      // Make sure there are differneces to commit
      var status = shelljs.exec('git status --porcelain');

      if(status.code !== 0) {
        throw('Could not execute git status.');
      }

      if (status.output === '') {
        // No changes, skip commit
        grunt.log.writeln('There have been no changes, skipping commit.'); //// reword
        return;
      }

      // Parse tokens in commit message
      commitMsg = options.commitMsg
        .replace(/%sourceCommit%/g, sourceInfo.commit)
        .replace(/%sourceBranch%/g, sourceInfo.branch);

      // Stage and commit
      if(shelljs.exec('git add -A . && git commit -m "' + commitMsg + '"').code !== 0) {
        throw('Unable to commit changes locally.');
      }

      grunt.log.writeln('Committed changes to branch "' + options.branch + '".');
    }

    // Push portal branch to the remote
    function gitPush () {
      var args = '';

      // TODO: Implement force push
      if(shelljs.exec('git push ' + args + options.remote + ' HEAD:' + options.branch).code !== 0) {
        throw('Unable to push changes to remote.');
      }

      // TODO: Give good error messages:
      // - if push doesn't work because of network ?
      // - if push doesn't work because of repo - fix yo shit

      grunt.log.writeln('Pushed ' + options.branch + ' to ' + options.remote);
    }

    var currentDir = shelljs.pwd();

    try {

      checkRequirements();

      // Change working directory
      shelljs.cd(options.dir);

      initGit();
      initBranch();
      safeCheckout();

      if (options.commit === false && options.push === false) {
        done(true);
        return;
      }

      gitCommit();

      if (options.push === false) {
        done(true);
        return;
      }

      gitPush();

      done(true);
    }
    catch (e) {
      grunt.fail.warn(e);
      done(false);
    }
    finally {
      shelljs.cd(currentDir);
    }
  });
};
