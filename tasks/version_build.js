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
    var gruntDir = shelljs.pwd();

    var options = this.options({
      commit: false,
      // tag: false,
      push: false,
      commitMsg: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%',
      force: false
    });

    var tokens = {
      branch: '(unavailable)',
      commit: '(unavailable)',
      name:   '(unavailable)'
    };

    // Check requirements
    function checkRequirements () {
      // Check that required options are set.
      ['branch', 'dir', 'remote'].forEach( function (element) {
        if (!options.hasOwnProperty(element)) {
          throw('The "' + element + '" option is required.');
        }
      });

      // Check that the dist directory exists
      if (!fs.existsSync(options.dir)) {
        grunt.log.subhead('Creating target directory "' + options.dir + '".');
        shelljs.mkdir(options.dir);
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
      // TODO: Use containing directory name if package.json isn't available
      // else {
      //
      // }
    }

    // Initialize git repo if one doesn't exist
    function initGit () {
      if (!fs.existsSync(path.join(gruntDir, options.dir, '.git'))) {
        grunt.log.subhead('Creating git repository in ' + options.dir + '.');
        shelljs.exec('git init');
      }
    }

    // Fetch remote refs
    function gitFetch () {
      grunt.log.subhead('Fetching ' + options.branch + ' history from ' + options.remote + '.');

      // `--update-head-ok` allows fetch on the current branch
      shelljs.exec('git fetch --tags --verbose --update-head-ok ' + options.remote + ' ' + options.branch + ':' + options.branch);
    }

    // Create branch if it doesn't exist
    function initBranch () {

      // If branch exists, all is good
      if (shelljs.exec('git show-ref --verify --quiet refs/heads/' + options.branch, {silent: true}).code === 0) {
        return;
      }
      // If branch exists on remote, fetch it
      else if (shelljs.exec('git ls-remote --exit-code ' + options.remote + ' ' + options.branch, {silent: true}).code === 0) {

        gitFetch();
        return;
      }
      // If branch doesn't exist anywhere, create it
      else {

        grunt.log.subhead('Creating branch "' + options.branch + '".');

        shelljs.exec('git checkout --orphan ' + options.branch);
        shelljs.exec('git reset', {silent: true});

        // Initialize branch so we can move the HEAD ref around
        shelljs.exec('git commit --allow-empty -m "Initial commit"');
      }
    }

    // Make the current working tree the branch HEAD without checking out files
    function safeCheckout () {
      shelljs.exec('git symbolic-ref HEAD refs/heads/' + options.branch);
    }

    // Stage and commit to a branch
    function gitCommit () {
      var commitMsg = options.commitMsg
        .replace(/%sourceName%/g, tokens.name)
        .replace(/%sourceCommit%/g, tokens.commit)
        .replace(/%sourceBranch%/g, tokens.branch);

      // Unstage any changes, just in case
      shelljs.exec('git reset', {silent: true});

      // If there are no changes, skip commit
      if (shelljs.exec('git status --porcelain', {silent: true}).output === '') {
        grunt.log.subhead('No changes to your branch. Skipping commit.');
        return;
      }

      // Stage and commit
      grunt.log.subhead('Committing changes to ' + options.branch + '.');
      shelljs.exec('git add -A . && git commit -m "' + commitMsg + '"');
    }

    // TODO: Implement tag option
    // Pronounced "gihttag"
    // function gitTag () {
    // }

    // Push branch to remote
    function gitPush () {
      var args = '--tags ';

      if (options.force) {
        args += '-f ';
      }

      grunt.log.subhead('Pushing ' + options.branch + ' to ' + options.remote);
      shelljs.exec('git push ' + args + options.remote + ' HEAD:' + options.branch);
    }

    // Run task
    try {
      checkRequirements();
      assignTokens();

      // Change working directory
      shelljs.cd(options.dir);

      initGit();
      initBranch();
      safeCheckout();

      // Fetch changes from remote branch if it exists
      // TODO: Instead of checking if the remote exists, it would be better to
      // - check if remote is ahead of local
      // - check if remote is a ff merge
      // and if so, gitFetch(). Otherwise throw helpful, descriptive errors
      // Possible references:
      // - http://stackoverflow.com/questions/3258243/git-check-if-pull-needed
      if (shelljs.exec('git ls-remote --exit-code ' + options.remote + ' ' + options.branch, {silent: true}).code === 0) {
        gitFetch();
      }

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
      shelljs.cd(gruntDir);
      done(true);
    }
  });
};
