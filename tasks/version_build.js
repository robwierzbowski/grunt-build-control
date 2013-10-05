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

  grunt.registerMultiTask('version_build', 'Version built code next to your project\'s source.', function() {

    var done = this.async();
    var options = this.options({
      commit: false,
      // tag: false,
      push: false,
      commitMsg: 'Built from commit %sourceCommit% on branch %sourceBranch%',
      force: false
    });

    var sourceInfo = {
      branch: '(unavailable)',
      commit: '(unavailable)',
      name:   '(unavailable)'
    };

    var currentDir = shelljs.pwd();

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
        grunt.log.writeln('Creating target directory "' + options.dir + '".');

        if(shelljs.mkdir(options.dir)) {
          throw('Unable to create the target directory "' + options.dir + '".');
        }
      }
    }

    // Get source project information for %tokens%
    function buildSourceInfo () {
      var sourceBranch = shelljs.exec('git symbolic-ref --quiet HEAD');
      var sourceCommit = shelljs.exec('git rev-parse --short HEAD');

      if(sourceBranch.code === 0) {
        sourceInfo.branch = sourceBranch.output.split('/').pop().replace(/\n/g, '');
      }

      if (sourceCommit.code === 0) {
        sourceInfo.commit = sourceCommit.output.replace(/\n/g, '');
      }

      if (shelljs.test('-f', 'package.json')) {
        sourceInfo.name = JSON.parse(fs.readFileSync('package.json', 'utf8')).name;
      }
    }

    // Initialize git repo if one doesn't exist
    function initGit () {
      if(!shelljs.test('-d', path.join(options.dir, '.git'))) {
        grunt.log.writeln("Creating local git repo.");

        if(shelljs.exec('git init').code !== 0) {
          throw("Could not initialize the local git repo."); // TODO: show stderrs for easier debugging
        }
      }
    }

    // Create branch if it doesn't exist
    function initBranch () {

      // TODO: simplify this a bit
      // if branch does not exist
      //   if remote exists
      //     fetch remote
      //   else
      //     create branch
      //     create empty first commit
      // else
      //   return

      // If branch exists
      if(shelljs.exec('git show-ref --verify --quiet refs/heads/' + options.branch).code === 0) {
        return;
      }
      // If branch doesn't exist
      else {

        // Create branch if it doesn't exist
        if(shelljs.exec('git checkout --orphan ' + options.branch).code !== 0) {
          throw("Could not create branch."); // TODO: show stderrs for easier debugging
        }

        // Fetch remote branch if it exists
        grunt.log.writeln('Checking to see if the branch exists remotely...');

        // Check if remote branch exists
        if(shelljs.exec('git ls-remote --exit-code ' + options.remote + ' ' + options.branch).code === 0) {

          // TODO: fetch remote branch
          // grunt.log.writeln('Remote branch exists.');
          return;
        }

        // Initialize branch so we can move the HEAD ref around
        // TODO: get this workin

        //// Creating local branch with initial commit
        grunt.log.writeln('Remote branch does not exist. Adding an initial commit.');

        if(shelljs.exec('git commit --allow-empty -m "Initial Commit."').code !== 0) {
          throw('Could not create an initial commit.'); // TODO: show stderrs for easier debugging
        }

        // TODO: move push to push task, or do we need this?
        // if(shelljs.exec('git push --set-upstream ' + options.remote + ' HEAD:' + options.branch).code !== 0) {
        //   throw('Could not push initial branch.'); // TODO: show stderrs for easier debugging
        // }
      }
    }

    // Make the current working tree the branch HEAD without checking out files
    function safeCheckout () {

      // TODO: not sure why we're pulling in here
      // TODO: this should be safecheckout / move head ref
      grunt.log.writeln('Pulling latest from remote.');

      if(shelljs.exec('git pull ' + options.remote + ' ' + options.branch).code !== 0) {
        throw('Could not pull local branch.');
      }
    }

    // Stage and commit to a branch
    function gitCommit () {
      // TODO: Pull/fetch before each commit
      var commitMsg;
      var status = shelljs.exec('git status --porcelain');

      // Unstage any changes, just in case
      if(shelljs.exec('git reset').code !== 0) {
        grunt.log.writeln('Could not unstage local changes.');
      }

      // Make sure there are differneces to commit
      if(status.code !== 0) {
        throw('Could not execute git status.'); // TODO: show stderrs for easier debugging
      }

      if (status.output === '') {
        // No changes, skip commit
        grunt.log.writeln('There have been no changes, skipping commit.'); //// reword
        return;
      }

      // Parse tokens in commit message
      commitMsg = options.commitMsg
        .replace(/%sourceName%/g, sourceInfo.name)
        .replace(/%sourceCommit%/g, sourceInfo.commit)
        .replace(/%sourceBranch%/g, sourceInfo.branch);

      // Stage and commit
      if(shelljs.exec('git add -A . && git commit -m "' + commitMsg + '"').code !== 0) {
        throw('Unable to commit changes locally.'); // TODO: show stderrs for easier debugging
      }

      grunt.log.writeln('Committed changes to branch "' + options.branch + '".'); // TODO: show stdout for better reporting
    }

    // TODO: Impliment tag option
    // Pronounced "gihttag"
    // function gitTag () {
    // }

    // Push portal branch to the remote
    function gitPush () {
      var args = '';

      if (options.force) {
        args += '-f ';
      }

      if(shelljs.exec('git push ' + args + options.remote + ' HEAD:' + options.branch).code !== 0) {
        throw('Unable to push changes to remote.'); // TODO: show stderr for better debugging
      }

      grunt.log.writeln('Pushed ' + options.branch + ' to ' + options.remote); // TODO: show stdout for better reporting
    }

    // Run task
    try {

      checkRequirements();
      buildSourceInfo();

      // Change working directory
      shelljs.cd(options.dir);

      initGit();
      initBranch();
      safeCheckout(); // TODO: this will change when safeChk is redefined

      if (options.commit) {
        gitCommit();
      }

      // if (options.tag) {
      //   gitCommit();
      // }

      if (options.push) {
        gitPush();
      }

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
