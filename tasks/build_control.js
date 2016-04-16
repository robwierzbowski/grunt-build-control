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
  var url = require('url');
  var semver = require('semver');

  grunt.registerMultiTask('buildcontrol', 'Version control built code.', function() {

    var done = this.async();
    var gruntDir = shelljs.pwd();
    var remoteName = null;

    var options = this.options({
      branch: 'dist',
      dir: 'dist',
      remote: '../',
      remoteBranch: '',
      login: '',
      token: '',
      commit: false,
      tag: false,
      push: false,
      force: false,
      message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%',
      connectCommits: true,
      fetchProgress: true,
      shallowFetch: false,
      config: {},

      // elastic beanstalk
      ebDeploy: false,
      ebEnvironmentName: '',
      ebOptions: {}
    });

    var tokens = {
      branch: '(unavailable)',
      commit: '(unavailable)',
      name:   '(unavailable)'
    };

    var depth = options.shallowFetch ? '--depth=1 ' : '';
    var progress = options.fetchProgress ? '--progress --verbose ' : '';
    var localBranchExists;
    var remoteBranchExists;

    // Build remote if sensitive information is passed in
    if (options.login && options.token) {
      var remote = url.parse(options.remote);

      options.remote = url.format({
        protocol: remote.protocol,
        auth: options.login + ':' + options.token,
        host: remote.host,
        pathname: remote.pathname
      });
    }


    function maskSensitive(str) {
      if (!options.token) return str;

      return str
        .replace(options.login + ':' + options.token, '<CREDENTIALS>', 'gm')
        .replace(options.token, '<TOKEN>', 'gmi');
    }

      var log = {};
      log.fail = {};
      log.subhead = function(msg) {grunt.log.subhead(maskSensitive(msg));};
      log.write = function(msg) {grunt.log.write(maskSensitive(msg));};
      log.fail.warn = function(msg) {grunt.fail.warn(maskSensitive(msg));};


      // Wraps shellJs calls that act on the file structure to give better Grunt
      // output and error handling
      // Args:
      // - command: the shell command
      // - verbose: show output on the cli after execution, defaults to true
      // - stream: stream the command, defaults to false
      function execWrap(command, verbose, stream) {
        verbose = typeof verbose === 'undefined' ? true : verbose;
        stream = typeof stream === 'undefined' ? false: stream;

        if (stream) {
          verbose = false;
        }

      if (options.login && options.token) {
        stream = false;
      }

      var shellResult = shelljs.exec(command, {silent: (!stream)});

      if (shellResult.code === 0) {
        if (verbose) {
          log.write(shellResult.output);
        }
      }
      else {
        throw maskSensitive(shellResult.output);
      }
    }

    // Check requirements
    function checkRequirements () {
      // Check if git version meets requirements
      var gitVersion = (shelljs.exec('git --version', {silent: true}).output.match(/\d+\.\d+\.\d+/) || []).shift();
      if (!gitVersion || semver.lt(gitVersion, '1.8.0')) {
        throw('Current Git version is ' + gitVersion + '. This plugin requires Git >= 1.8.0.');
      }

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
      if (options.connectCommits) {
        var gitDiffOutput = shelljs.exec('git diff').output;
        if (gitDiffOutput !== '') {
          throw ('There are uncommitted changes in your working directory. \n' +
          'Please commit changes to the main project before you commit to \n' +
          'the built code.\n');
        }
      }

      if (options.shallowFetch && semver.lt(gitVersion, '1.9.0')) {
        throw('Current Git version is ' + gitVersion + '. Option "shallowFetch" is supported on Git >= 1.9.0.');
      }
    }

    // Assign %token% values if available
    function assignTokens () {
      var sourceBranch = shelljs.exec('git rev-parse --abbrev-ref HEAD', {silent: true});
      var sourceCommit = shelljs.exec('git rev-parse --short HEAD', {silent: true});

      if (sourceBranch.code === 0) {
        tokens.branch = sourceBranch.output.replace(/\n/g, '');
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


    function verifyRepoBranchIsTracked() {
      // attempt to track a branch from origin
      // it may fail on times that the branch is already tracking another
      // remote. There is no problem when that happens, nor does it have any affect
      shelljs.exec('git branch --track ' + options.branch + ' origin/' + options.branch, {silent: true});
    }


    // Initialize git repo if one doesn't exist
    function initGit () {
      if (!fs.existsSync(path.join(gruntDir, options.dir, '.git'))) {
        log.subhead('Creating git repository in "' + options.dir + '".');

        execWrap('git init');
      }
    }


    // Initialize the git config
    function initConfig() {
      for (var key in options.config) {
        execWrap('git config "' + key + '" "' + options.config[key] + '"');
      }
    }


    // Create a named remote if one doesn't exist
    function initRemote () {
      remoteName = "remote-" + crypto.createHash('md5').update(options.remote).digest('hex').substring(0, 6);

      if (shelljs.exec('git remote', {silent: true}).output.indexOf(remoteName) === -1) {
        log.subhead('Creating remote.');
        execWrap('git remote add ' + remoteName + ' ' + options.remote);
      }
    }

    // Check if local branch can safely merge upstream (requires fetched refs)
    function shouldUpdate() {
      // Make sure you understand what this does.
      // With force, we're not even going to attempt to check out
      // We're just going to push the repo and override EVERYTHING in the remote
      if (options.force === true) return false;

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
    function gitFetch (dest) {
      var branch = (options.remoteBranch || options.branch) + (dest ? ':' + options.branch : '');
      log.subhead('Fetching "' + options.branch + '" ' + (options.shallowFetch ? 'files' : 'history') + ' from ' + options.remote + '.');

      // `--update-head-ok` allows fetch on a branch with uncommited changes
      execWrap('git fetch --update-head-ok ' + progress + depth + remoteName + ' ' + branch, false, true);
    }

    // Make the current working tree the branch HEAD without checking out files
    function safeCheckout () {
      execWrap('git symbolic-ref HEAD refs/heads/' + options.branch);
    }

    // Make sure the stage is clean
    function gitReset () {
      execWrap('git reset', false);
    }

    // Set branch to track remote
    function gitTrack () {
      var remoteBranch = options.remoteBranch || options.branch;
      if (shelljs.exec('git config branch.' + options.branch + '.remote', {silent: true}).output.replace(/\n/g, '') !== remoteName) {
        execWrap('git branch --set-upstream-to=' + remoteName + '/' + remoteBranch + ' ' + options.branch);
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
        log.subhead('No changes to your branch. Skipping commit.');
        return;
      }

      log.subhead('Committing changes to "' + options.branch + '".');
      execWrap('git add -A .');

      // generate commit message
      var commitFile = 'commitFile-' + crypto.createHash('md5').update(message).digest('hex').substring(0, 6);
      fs.writeFileSync(commitFile, message);

      execWrap('git commit --file=' + commitFile);

      fs.unlinkSync(commitFile);
    }

    // Tag local branch
    function gitTag () {
      // If the tag exists, skip tagging
      if (shelljs.exec('git ls-remote --tags --exit-code ' + remoteName + ' ' + options.tag, {silent: true}).code === 0) {
        log.subhead('The tag "' + options.tag + '" already exists on remote. Skipping tagging.');
        return;
      }

      log.subhead('Tagging the local repository with ' + options.tag);
      execWrap('git tag ' + options.tag);
    }

    // Push branch to remote
    function gitPush () {
      var branch = options.branch;
      var withForce = options.force ? ' --force ' : '';

      if (options.remoteBranch) branch += ':' + options.remoteBranch;

      log.subhead('Pushing ' + options.branch + ' to ' + options.remote + withForce);
      execWrap('git push ' + withForce + remoteName + ' ' + branch, false, true);

      if (options.tag) {
        execWrap('git push ' + remoteName + ' ' + options.tag);
      }
    }

    function ebExists() {
      log.subhead('Checking for an existing Elastic Beanstalk configs');

      var ebConfigFilePath = '.elasticbeanstalk/config.yml';

      var ebConfigExists = fs.existsSync(ebConfigFilePath);
      if (ebConfigExists) {
        log.subhead('Elastic Beanstalk config found');
      }
      else {
        throw('Elastic Beanstalk config not found at "' + ebConfigFilePath + '", running `eb config` might be required.');
      }

      return ebConfigExists;
    }

    function ebDeploy() {
      log.subhead('Deploying to Elastic Beanstalk');

      var ebOptionsString = '';
      for (var key in options.ebOptions) {
       ebOptionsString += ' ' + key + ' ' + options.ebOptions[key];
      }

      execWrap('eb deploy ' + config.ebEnvironmentName + ' ' + ebOptionsString);
    }

    // Run task
    try {

      // Prepare
      checkRequirements();
      assignTokens();
      if (options.remote === '../') verifyRepoBranchIsTracked();

      // Change working directory
      shelljs.cd(options.dir);

      // Set up repository
      initGit();
      initConfig();

      remoteName = options.remote;

      // Regex to test for remote url
      var remoteUrlRegex = new RegExp('[\/\\:]');
      if(remoteUrlRegex.test(remoteName)) {
        initRemote();
      }

      // Set up local branch
      localBranchExists = shelljs.exec('git show-ref --verify --quiet refs/heads/' + options.branch, {silent: true}).code === 0;
      remoteBranchExists = shelljs.exec('git ls-remote --exit-code ' + remoteName + ' ' + (options.remoteBranch || options.branch), {silent: true}).code === 0;

      if (remoteBranchExists) {
        gitFetch();
      }

      if (remoteBranchExists && localBranchExists) {
        // Make sure local is tracking remote
        gitTrack();

        // Update local branch history if necessary
        if (shouldUpdate()) {
          gitFetch(true);
        }
      }
      else if (remoteBranchExists && !localBranchExists) { //// TEST THIS ONE
        // Create local branch that tracks remote
        execWrap('git branch --track ' + options.branch + ' ' + remoteName + '/' + (options.remoteBranch || options.branch));
      }
      else if (!remoteBranchExists && !localBranchExists) {
        // Create local branch
        log.subhead('Creating branch "' + options.branch + '".');
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

      if (options.ebDeploy && ebExists()) {
        ebDeploy();
      }
    }
    catch (e) {
      log.fail.warn(e);
      done(false);
    }
    finally {
      // Revert working directory
      shelljs.cd(gruntDir);
      done(true);
    }
  });
};
